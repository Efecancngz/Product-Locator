"""
Redis Service — High-performance caching layer with graceful fallback.
Replaces MongoDB/In-Memory caching for search results with sub-millisecond lookups.
"""
import json
import logging
import hashlib
from typing import Optional, Any

import redis.asyncio as aioredis

from src.config.settings import settings

logger = logging.getLogger(__name__)


class RedisService:
    """Async Redis client with automatic reconnection and graceful degradation."""

    def __init__(self):
        self._client: Optional[aioredis.Redis] = None
        self._is_connected: bool = False

    async def connect(self):
        """Establish connection to Redis server."""
        try:
            self._client = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=3,
                socket_timeout=3,
                retry_on_timeout=True,
            )
            # Verify connectivity
            await self._client.ping()
            self._is_connected = True
            logger.info("[RedisService] Connected to Redis successfully")
        except Exception as e:
            self._is_connected = False
            self._client = None
            logger.warning(f"[RedisService] Redis unavailable, falling back to MongoDB/In-Memory cache: {e}")

    async def disconnect(self):
        """Gracefully close Redis connection."""
        if self._client:
            await self._client.close()
            self._is_connected = False
            logger.info("[RedisService] Disconnected from Redis")

    @property
    def is_active(self) -> bool:
        return self._is_connected and self._client is not None

    @staticmethod
    def _cache_key(query: str, city: Optional[str], district: Optional[str]) -> str:
        """Generate a deterministic cache key from search parameters."""
        raw = f"search:{query.lower().strip()}:{(city or '').lower()}:{(district or '').lower()}"
        return f"pl:cache:{hashlib.md5(raw.encode()).hexdigest()}"

    async def get_cached_search(self, query: str, city: Optional[str] = None, district: Optional[str] = None) -> Optional[dict]:
        """Retrieve cached search result from Redis."""
        if not self.is_active:
            return None
        try:
            key = self._cache_key(query, city, district)
            data = await self._client.get(key)
            if data:
                logger.info(f"[RedisService] Cache HIT for key: {key[:20]}...")
                return json.loads(data)
            logger.debug(f"[RedisService] Cache MISS for key: {key[:20]}...")
            return None
        except Exception as e:
            logger.error(f"[RedisService] Cache read error: {e}")
            return None

    async def cache_search(self, query: str, city: Optional[str], district: Optional[str], data: dict, ttl: int = 1800) -> bool:
        """Store search result in Redis with TTL (default 30 minutes)."""
        if not self.is_active:
            return False
        try:
            key = self._cache_key(query, city, district)
            await self._client.setex(key, ttl, json.dumps(data, default=str))
            logger.info(f"[RedisService] Cached result for key: {key[:20]}... (TTL={ttl}s)")
            return True
        except Exception as e:
            logger.error(f"[RedisService] Cache write error: {e}")
            return False

    async def invalidate_pattern(self, pattern: str) -> int:
        """Delete all keys matching a pattern (e.g. 'pl:cache:*')."""
        if not self.is_active:
            return 0
        try:
            keys = []
            async for key in self._client.scan_iter(match=pattern):
                keys.append(key)
            if keys:
                await self._client.delete(*keys)
            logger.info(f"[RedisService] Invalidated {len(keys)} keys matching '{pattern}'")
            return len(keys)
        except Exception as e:
            logger.error(f"[RedisService] Cache invalidation error: {e}")
            return 0

    async def health_check(self) -> dict:
        """Return Redis health status and latency."""
        if not self.is_active:
            return {"status": "disconnected", "latency_ms": 0}
        try:
            import time
            start = time.time()
            await self._client.ping()
            latency = int((time.time() - start) * 1000)
            info = await self._client.info("memory")
            return {
                "status": "connected",
                "latency_ms": latency,
                "used_memory_mb": round(info.get("used_memory", 0) / 1024 / 1024, 2),
            }
        except Exception:
            return {"status": "error", "latency_ms": 0}


# Singleton instance
redis_service = RedisService()
