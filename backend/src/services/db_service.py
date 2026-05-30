import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorClient
from src.config.settings import settings

logger = logging.getLogger(__name__)

class DatabaseService:
    """
    Dual-mode Database Service.
    Attempts to connect to MongoDB. If MongoDB is unavailable (not running or not installed),
    it seamlessly falls back to a thread-safe In-Memory Cache to allow local development
    to run without any database dependencies.
    
    Supports:
    1. Search caching (MongoDB TTL index or In-Memory fallback).
    2. Dynamic e-commerce stores management (MongoDB collections or memory-registry injection fallback).
    """
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None
        self.is_mongodb_active = False
        
        # In-Memory Cache Fallback
        # Key: "query:city:district" -> Value: {"result": dict, "created_at": datetime}
        self.memory_cache: Dict[str, Dict[str, Any]] = {}
        self.cache_ttl_seconds = 3600  # 1 hour
        
    async def connect(self):
        """Asynchronously connect to MongoDB with a quick timeout selection fallback."""
        if not settings.MONGO_URL:
            logger.warning("[DBService] MONGO_URL not set in settings. Using In-Memory Cache Fallback.")
            return
            
        try:
            # Set serverSelectionTimeoutMS=2000 so that if MongoDB is not running,
            # we don't hang startup for 30 seconds.
            self.client = AsyncIOMotorClient(
                settings.MONGO_URL,
                serverSelectionTimeoutMS=2000
            )
            self.db = self.client[settings.DB_NAME]
            
            # Verify the connection immediately
            await self.client.admin.command('ping')
            
            self.is_mongodb_active = True
            logger.info(f"[DBService] Connected successfully to MongoDB at {settings.MONGO_URL}")
            
            # Create a TTL index in MongoDB to automatically delete expired cache documents after 1 hour
            await self.db.search_cache.create_index("created_at", expireAfterSeconds=self.cache_ttl_seconds)
            logger.info(f"[DBService] MongoDB TTL Index (expireAfterSeconds={self.cache_ttl_seconds}) created on search_cache.")
            
            # Seed default stores into DB if empty
            await self.seed_default_stores()
            
            # Sync DB stores back to in-memory store_registry.STORE_CONFIGS
            await self.sync_db_stores_to_memory()
            
        except Exception as e:
            logger.warning(
                f"[DBService] Could not connect to MongoDB: {e}. "
                f"Falling back to thread-safe In-Memory Cache & Local Registry."
            )
            self.is_mongodb_active = False
            self.client = None
            self.db = None

    # ==========================================
    # SEARCH CACHE OPERATIONS
    # ==========================================

    async def get_cached_search(self, query: str, city: Optional[str] = None, district: Optional[str] = None) -> Optional[dict]:
        """
        Retrieve a cached search result if it exists and has not expired.
        """
        norm_query = query.strip().lower()
        norm_city = (city or "").strip().lower()
        norm_district = (district or "").strip().lower()
        
        cache_key = f"{norm_query}:{norm_city}:{norm_district}"
        
        # A. MongoDB Caching Mode
        if self.is_mongodb_active and self.db is not None:
            try:
                cached_doc = await self.db.search_cache.find_one({
                    "query": norm_query,
                    "city": norm_city,
                    "district": norm_district
                })
                if cached_doc:
                    logger.info(f"[DBService] Cache HIT (MongoDB) for query: '{query}' in {city or 'any'}/{district or 'any'}")
                    return cached_doc.get("result")
            except Exception as e:
                logger.error(f"[DBService] MongoDB cache read failed: {e}")
                
        # B. In-Memory Fallback Caching Mode
        else:
            cached_item = self.memory_cache.get(cache_key)
            if cached_item:
                created_at = cached_item["created_at"]
                elapsed = (datetime.now(timezone.utc) - created_at).total_seconds()
                if elapsed < self.cache_ttl_seconds:
                    logger.info(f"[DBService] Cache HIT (In-Memory) for query: '{query}' in {city or 'any'}/{district or 'any'}")
                    return cached_item["result"]
                else:
                    # Remove expired key
                    logger.debug(f"[DBService] In-Memory Cache expired for key: {cache_key}")
                    del self.memory_cache[cache_key]
                    
        return None

    async def cache_search(self, query: str, city: Optional[str], district: Optional[str], result: dict):
        """
        Store a search result in the active cache database.
        """
        norm_query = query.strip().lower()
        norm_city = (city or "").strip().lower()
        norm_district = (district or "").strip().lower()
        
        cache_key = f"{norm_query}:{norm_city}:{norm_district}"
        now = datetime.now(timezone.utc)
        
        # A. MongoDB Caching Mode
        if self.is_mongodb_active and self.db is not None:
            try:
                await self.db.search_cache.update_one(
                    {"query": norm_query, "city": norm_city, "district": norm_district},
                    {
                        "$set": {
                            "query": norm_query,
                            "city": norm_city,
                            "district": norm_district,
                            "result": result,
                            "created_at": now
                        }
                    },
                    upsert=True
                )
                logger.info(f"[DBService] Search result successfully cached in MongoDB for query: '{query}'")
            except Exception as e:
                logger.error(f"[DBService] MongoDB cache write failed: {e}")
                
        # B. In-Memory Fallback Caching Mode
        else:
            self.memory_cache[cache_key] = {
                "result": result,
                "created_at": now
            }
            logger.info(f"[DBService] Search result successfully cached in In-Memory for query: '{query}'")

    # ==========================================
    # DYNAMIC RETAIL STORES OPERATIONS (SaaS)
    # ==========================================

    async def seed_default_stores(self):
        """Seed the database with default store configurations from store_registry.py if empty."""
        if not self.is_mongodb_active or self.db is None:
            return
            
        try:
            count = await self.db.stores.count_documents({})
            if count == 0:
                logger.info("[DBService] Stores collection is empty. Seeding default stores...")
                from src.config.store_registry import STORE_CONFIGS
                
                seeded_count = 0
                for key, config in STORE_CONFIGS.items():
                    store_doc = {
                        "key": key,
                        "name": config.name,
                        "domain": config.domain,
                        "search_url_template": config.search_url_template,
                        "category": config.category.value,
                        "enabled": config.enabled,
                        "selectors": config.selectors
                    }
                    await self.db.stores.update_one(
                        {"key": key},
                        {"$set": store_doc},
                        upsert=True
                    )
                    seeded_count += 1
                logger.info(f"[DBService] Successfully seeded {seeded_count} default stores into MongoDB.")
        except Exception as e:
            logger.error(f"[DBService] Seeding default stores failed: {e}")

    async def sync_db_stores_to_memory(self):
        """Load all stores from MongoDB and sync them to store_registry.STORE_CONFIGS in memory."""
        if not self.is_mongodb_active or self.db is None:
            return
            
        try:
            cursor = self.db.stores.find({})
            db_stores = await cursor.to_list(length=100)
            if db_stores:
                from src.config.store_registry import STORE_CONFIGS, StoreConfig, StoreCategory
                
                # Clear and reconstruct STORE_CONFIGS to exactly reflect the DB
                STORE_CONFIGS.clear()
                
                for s in db_stores:
                    STORE_CONFIGS[s["key"]] = StoreConfig(
                        name=s["name"],
                        domain=s["domain"],
                        search_url_template=s["search_url_template"],
                        category=StoreCategory(s["category"]),
                        enabled=s.get("enabled", True),
                        selectors=s.get("selectors")
                    )
                logger.info(f"[DBService] Successfully synced {len(db_stores)} stores from MongoDB into active memory.")
        except Exception as e:
            logger.error(f"[DBService] Failed to sync DB stores to memory: {e}")

    async def get_stores(self) -> List[Dict[str, Any]]:
        """Retrieve all store configurations from MongoDB or Fallback static registry."""
        # A. MongoDB Mode
        if self.is_mongodb_active and self.db is not None:
            try:
                cursor = self.db.stores.find({})
                stores = await cursor.to_list(length=100)
                if stores:
                    # Clean MongoDB _id field for JSON serialization compatibility
                    for s in stores:
                        if "_id" in s:
                            s["_id"] = str(s["_id"])
                    return stores
            except Exception as e:
                logger.error(f"[DBService] Failed to load stores from MongoDB: {e}")
                
        # B. Fallback Mode (Static Configs)
        from src.config.store_registry import STORE_CONFIGS
        static_stores = []
        for key, config in STORE_CONFIGS.items():
            static_stores.append({
                "key": key,
                "name": config.name,
                "domain": config.domain,
                "search_url_template": config.search_url_template,
                "category": config.category.value,
                "enabled": config.enabled,
                "selectors": config.selectors
            })
        return static_stores

    async def get_store_by_key(self, key: str) -> Optional[Dict[str, Any]]:
        """Get a single store configuration by its key."""
        norm_key = key.strip().lower()
        if self.is_mongodb_active and self.db is not None:
            try:
                store = await self.db.stores.find_one({"key": norm_key})
                if store:
                    if "_id" in store:
                        store["_id"] = str(store["_id"])
                    return store
            except Exception as e:
                logger.error(f"[DBService] Failed to get store '{key}' from MongoDB: {e}")
                
        # Fallback to static registry
        from src.config.store_registry import STORE_CONFIGS
        config = STORE_CONFIGS.get(norm_key)
        if config:
            return {
                "key": norm_key,
                "name": config.name,
                "domain": config.domain,
                "search_url_template": config.search_url_template,
                "category": config.category.value,
                "enabled": config.enabled,
                "selectors": config.selectors
            }
        return None

    async def add_store(self, store_data: Dict[str, Any]) -> bool:
        """Add or update a store configuration dynamically."""
        norm_key = store_data["key"].strip().lower()
        store_data["key"] = norm_key
        
        # 1. Update memory registry immediately
        from src.config.store_registry import STORE_CONFIGS, StoreConfig, StoreCategory
        try:
            STORE_CONFIGS[norm_key] = StoreConfig(
                name=store_data["name"],
                domain=store_data["domain"],
                search_url_template=store_data["search_url_template"],
                category=StoreCategory(store_data["category"]),
                enabled=store_data.get("enabled", True),
                selectors=store_data.get("selectors")
            )
            logger.info(f"[DBService] Store '{norm_key}' updated in memory registry.")
        except Exception as e:
            logger.error(f"[DBService] Failed to update memory registry for '{norm_key}': {e}")
            return False
        
        # 2. Update MongoDB if active
        if self.is_mongodb_active and self.db is not None:
            try:
                await self.db.stores.update_one(
                    {"key": norm_key},
                    {"$set": store_data},
                    upsert=True
                )
                logger.info(f"[DBService] Store '{norm_key}' successfully saved in MongoDB.")
                return True
            except Exception as e:
                logger.error(f"[DBService] Failed to save store '{norm_key}' in MongoDB: {e}")
                return False
        return True

    async def delete_store(self, key: str) -> bool:
        """Delete a store configuration dynamically."""
        norm_key = key.strip().lower()
        
        # 1. Delete from memory registry immediately
        from src.config.store_registry import STORE_CONFIGS
        if norm_key in STORE_CONFIGS:
            del STORE_CONFIGS[norm_key]
            logger.info(f"[DBService] Deleted store '{norm_key}' from memory registry.")
            
        # 2. Delete from MongoDB if active
        if self.is_mongodb_active and self.db is not None:
            try:
                result = await self.db.stores.delete_one({"key": norm_key})
                logger.info(f"[DBService] Deleted store '{norm_key}' from MongoDB. Deleted count: {result.deleted_count}")
                return result.deleted_count > 0
            except Exception as e:
                logger.error(f"[DBService] Failed to delete store '{norm_key}' from MongoDB: {e}")
                return False
        return True

# Singleton
db_service = DatabaseService()
