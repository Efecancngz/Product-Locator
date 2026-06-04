# Product Locator — Backend Architecture

This documentation describes how the backend services operate, the flow of data between services, and extension pathways.

---

## Overview

```
HTTP Request
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI (app.py)                                           │
│  ├── CORS Middleware                                        │
│  └── Router: /api/v1/search  →  routes/search.py            │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  SearchService (services/search_service.py)                 │
│  ├── Calls SearchOrchestrator (180s timeout)                │
│  ├── Maps raw results to ProductStock model                 │
│  └── Coordinates coordinates enrichment via StoreService    │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  SearchOrchestrator (services/search_orchestrator.py)       │
│  ├── GenericSiteSearcher → Generate search URLs             │
│  └── For each URL:                                          │
│      ├── Playwright (headless Chromium)                     │
│      │   ├── Block heavy resources (img/css/font)           │
│      │   ├── Load page (45s timeout)                        │
│      │   └── Get HTML content                               │
│      ├── AIParser.parse_html()  ─── failure ──┐             │
│      └──────────────────────────────────────── ▼            │
│                                         FallbackParser      │
└─────────────────────────────────────────────────────────────┘
```

---

## Service Layers

### 1. Route Layer (`src/routes/`)

**Responsibility:** Receives HTTP requests, validates input parameters, and routes them to service layers or the database.

#### Search Route
```python
# GET /api/v1/search?q=iPhone+15&city=İzmir
async def search_products(q: str, city: str, district: str) -> SearchResult
```

#### Dynamic Stores & Admin CRUD Routes (`src/routes/admin.py`)
- **GET** `/api/v1/admin/stores` -> Lists all configured retail stores (from MongoDB or active fallback memory).
- **GET** `/api/v1/admin/stores/{key}` -> Retrieves details of a specific store.
- **POST** `/api/v1/admin/stores` -> Dynamically adds a new store configuration or no-code CSS selectors.
- **PATCH** `/api/v1/admin/stores/{key}/toggle` -> Instantly enables or disables a store in active search orchestrations.
- **PUT** `/api/v1/admin/stores/{key}` -> Updates details or CSS selectors for a specific store.
- **DELETE** `/api/v1/admin/stores/{key}` -> Permanently deletes a store from both system memory and database registry.

### 2. Service Layer (`src/services/`)

**Responsibility:** Business logic. Orchestrates search queries, raw scrapers, coordinates, and filters.

#### SearchService
- Converts raw extracted records to Pydantic domain models.
- Enriches matching products with city-based branch store coordinates.
- Replicates branching records (e.g. if a product is stocked in multiple regional stores).
- Applies city and district filtering.
- Limits the final response to a maximum of 30 records to preserve performance.

#### SearchOrchestrator
- Resolves search templates to query URLs.
- Manages Playwright browser instance lifecycles.
- Cascades parsing from the primary `AIParser` to the secondary `FallbackParser`.

### 4. Watchlist & Alert Pipeline (`src/routes/watchlist.py`)
- **CRUD Operations:** Handles adding, updating, and removing followed items for users, backed by MongoDB or a thread-safe in-memory registry.
- **Alert Scanner Pipeline (`/watchlist/check`):** Queries and tethers followed items using real-time search logic. Identifies changes like stock transitions (`OUT_OF_STOCK` to `IN_STOCK`) or price drops.
- **Multi-channel Notifications:** Dispatches email and Telegram notifications via `ReportSystem` Java microservice, and executes a webhook callback to a custom **Webhook URL** defined in settings.

### 5. Watchlist Scheduler (`src/services/scheduler_service.py` & `src/routes/scheduler.py`)
- **Background Automation:** Runs periodic checks on all watchlist items in the background via `apscheduler` inside FastAPI's async event loop.
- **Dual-Mode Triggers:** Supports interval-based execution (every N hours) and cron-based execution (at a specific UTC hour and minute, defaults to 03:00 UTC).
- **Scan Logging (`scan_history`):** Persists metadata of every scan run (start/end time, total items checked, alerts triggered, errors, and product-level alert updates) in MongoDB.
- **API Control:** Provides admin endpoints to start/stop the scheduler, reschedule runtime triggers, perform manual scans (`run-now`), and retrieve paginated scan logs.

### 6. Parser Layer

| Parser | Condition | Strategy |
|---|---|---|
| `AIParser` | Always attempted first | Gemini Flash 2.0 + tailored HTML parsing prompts |
| `FallbackParser` | Invoked if AI fails or returns empty | BeautifulSoup4 fallback via dynamic CSS selectors |

### 4. Configuration Layer (`src/config/`)

#### Settings (Pydantic-Settings)
Parses environmental configurations securely from the `.env` file or native OS environment.

#### StoreRegistry & SaaS Dynamic Registry (Dual-Mode Sync)
The system incorporates a highly responsive Dual-Mode Registry Sync architecture that bridges standard offline configurations (`src/config/store_registry.py`) and live MongoDB dynamic stores.
- **Boot Sync:** During service initialization, all MongoDB-managed retail stores are synchronized into active memory registry `STORE_CONFIGS`.
- **Write-Through Caching:** Edits performed via Admin API are instantly committed to both MongoDB and the active in-memory dictionary. Scrapers read configurations from the thread-safe memory registry, preventing database roundtrips during active crawls.

```python
@dataclass
class StoreConfig:
    name: str                           # e.g., "Teknosa"
    domain: str                         # e.g., "teknosa.com"
    search_url_template: str            # e.g., "https://teknosa.com/arama/?s={query}"
    category: StoreCategory             # ELECTRONICS, COSMETICS, etc.
    enabled: bool = True
    selectors: Optional[Dict[str, str]] = None  # CSS selectors for no-code parsing
```

---

## Data Models

```
SearchResult
├── query: str
├── total_found: int
└── found_products: List[ProductStock]
                         ├── product_name: str
                         ├── price: Optional[float]
                         ├── currency: str  (TRY)
                         ├── stock_status: StockStatus
                         ├── source_url: str
                         ├── last_updated: datetime
                         └── store_location: StoreLocation
                                   ├── store_name: str
                                   ├── city: str
                                   ├── district: Optional[str]
                                   ├── branch: Optional[str]
                                   ├── address: Optional[str]
                                   ├── latitude: Optional[float]
                                   └── longitude: Optional[float]
```

#### Watchlist Model (WatchlistItemResponse)
```
WatchlistItemResponse
├── id: str
├── user_id: str
├── product_name: str
├── category: str
├── city: str
├── district: Optional[str]
├── store_name: str
├── branch: Optional[str]
├── price: Optional[float]
├── currency: str
├── source_url: str
├── notifications_enabled: bool
├── last_stock_status: str
├── last_price: Optional[float]
├── created_at: datetime
└── updated_at: datetime
```

---

## AI Parser Flow

```
HTML (truncated to 30K chars) + URL
                 │
                 ▼
          Gemini Flash 2.0
                 │
          Prompt: JSON product extraction instructions
          Expected: JSON { "products": [...] }
                 │
                 ▼
            JSON Parsing
                 │
                 ├── Success → Returns List[Dict]
                 └── Failure (JSONDecodeError / Exception) → Returns []
                             │
                             ▼
                    BeautifulSoup Fallback
```

**Gemini Prompt Strategy:**
- Emphasizes preserving Turkish characters in parsed text.
- Enforces a maximum limit of 5 products extracted per page to avoid noise.
- Explicitly differentiates search query results from unrelated catalog categories.
- infers the host brand from the query URL if page-level metadata is missing.

---

## Universal Agent (`src/universal_agent/`)

General-purpose package engineered for direct retailer query scraping.

### search_engine.py — GenericSiteSearcher

Generates direct keyword search URLs according to configurations defined in the `StoreRegistry`. Operates fully independently of Google/Bing search API reliance.

```python
searcher = GenericSiteSearcher()
results = await searcher.search("iPhone 15 Pro", limit=5)
# → [{"url": "https://teknosa.com/arama/?s=iPhone+15+Pro", ...}, ...]
```

### page_parser.py

Extracts pure structural text content and visible text elements from Chromium DOM trees using Playwright. Drops irrelevant `script`, `style`, and `svg` markup to minimize LLM token usage.

---

## Extension: Adding a New Store

New retail stores can be registered using two distinct strategies:

### Strategy A: Dynamic & No-Code SaaS API (Recommended)
You can dynamically register a new store with custom selectors without restarting or modifying any source code using `/api/v1/admin/stores` endpoints:
```json
POST /api/v1/admin/stores
{
  "key": "new_store",
  "name": "New Retail Store",
  "domain": "newstore.com.tr",
  "search_url_template": "https://www.newstore.com.tr/search?q={query}",
  "category": "electronics",
  "enabled": true,
  "selectors": {
    "product_container": ".product-item",
    "product_name": ".title",
    "product_price": ".price"
  }
}
```

### Strategy B: Static Code-Level Configuration
1. **Append to StoreRegistry** (`src/config/store_registry.py`):
```python
"new_store": StoreConfig(
    name="New Retail Store",
    domain="newstore.com.tr",
    search_url_template="https://www.newstore.com.tr/search?q={query}",
    category=StoreCategory.ELECTRONICS,
),
```

2. **Add Coordinates Mapping** (`src/services/store_service.py`).

3. **Optional: Create Custom Parser Override** (`src/scraper/stores/`):
```python
class NewStoreScraper(BaseScraper):
    def parse(self, html: str) -> List[Dict]: ...
```

---

## Performance Metrics

| Operation | Duration | Notes |
|---|---|---|
| Playwright Spawn | ~2s | Reinitialized per search pipeline |
| Page Fetching | 5-15s | Varies based on site loading speed and assets |
| Gemini API Call | 2-8s | Dependent on page size and token volume |
| Total (5 Scrapes) | 30-120s | Sequentially executed |

---

## Error Handling

```
SearchService
├── asyncio.TimeoutError (180s)  → Returns Empty SearchResult
└── Exception                    → Returns Empty SearchResult

SearchOrchestrator (For each URL)
├── Scraper / Browser Error      → Skips URL, continues pipeline
├── AI Parsing Error             → Automatically invokes FallbackParser
└── FallbackParser Failure       → Returns [], skips URL

AIParser
├── json.JSONDecodeError         → Returns [] (error is logged)
└── Exception                    → Returns [] (error is logged)
```

---

## Logging Format

```
2026-05-30 00:47:23 - api - INFO - [SearchService] Searching for: iPhone 15 (city=İzmir)
2026-05-30 00:47:24 - api - INFO - [Orchestrator] Starting search for: iPhone 15
2026-05-30 00:47:26 - api - INFO - [Orchestrator] Found 5 URLs to scrape
2026-05-30 00:47:31 - api - INFO - AI Parser extracted 3 products from https://teknosa.com/...
2026-05-30 00:47:45 - api - INFO - [SearchService] Returning 12 products (from 3 unique branches)
```

Debug Log File: `backend/backend_debug.log`
