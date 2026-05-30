<p align="center">
  <img src="docs/assets/logo-placeholder.png" alt="Product Locator" width="80" />
</p>

<h1 align="center">Product Locator</h1>

<p align="center">
  <strong>Real-time physical branch stock tracking platform across Turkey</strong><br />
  <sub>Find the product you are looking for in the nearest physical retail store.</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.1.0-blue?style=flat-square" />
  <img src="https://github.com/Efecancngz/Product-Locator/actions/workflows/ci.yml/badge.svg" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" />
  <img src="https://img.shields.io/badge/python-3.11+-yellow?style=flat-square&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/react-19-61DAFB?style=flat-square&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/fastapi-0.109+-009688?style=flat-square&logo=fastapi&logoColor=white" />
</p>

---

> [!NOTE]
> Türkçe dökümantasyon için **[README_TR.md](README_TR.md)** dosyasına göz atabilirsiniz.

---

## About

Product Locator is a platform designed to check whether a product is currently in stock at major retail chain branches in Turkey **in real-time**.

When a user enters a product search term and optionally specifies a location (city/district), the system scrapes 25+ e-commerce platforms concurrently and presents the exact stock status, prices, and store locations on an interactive map.

**Target Audience:** Customers who prefer to purchase products from physical stores but want to confirm item availability before visiting.

### 🌟 Core Value Proposition: Physical Branch Stock Locator (Click-and-Collect Finder)
Unlike standard price comparison engines (such as Akakçe or Cimri) which primarily index online stock and prices for delivery shipping, **Product Locator is uniquely designed for physical store pick-up (Elden Teslim Alım)**:
- **Physical Branch Mapping:** It maps real-time stock directly to **specific local branches and districts** across Turkey.
- **Micro-Location Filtering:** Users can dynamically specify a **city and district** to locate which physical store branch currently has the item sitting on its shelf, enabling instant click-and-collect locator functionality.

---

## How It Works

```
   User                       Frontend                         Backend
  ──────                     ──────────                       ─────────
    │                            │                                │
    │   "iPhone 15 - İzmir"      │                                │
    │───────────────────────────►│                                │
    │                            │  GET /api/v1/search?q=...      │
    │                            │───────────────────────────────►│
    │                            │                                │── Generate query search URLs
    │                            │                                │── Scrape pages via Playwright
    │                            │                                │── Parse HTML via Gemini AI
    │                            │                                │── Enrich with branch coordinates
    │                            │     SearchResult (JSON)        │
    │                            │◄───────────────────────────────│
    │    Interactive Map + List  │                                │
    │◄───────────────────────────│                                │
```

---

## Key Features

| Feature | Description |
|---|---|
| **Smart Search** | Simultaneous product search across 25+ major retailers |
| **Interactive Map View** | View in-stock branches plotted on a dynamic map |
| **Price Comparison** | Side-by-side list of available models and pricing |
| **Comparison Chart** | Custom animated neon bar chart highlighting the lowest price across store branches |
| **Google Maps Routing** | Direct dynamic turn-by-turn routing links to target physical branches |
| **Stealth Scrape Simulator** | Admin sandbox with sequential console logging visualizer and element previews |
| **Diagnostics Bar** | Pulsing neon header pills tracking MongoDB latency, Gemini quota health, and ReportSystem status |
| **Notification Center** | ReportSystem microservice integration for Telegram, Email, and SMS alerts on scraper failures and stock events |
| **Branch Filtering** | Filter query results based on cities and districts |
| **AI-Powered Parsing** | Automated HTML extraction via Google Gemini Flash 2.0 |
| **Resilient Scrapers** | Fallback parser using BeautifulSoup4 with upgraded malformed JSON-LD bypass |
| **SaaS Dynamic Stores** | Live retailer CRUD, active toggle switches, and no-code CSS selectors |

---

## Supported Retailers

| Category | Retail Stores | Count |
|---|---|---|
| Electronics | Teknosa · Vatan Bilgisayar · MediaMarkt · Hepsiburada · Trendyol | 5 |
| Appliances | Arçelik · Beko · Vestel · Bosch · Siemens | 5 |
| Clothing | Flo · LC Waikiki · Koton · Boyner · DeFacto | 5 |
| Sports | Decathlon · Nike · Adidas · Intersport · Sportive | 5 |
| Cosmetics | Gratis · Watsons · Sephora · Rossmann · Eve | 5 |

> To add a new store dynamically or statically, see [Contributing](#contributing).

---

## Technology Stack

### Backend

| Component | Technology | Description |
|---|---|---|
| Framework | FastAPI 0.109+ | High-performance asynchronous REST API |
| Language | Python 3.11+ | Backend logic, Pydantic data schemas |
| Scraping | Playwright 1.41+ | Headless Chromium browser scraper |
| AI Parsing | Google Gemini Flash 2.0 | Advanced HTML extraction engine |
| Fallback Scraper | BeautifulSoup4 | Resilient selector-based secondary parser |
| Validation | Pydantic v2 | Robust request/response schema parsing |
| Database | MongoDB + Motor | Asynchronous caching & Dynamic Store configs (Dual-Mode Sync) |
| Cache | Redis 8 (hiredis) | Sub-millisecond search result caching with TTL & LRU eviction |
| Authentication | Firebase Admin SDK | JWT token verification, Google/Email sign-in, admin role guard |
| Notification Microservice | ReportSystem (Java 17 / Javalin) | Multi-channel alerting pipeline (Telegram, Email, SMS, WhatsApp) via REST API |

### DevOps & CI/CD

| Component | Technology | Description |
|---|---|---|
| CI Pipeline | GitHub Actions | Automated pytest, Vite build, docker-compose validation on push/PR |
| Containerization | Docker Compose | Multi-service orchestration (Backend, Frontend, MongoDB, Redis, ReportSystem) |

### Frontend

| Component | Technology | Description |
|---|---|---|
| Framework | React 19 + TypeScript 5 | Premium modern web architecture |
| Tooling | Vite 6 | Lightning-fast build tool & dev server |
| Styling | Vanilla CSS / Tailwind | Sleek dark-mode, glassmorphism UI |
| Animation | GSAP 3 | Micro-interactions and smooth transitions |
| Mapping | pigeon-maps | OpenStreetMap-based responsive map interface |
| State | TanStack Query v5 | Server state caching and refetching |

---

## Getting Started

### Prerequisites

- Python 3.11+ and pip
- Node.js 18+ and npm
- Gemini API Key → [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd Product-Locator

# Backend Installation
cd backend
cp .env.example .env          # Open .env and add your GEMINI_API_KEY
python -m venv venv
.\venv\Scripts\activate       # Windows
# source venv/bin/activate    # macOS / Linux
pip install -r requirements.txt
playwright install chromium

# Frontend Installation
cd ../frontend
npm install
```

### Running Locally

```bash
# Terminal 1 — Backend (runs on port 8001)
cd backend
.\venv\Scripts\activate
python app.py

# Terminal 2 — Frontend (runs on port 5173)
cd frontend
npm run dev
```

### Running with Docker

```bash
# Configure API keys in backend environment
cp backend/.env.example backend/.env
# Add your GEMINI_API_KEY in backend/.env

# Build and run all services
docker-compose up --build
```

| Service | Address |
|---|---|
| Frontend Client | http://localhost:3000 |
| Backend REST API | http://localhost:8001 |
| ReportSystem (Notification) | http://localhost:8080 |
| Swagger Documentation | http://localhost:8001/docs |

---

## API Reference

### `GET /api/v1/search`

Retrieves real-time product stock statuses from all enabled retailers.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `q` | string | ✅ | Product query or brand (min 2, max 100 characters) |
| `city` | string | — | Optional city filter (e.g., 'İzmir', 'İstanbul') |
| `district` | string | — | Optional district filter (requires city parameter) |

**Sample Request:**
```bash
curl "http://localhost:8001/api/v1/search?q=iPhone+15+Pro&city=İzmir"
```

**Sample Response:**
```json
{
  "query": "iPhone 15 Pro",
  "total_found": 5,
  "found_products": [
    {
      "product_name": "Apple iPhone 15 Pro 256GB",
      "price": 74999.0,
      "currency": "TRY",
      "stock_status": "IN_STOCK",
      "store_location": {
        "store_name": "Teknosa",
        "city": "İzmir",
        "district": "Karşıyaka",
        "branch": "Forum Bornova",
        "latitude": 38.4691,
        "longitude": 27.2154
      },
      "source_url": "https://www.teknosa.com/...",
      "last_updated": "2026-05-30T00:47:31Z"
    }
  ]
}
```

---

## Project Structure

```
Product-Locator/
│
├── backend/
│   ├── app.py                         # FastAPI setup, custom middleware, routes
│   ├── requirements.txt               # Backend dependencies
│   ├── Dockerfile
│   ├── .env.example                   # Env template
│   └── src/
│       ├── config/
│       │   ├── settings.py            # Configuration loader
│       │   └── store_registry.py      # Store templates and in-memory registry
│       ├── models/
│       │   ├── product.py             # Product Pydantic models
│       │   └── store.py               # Store config schemas (Pydantic v2)
│       ├── routes/
│       │   ├── search.py              # Search API endpoint (Rate limited)
│       │   └── admin.py               # SaaS Admin Store CRUD routes
│       ├── services/
│       │   ├── db_service.py          # Dual-Mode Cache (MongoDB / In-Memory)
│       │   ├── search_orchestrator.py # Multi-retailer browser coordinates
│       │   ├── search_service.py      # Business logic and branch matching
│       │   ├── ai_parser.py           # Google Gemini extractor
│       │   ├── fallback_parser.py     # BeautifulSoup4 parser
│       │   └── store_service.py       # Regional coordinates data
│       └── universal_agent/           # Keyword browser engine
│
├── frontend/
│   └── src/
│       ├── App.tsx                    # Main interface entrance
│       ├── components/                # Animated glassmorphism elements
│       ├── hooks/                     # Custom hooks and state fetching
│       └── types/                     # TS interface definitions
│
├── docker-compose.yml
└── README.md
```

---

## Contributing

### Adding a New Store

You can contribute a new retailer through two distinct pathways:

#### Method A: SaaS Dynamic Admin API (Recommended)
You can directly test and register new e-commerce stores with CSS selectors (no-code scraping templates) dynamically. Use `/docs` Swagger console or submit a request to `POST /api/v1/admin/stores`.

#### Method B: Static Code Addition
Add a new configuration mapping block into `backend/src/config/store_registry.py`:

```python
"retailer_key": StoreConfig(
    name="Retailer Name",
    domain="retailer.com.tr",
    search_url_template="https://www.retailer.com.tr/search?q={query}",
    category=StoreCategory.ELECTRONICS,
),
```

---

## Documentation Directory

| Document | Location | Description |
|---|---|---|
| Global Readme | `README.md` | Primary welcome entrypoint & system summaries (English) |
| Türkçe Başlangıç | [`README_TR.md`](README_TR.md) | Dedicated Turkish translation of the system documentation |
| Backend Guide | [`backend/README.md`](backend/README.md) | Installation, environment setup, and pytest instructions (English) |
| Türkçe Backend | [`backend/README_TR.md`](backend/README_TR.md) | Turkish backend installation and validation guidelines |
| System Architecture | [`backend/ARCHITECTURE.md`](backend/ARCHITECTURE.md) | Deep-dive diagrams, API caching logic, and recovery design (English) |
| Türkçe Mimari | [`backend/ARCHITECTURE_TR.md`](backend/ARCHITECTURE_TR.md) | Detailed Turkish system and scraper architecture flow |
| Deployment Guide | [`DEPLOY.md`](DEPLOY.md) | Comprehensive cloud deployment instructions using student VM & Vercel (English) |
| Türkçe Canlıya Alma | [`DEPLOY_TR.md`](DEPLOY_TR.md) | Detailed Turkish guide on database provisioning and cloud server deployment |

---

## License

This project is licensed under the MIT License — see the [`LICENSE`](LICENSE) file for details.
