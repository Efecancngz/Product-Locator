from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.config.settings import settings
from src.routes import search, admin, watchlist, scheduler, export
import sys
import asyncio
import logging

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# API tag definitions for Swagger UI grouping
tags_metadata = [
    {
        "name": "search",
        "description": "Product search operations. Checks product stock status across "
                       "all configured retail stores based on query and location.",
    },
    {
        "name": "health",
        "description": "Server health status check.",
    },
    {
        "name": "admin",
        "description": "SaaS Admin Dashboard operations. Includes dynamic e-commerce retail store CRUD management, "
                       "live scraper simulators, system diagnostic telemetry pings, notification settings (Telegram, SMTP Email), "
                       "and manual physical branch product stock registry management with Pigeon-Map coordinate selections.",
    },
    {
        "name": "scheduler",
        "description": "Background scheduler operations. Manage automatic watchlist stock/price scan jobs, "
                       "configure cron or interval schedules, trigger manual scans, and view scan history.",
    },
    {
        "name": "export",
        "description": "Export operations. Generate and download Excel/PDF reports of search results, "
                       "store configurations, manual products, watchlist items, and scan history.",
    },
]

app = FastAPI(
    title="Product Locator API",
    version="0.1.0",
    description=(
        "## Product Locator Backend\n\n"
        "An asynchronous API that identifies physical store product stock availability in Turkey in real-time.\n\n"
        "### How It Works\n"
        "1. The user specifies a product search query and optional city/district location.\n"
        "2. The backend scrapes 25+ registered catalog websites concurrently using Playwright.\n"
        "3. Gemini AI parses and extracts structural product parameters from the raw pages.\n"
        "4. Output results are enriched with precise regional store coordinates and returned.\n\n"
        "### Supported Categories\n"
        "- 💻 Electronics (Teknosa, Vatan Bilgisayar, MediaMarkt...)\n"
        "- 🏠 Appliances (Arçelik, Beko, Bosch...)\n"
        "- 👗 Clothing (Flo, LC Waikiki, Koton...)\n"
        "- ⚽ Sports (Decathlon, Nike, Adidas...)\n"
        "- 💄 Cosmetics (Gratis, Watsons, Sephora...)\n"
    ),
    openapi_tags=tags_metadata,
    contact={
        "name": "Product Locator",
        "url": "https://github.com/your-repo/Product-Locator",
    },
    license_info={
        "name": "MIT",
    },
)

# Logging Setup
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("backend_debug.log", mode='w', encoding='utf-8')
    ]
)
logger = logging.getLogger("api")

# --- Security & Optimization Middlewares ---

from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from starlette.responses import Response
from src.config.limiter import limiter
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

# Documentation paths that must NOT receive restrictive CSP headers
_DOCS_PATHS = frozenset(["/docs", "/docs/", "/redoc", "/redoc/", "/openapi.json"])

# 1. Custom Security Headers Middleware (IEEE 829 QA Standard TC-SEC-001)
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        if settings.ENV == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # CSP: Skip entirely for Swagger/ReDoc documentation paths.
        # Swagger UI loads JS/CSS from cdn.jsdelivr.net which any CSP blocks.
        # For all other paths, apply a strict Content Security Policy.
        path = request.url.path
        if path not in _DOCS_PATHS:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: https:;"
            )
        return response

app.add_middleware(SecurityHeadersMiddleware)

# 2. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. SlowAPI Rate Limiter Configuration (TC-RAT-002)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(search.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(watchlist.router, prefix="/api/v1")
app.include_router(scheduler.router, prefix="/api/v1")
app.include_router(export.router, prefix="/api/v1")


@app.on_event("startup")
async def startup_db_client():
    from src.services.db_service import db_service
    from src.services.redis_service import redis_service
    from src.services.scheduler_service import scheduler_service
    await db_service.connect()
    await redis_service.connect()
    # Start background scheduler for automatic watchlist scans
    try:
        await scheduler_service.start()
    except Exception as e:
        logger.warning(f"Scheduler failed to start: {e}")


@app.on_event("shutdown")
async def shutdown_services():
    from src.services.scheduler_service import scheduler_service
    scheduler_service.stop()


@app.get("/", tags=["health"], summary="Server Health Check")
async def root():
    """
    Verifies that the server is online and running.

    Returned Fields:
    - **message**: Operational status message.
    - **mode**: The currently active environment (`dev` / `production`).
    - **version**: API release version.
    - **docs**: Relative path to active Swagger documentation.
    - **concurrency**: System multitasking state indicator.
    """
    return {
        "message": "Product Locator API is running",
        "mode": settings.ENV,
        "version": "0.1.0",
        "docs": "/docs",
        "concurrency": "AsyncIO + Playwright Enabled",
    }

if __name__ == "__main__":
    import uvicorn
    # CRITICAL: Playwright requires ProactorEventLoop on Windows.
    # Uvicorn with reload=True spawns processes that might default to SelectorEventLoop.
    # We disable reload to ensure stability.
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        
    print("--> Starting Server with Proactor Loop (No Reload) <--")
    # Port 8001 since 8000 is stuck
    uvicorn.run("app:app", host="0.0.0.0", port=8001, reload=False)

