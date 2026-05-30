# Product Locator — Backend

> FastAPI-powered REST API. Scrapes e-commerce sites using Playwright and extracts product details via Gemini AI.

---

## Requirements

- Python 3.11+
- Gemini API Key → [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

## Installation

```bash
python -m venv venv
.\venv\Scripts\activate         # Windows
# source venv/bin/activate      # macOS / Linux

pip install -r requirements.txt
playwright install chromium

cp .env.example .env
# Open .env and add your GEMINI_API_KEY value
```

## Running the Application

```bash
python app.py
```

| Address | Description |
|---|---|
| http://localhost:8001 | Health Check / Welcome |
| http://localhost:8001/docs | Swagger UI (Interactive API Testing) |
| http://localhost:8001/redoc | ReDoc |

---

## Project Structure

```
backend/
├── app.py                      # Application entrypoint, CORS, routes registry, security headers
├── requirements.txt
├── Dockerfile
├── .env.example                # Environmental variables template
│
└── src/
    ├── config/
    │   ├── settings.py         # Pydantic-Settings configuration loader
    │   └── store_registry.py   # Static store definitions and registry helper functions
    │
    ├── models/
    │   ├── product.py          # Domain models (ProductStock, StoreLocation, SearchResult)
    │   └── store.py            # StoreConfigModel (Pydantic v2 validation schema for Admin)
    │
    ├── routes/
    │   ├── search.py           # GET /api/v1/search (IP-based rate limited search route)
    │   └── admin.py            # /api/v1/admin/stores (SaaS Dynamic Store CRUD endpoints)
    │
    ├── services/
    │   ├── db_service.py       # Dual-Mode Cache (MongoDB / In-Memory Fallback) & registry syncing
    │   ├── search_orchestrator.py  # Coordinates search URL Generation → scraper → parser flow
    │   ├── search_service.py       # Maps raw products, branch coordinates matching, and filtering
    │   ├── ai_parser.py            # primary Gemini Flash 2.0 HTML extractor
    │   ├── fallback_parser.py      # Secondary BeautifulSoup-based selector fallback
    │   └── store_service.py        # Regional branch coordinate store db
    │
    └── universal_agent/
        ├── agent.py
        ├── page_parser.py
        └── search_engine.py
```

---

## Service Architecture

```
Request → SearchService → SearchOrchestrator
                              │
                    ┌─────────┴──────────┐
                    ▼                    ▼
             Resolve URLs        Playwright Scrape
                                         │
                               ┌────────┴────────┐
                               ▼                 ▼
                           AIParser         FallbackParser
                          (Gemini)        (BeautifulSoup)
                               │                 │
                               └────────┬────────┘
                                        ▼
                             Enrich Branch Coordinates
                                        │
                                        ▼
                                    Response
```

### SearchOrchestrator

Manages the core scraping pipelines. Translates keywords to search URLs, handles multi-tab Playwright headless page loadings, fetches structural text, and cascades parsing options.

### SearchService

Processes records from the orchestrator. Maps raw items to Pydantic domain models, replicates products across multiple branches, applies regional city/district filters, and enforces a maximum return limit of 30 results.

### AIParser

Uses Google's `gemini-2.0-flash` model to analyze structured catalog pages and output products as JSON list structures. Truncates incoming HTML data at 30K characters to conserve context windows and optimize response time.

### FallbackParser

A resilient parser based on BeautifulSoup4. Invoked automatically if Gemini API calls encounter rate limit issues, connection timeouts, or parsing errors.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | ✅ | — | Google Gemini AI API key |
| `SERP_API_KEY` | — | `""` | Optional SerpAPI (fallback search engine) |
| `OPENAI_API_KEY` | — | `""` | Unused |
| `MONGO_URL` | — | `mongodb://localhost:27017` | MongoDB connection URL |
| `DB_NAME` | — | `product_locator` | Database catalog name |
| `ENV` | — | `dev` | Application stage (`dev` / `production`) |

---

## Tests and QA Standards

This project maintains rigorous software QA standards based on the IEEE 829 QA specifications. You can execute the test suite via `pytest`:

```bash
# Execute all security, rate-limiting, validations, and Admin CRUD integration tests
python -m pytest

# Execute developer-level debugging scripts
python test_search.py
python test_ai_parser.py
python test_city_match.py
python test_5_categories.py
python debug_pipeline.py
```

---

## Adding a New Store

New e-commerce retailers can be added dynamically without code modifications:

### Method A: SaaS Dynamic API (Recommended)
Access the Swagger documentation (`/docs`) or make a `POST` request to `/api/v1/admin/stores` to register the store and dynamic CSS scrapers (no-code selectors) on the fly. If MongoDB is active, configurations persist; otherwise, the system utilizes active memory fallback registry (Dual-Mode Sync).

### Method B: Static Code-Level Registration
Add the store details into `src/config/store_registry.py`:

```python
"new_store": StoreConfig(
    name="New Store",
    domain="newstore.com.tr",
    search_url_template="https://www.newstore.com.tr/search?q={query}",
    category=StoreCategory.ELECTRONICS,
),
```

---

## Further Reading

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System flows, diagrams, data model design, and recovery routines.
