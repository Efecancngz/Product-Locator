# Product Locator — Backend Mimarisi

Bu dokümantasyon, backend servislerinin nasıl çalıştığını, servisler arası veri akışını ve genişletme noktalarını açıklar.

---

## Genel Bakış

```
HTTP İsteği
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  FastAPI (app.py)                                           │
│  ├── CORS Middleware                                        │
│  └── Router: /api/v1/search  →  routes/search.py           │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  SearchService (services/search_service.py)                  │
│  ├── SearchOrchestrator çağrısı (180s timeout)              │
│  ├── Ham sonuçları ProductStock modeline map etme           │
│  └── StoreService ile koordinat zenginleştirme              │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  SearchOrchestrator (services/search_orchestrator.py)        │
│  ├── GenericSiteSearcher → Arama URL'leri oluştur           │
│  └── Her URL için:                                          │
│      ├── Playwright (headless Chromium)                     │
│      │   ├── Kaynakları engelle (img/css/font)              │
│      │   ├── Sayfayı yükle (45s timeout)                    │
│      │   └── HTML içeriğini al                              │
│      ├── AIParser.parse_html()  ─── başarısız ──┐           │
│      └────────────────────────────────────────── ▼          │
│                                         FallbackParser      │
└─────────────────────────────────────────────────────────────┘
```

---

## Servis Katmanları

### 1. Route Katmanı (`src/routes/`)

**Sorumluluk:** HTTP isteği alır, parametreleri doğrular, servis katmanına veya veri tabanına iletir.

#### Arama Rotası
```python
# GET /api/v1/search?q=iPhone+15&city=İzmir
async def search_products(q: str, city: str, district: str) -> SearchResult
```

#### Dinamik Mağaza & Admin CRUD Rotaları (`src/routes/admin.py`)
- **GET** `/api/v1/admin/stores` -> Tüm tanımlı mağazaları (MongoDB veya bellek üstü) listeler.
- **GET** `/api/v1/admin/stores/{key}` -> Belirtilen mağazanın detaylarını getirir.
- **POST** `/api/v1/admin/stores` -> Dinamik olarak yeni bir mağaza veya no-code CSS seçici (selector) ekler.
- **PATCH** `/api/v1/admin/stores/{key}/toggle` -> Mağazayı anlık olarak aktif veya pasif hale verir.
- **PUT** `/api/v1/admin/stores/{key}` -> Belirtilen mağazanın detaylarını günceller.
- **DELETE** `/api/v1/admin/stores/{key}` -> Mağazayı sistemden ve arama listesinden tamamen siler.

### 2. Service Katmanı (`src/services/`)

**Sorumluluk:** İş mantığı. Orkestratörden gelen ham veriyi işler.

#### SearchService
- Ham sonuçları Pydantic modellerine dönüştürür
- Şehir bazlı mağaza koordinatlarını ekler
- Şube bazlı ürün kopyalama (bir ürün birden fazla şubede olabilir)
- District (ilçe) filtresi uygular
- Max 30 sonuçla sınırlar

#### SearchOrchestrator
- Arama URL'lerini oluşturur
- Playwright browser lifecycle yönetimi
- AIParser ve FallbackParser'ı zincirler

### 4. Takip Sistemi (Watchlist) & Alert Pipeline (`src/routes/watchlist.py`)
- **CRUD Yönetimi:** Kullanıcının takip ettiği ürünleri MongoDB veya thread-safe in-memory cache üzerinde ekler, günceller ve siler.
- **Stok & Fiyat Değişim Tespiti (`/watchlist/check`):** Takipteki tüm ürünleri arka planda güncel aramayla sorgular. `OUT_OF_STOCK` durumundan `IN_STOCK` durumuna geçişleri veya fiyat düşüşlerini algılar.
- **Çok Kanallı Bildirim Entegrasyonu:** Değişiklik tespit edildiğinde `ReportSystem` (SMTP/Telegram) üzerinden uyarı fırlatır ve admin panelinde tanımlı olan harici **Webhook URL**'sine HTTP POST payload'ı gönderir.

### 5. Watchlist Zamanlayıcı (`src/services/scheduler_service.py` & `src/routes/scheduler.py`)
- **Arka Plan Otomasyonu:** Takip listesindeki tüm ürünleri `apscheduler` yardımıyla FastAPI'nin asenkron event loop'u içerisinde arka planda periyodik olarak tarar.
- **Çift Modlu Çalışma:** Saatlik periyot (N saatte bir) veya Cron modunu (her gün belirli bir UTC saat/dakikasında, varsayılan 03:00 UTC) destekler.
- **Tarama Geçmişi (`scan_history`):** Her taramanın metaverilerini (başlangıç/bitiş zamanı, taranan ürün sayısı, tetiklenen alarmlar, oluşan hatalar ve ürün düzeyindeki detaylı güncellemeler) MongoDB'de saklar.
- **API Kontrolü:** Yönetici paneli için zamanlayıcıyı başlatma/durdurma, yeniden planlama, anlık manuel tarama tetikleme (`run-now`) ve sayfalı geçmiş listeleme uç noktaları sunar.

### 6. Parser Katmanı

| Parser | Koşul | Yöntem |
|---|---|---|
| `AIParser` | Her zaman önce denenir | Gemini Flash 2.0 + prompt engineering |
| `FallbackParser` | AI boş döndürürse veya hata verirse | BeautifulSoup CSS selector'ları |

### 4. Konfigürasyon Katmanı (`src/config/`)

#### Settings (Pydantic-Settings)
Environment değişkenlerini `.env` dosyasından veya sistem env'inden okur.

#### StoreRegistry & SaaS Dinamik Registry (Dual-Mode Sync)
Uygulama, hem yerel statik konfigürasyonları (`src/config/store_registry.py`) hem de MongoDB'de saklanan dinamik mağaza ayarlarını (`db_service`) bir araya getiren çift modlu (Dual-Mode) senkronizasyon mimarisine sahiptir.
- **Boot Sync:** Uygulama başlarken MongoDB'deki mağaza verilerini in-memory `STORE_CONFIGS` sözlüğüne senkronize eder.
- **Write-Through Caching:** Admin API üzerinden bir mağaza eklendiğinde, silindiğinde veya güncellendiğinde in-memory registry de anında güncellenir. Scraper'lar veritabanına sorgu atmak yerine bu ultra hızlı, thread-safe in-memory registry'yi kullanır.

```python
@dataclass
class StoreConfig:
    name: str                           # "Teknosa"
    domain: str                         # "teknosa.com"
    search_url_template: str            # "https://teknosa.com/arama/?s={query}"
    category: StoreCategory             # ELECTRONICS
    enabled: bool = True
    selectors: Optional[Dict[str, str]] = None  # No-Code Kazıma için CSS seçicileri
```

---

## Veri Modelleri

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

#### Watchlist Modeli (WatchlistItemResponse)
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

## AI Parser Akışı

```
HTML (30K char) + URL
        │
        ▼
   Gemini Flash 2.0
        │
   Prompt: Türkçe ürün çıkarım promptu
   Beklenen: JSON { "products": [...] }
        │
        ▼
   JSON Parse
        │
        ├── Başarılı → List[Dict] döner
        └── Hata (JSONDecodeError / Exception) → [] döner
                │
                ▼
         FallbackParser devreye girer
```

**Gemini Prompt Stratejisi:**
- Türkçe karakterleri koruması istenir
- Maksimum 5 ürün döndürmesi istenir  
- Kategori sayfası değil, gerçek ürün çıkarması istenir
- Store info URL'den tahmin edilebilir

---

## Universal Agent (`src/universal_agent/`)

Mağaza sitelerinde arama yapmak için genel amaçlı modül.

### search_engine.py — GenericSiteSearcher

`StoreRegistry`'deki URL şablonlarını kullanarak doğrudan mağaza arama URL'leri oluşturur. Google/Bing aramalarına bağımlı değildir.

```python
searcher = GenericSiteSearcher()
results = await searcher.search("iPhone 15 Pro", limit=5)
# → [{"url": "https://teknosa.com/arama/?s=iPhone+15+Pro", ...}, ...]
```

### page_parser.py

Playwright ile alınan sayfadan metin içeriğini çıkarır, script/style taglarını temizler.

### agent.py

Arama ve parsing akışını koordine eden üst seviye ajan.

---

## Genişletme: Yeni Mağaza Ekleme

Yeni bir mağaza eklemek için iki yöntem bulunur:

### Yöntem A: Dinamik & No-Code SaaS API (Tavsiye Edilen)
Admin paneli arayüzünü veya `/api/v1/admin/stores` CRUD endpoint'lerini kullanarak, herhangi bir kod yazmadan doğrudan yeni bir mağaza ekleyebilirsiniz:
```json
POST /api/v1/admin/stores
{
  "key": "yeni_magaza",
  "name": "Yeni Mağaza",
  "domain": "yenimagaza.com.tr",
  "search_url_template": "https://www.yenimagaza.com.tr/arama?q={query}",
  "category": "electronics",
  "enabled": true,
  "selectors": {
    "product_container": ".product-item",
    "product_name": ".title",
    "product_price": ".price"
  }
}
```

### Yöntem B: Statik Kod Seviyesinde Ekleme
1. **StoreRegistry'e ekle** (`src/config/store_registry.py`):
```python
"yeni_magaza": StoreConfig(
    name="Yeni Mağaza",
    domain="yenimagaza.com.tr",
    search_url_template="https://www.yenimagaza.com.tr/arama?q={query}",
    category=StoreCategory.ELECTRONICS,
),
```

2. **Koordinat verisini ekle** (`src/services/store_service.py`):
```python
# Mağazanın şehir bazlı koordinatları
```

3. **Opsiyonel: Özel scraper ekle** (`src/scraper/stores/`):
```python
class YeniMagazaScraper(BaseScraper):
    def parse(self, html: str) -> List[Dict]: ...
```

4. **Scraper factory'yi güncelle** (`src/scraper/factory.py`)

---

## Performans Notları

| İşlem | Süre | Açıklama |
|---|---|---|
| Playwright başlatma | ~2s | Her request'te yeniden başlar |
| Sayfa yükleme | 5-15s | Site hızına bağlı |
| Gemini API | 2-8s | Token sayısına bağlı |
| Toplam (5 URL) | 30-120s | Paralel değil, sıralı |

**İyileştirme Fırsatları:**
- Playwright browser'ı request'ler arasında poolda tutmak
- URL'leri paralel scrape etmek (asyncio.gather)
- Sonuçları Redis'e cache'lemek

---

## Hata Yönetimi

```
SearchService
├── asyncio.TimeoutError (180s)  → Boş SearchResult döner
└── Exception                    → Boş SearchResult döner

SearchOrchestrator (her URL için)
├── Playwright hatası            → URL atlanır, bir sonraki denenir
├── AI parse hatası              → FallbackParser denenir
└── FallbackParser hatası        → [] döner, URL atlanır

AIParser
├── json.JSONDecodeError         → [] döner (log yazılır)
└── Exception                    → [] döner (log yazılır)
```

---

## Log Formatı

```
2026-05-29 19:30:00 - api - INFO - [SearchService] Searching for: iPhone 15 (city=İzmir)
2026-05-29 19:30:01 - api - INFO - [Orchestrator] Starting search for: iPhone 15
2026-05-29 19:30:03 - api - INFO - [Orchestrator] Found 5 URLs to scrape
2026-05-29 19:30:08 - api - INFO - AI Parser extracted 3 products from https://teknosa.com/...
2026-05-29 19:30:15 - api - INFO - [SearchService] Returning 12 products (from 3 unique)
```

Log dosyası: `backend/backend_debug.log`
