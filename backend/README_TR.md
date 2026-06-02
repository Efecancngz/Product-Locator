# Product Locator — Backend

> FastAPI tabanlı REST API. Playwright ile web scraping, Gemini AI ile HTML parsing.

---

## Gereksinimler

- Python 3.11+
- Gemini API Key → [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

## Kurulum

```bash
python -m venv venv
.\venv\Scripts\activate         # Windows
# source venv/bin/activate      # macOS / Linux

pip install -r requirements.txt
playwright install chromium

cp .env.example .env
# .env → GEMINI_API_KEY değerini gir
```

## Çalıştırma

```bash
python app.py
```

| Adres | Sayfa |
|---|---|
| http://localhost:8001 | Health check |
| http://localhost:8001/docs | Swagger UI |
| http://localhost:8001/redoc | ReDoc |

---

## Proje Yapısı

```
backend/
├── app.py                      # Uygulama giriş noktası, CORS, router kaydı, güvenlik başlıkları
├── requirements.txt
├── Dockerfile
├── .env.example                # Environment şablonu
│
└── src/
    ├── config/
    │   ├── settings.py         # Pydantic-Settings konfigürasyonu
    │   └── store_registry.py   # Statik mağaza tanımları ve veri modelleri
    │
    ├── models/
    │   ├── product.py          # ProductStock, StoreLocation, SearchResult
    │   ├── store.py            # StoreConfigModel (Pydantic v2 Admin şeması)
    │   └── watchlist.py        # WatchlistItem şemaları [NEW]
    │
    ├── routes/
    │   ├── search.py           # GET /api/v1/search (IP tabanlı rate limit korumalı)
    │   ├── admin.py            # /api/v1/admin/stores (Dinamik Mağaza CRUD, Canlı Simülatör ve Sistem Sağlık Teşhis Rotaları)
    │   └── watchlist.py        # /api/v1/watchlist (Kullanıcı takip listesi CRUD, bildirim/check uç noktaları) [NEW]
    │
    ├── services/
    │   ├── db_service.py       # Çift Modlu (MongoDB / In-Memory Fallback) veritabanı & önbellek yönetimi
    │   ├── search_orchestrator.py  # Arama → scrape → parse koordinasyonu
    │   ├── search_service.py       # İş mantığı, zenginleştirme, filtreleme
    │   ├── ai_parser.py            # Gemini Flash 2.0 HTML parser
    │   ├── fallback_parser.py      # BeautifulSoup yedek parser
    │   └── store_service.py        # Mağaza koordinat veritabanı
    │
    └── universal_agent/
        ├── agent.py
        ├── page_parser.py
        └── search_engine.py
```

---

## Servis Mimarisi

```
Request → SearchService → SearchOrchestrator
                              │
                    ┌─────────┴──────────┐
                    ▼                    ▼
             URL oluştur          Playwright scrape
                                       │
                              ┌────────┴────────┐
                              ▼                 ▼
                          AIParser         FallbackParser
                         (Gemini)        (BeautifulSoup)
                              │                 │
                              └────────┬────────┘
                                       ▼
                              Koordinat zenginleştir
                                       │
                                       ▼
                                  Response
```

### SearchOrchestrator

Tam arama akışını yönetir. Mağaza URL'lerini oluşturur, Playwright ile scrape eder, AI ile parse eder.

### SearchService

Orchestrator'dan gelen ham sonuçları `ProductStock` modeline map eder, koordinatlarla zenginleştirir, şehir/ilçe filtresi uygular, maks. 30 sonuç döndürür.

### AIParser

Gemini `gemini-2.0-flash` ile HTML'den ürün bilgisi çıkarır. HTML 30K karakterde kesilir.

### FallbackParser

AI parser başarısız olduğunda devreye giren BeautifulSoup tabanlı yedek.

---

## Ortam Değişkenleri

| Değişken | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|
| `GEMINI_API_KEY` | ✅ | — | Gemini API anahtarı |
| `SERP_API_KEY` | — | `""` | SerpAPI (alternatif arama) |
| `OPENAI_API_KEY` | — | `""` | Kullanılmıyor |
| `MONGO_URL` | — | `mongodb://localhost:27017` | MongoDB bağlantısı |
| `DB_NAME` | — | `product_locator` | Veritabanı adı |
| `ENV` | — | `dev` | Ortam bilgisi |

---

## Testler ve QA Kalite Standartları

Uygulama, IEEE 829 QA standartlarına uygun kapsamlı bir test paketi içerir. Testleri çalıştırmak için:

```bash
# Tüm entegrasyon, güvenlik, rate-limiting, admin CRUD ve watchlist takip testlerini çalıştır
python -m pytest

# Watchlist takip listesi ve alarm check birim testlerini çalıştır
python -m pytest tests/test_watchlist.py

# Bireysel geliştirici/hata ayıklama betikleri
python test_search.py
python test_ai_parser.py
python test_city_match.py
python test_5_categories.py
python debug_pipeline.py
```

---

## Yeni Mağaza Ekleme

Yeni mağazalar kod yazmadan veya dinamik olarak yönetilebilir:

### Yöntem A: SaaS Dinamik API ile Ekleme (Önerilen)
Swagger arayüzü (`/docs`) veya Admin API (`POST /api/v1/admin/stores`) aracılığıyla dinamik olarak kazıcı seçicileriyle (no-code selectors) mağaza ekleyebilirsiniz. MongoDB aktifken bu veriler kalıcı saklanır; MongoDB çevrimdışıyken ise Dual-Mode Sync mimarisi sayesinde in-memory registry üstünden çalışmaya devam eder.

### Yöntem B: Statik Kod Seviyesinde Ekleme
`src/config/store_registry.py` dosyasına ekleyin:

```python
"yeni_magaza": StoreConfig(
    name="Yeni Mağaza",
    domain="yenimagaza.com.tr",
    search_url_template="https://www.yenimagaza.com.tr/arama?q={query}",
    category=StoreCategory.ELECTRONICS,
),
```

---

## İleri Okuma

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Detaylı mimari, veri akışı, hata yönetimi
