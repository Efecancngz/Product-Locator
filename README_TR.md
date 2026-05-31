<p align="center">
  <img src="docs/assets/logo-placeholder.png" alt="Product Locator" width="80" />
</p>

<h1 align="center">Product Locator</h1>

<p align="center">
  <strong>Türkiye genelinde fiziksel mağaza stok takip platformu</strong><br />
  <sub>Aradığın ürünü, sana en yakın mağazada bul.</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" />
  <img src="https://img.shields.io/badge/python-3.11+-yellow?style=flat-square&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/react-19-61DAFB?style=flat-square&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/fastapi-0.109+-009688?style=flat-square&logo=fastapi&logoColor=white" />
</p>

---

## Hakkında

Product Locator, kullanıcının aradığı ürünün Türkiye'deki zincir mağazalarda stokta olup olmadığını **gerçek zamanlı** olarak tespit eden bir platformdur.

Kullanıcı bir ürün adı ve şehir girer; sistem 25+ mağaza sitesini tarayarak stok bilgisini, fiyatı ve mağaza konumunu harita üzerinde sunar.

**Hedef Kitle:** Fiziksel mağazadan ürün almak isteyen ancak stok durumunu önceden bilmek isteyen son kullanıcılar.

### 🌟 Temel Fark ve Değer Önerisi: Fiziksel Şube Stok Bulucu (Elden Alım Şube Bulucu)
Standart fiyat karşılaştırma motorlarının (Akakçe, Cimri vb.) aksine **Product Locator, kargo beklemek yerine ürünü doğrudan fiziksel mağazadan elden teslim almak (click-and-collect) isteyen kişiler için tasarlanmıştır**:
- **Fiziksel Şube Eşleştirmesi:** Stok durumlarını doğrudan Türkiye genelindeki **fiziksel şubeler ve ilçeler** düzeyinde eşleştirir.
- **Mikro-Konum Filtreleme:** Kullanıcılar dinamik olarak **il ve ilçe** araması yaparak, aradıkları ürünün o anda tam olarak hangi fiziksel mağaza şubesinin rafında olduğunu harita ve konum bilgisiyle birlikte canlı olarak görebilirler.

---

## Nasıl Çalışır

```
  Kullanıcı                    Frontend                         Backend
  ────────                    ─────────                        ─────────
      │                           │                                │
      │  "iPhone 15 - İzmir"      │                                │
      │──────────────────────────►│                                │
      │                           │  GET /api/v1/search?q=...      │
      │                           │───────────────────────────────►│
      │                           │                                │── Mağaza URL'leri oluştur
      │                           │                                │── Playwright ile scrape et
      │                           │                                │── Gemini AI ile parse et
      │                           │                                │── Koordinatlarla zenginleştir
      │                           │     SearchResult (JSON)        │
      │                           │◄───────────────────────────────│
      │    Harita + Liste         │                                │
      │◄──────────────────────────│                                │
```

---

## Özellikler

| Özellik | Açıklama |
|---|---|
| **Akıllı Arama** | Ürün adı veya marka ile 25+ mağazada eş zamanlı arama |
| **Harita Görünümü** | Stokta olan mağazaları interaktif haritada görüntüleme |
| **Liste Görünümü** | Fiyat karşılaştırmalı ürün listesi |
| **Konum Filtresi** | Şehir ve ilçe bazlı filtreleme |
| **Kıyaslama Grafiği** | Şubelerin en uygun fiyatlarını karşılaştıran interaktif neon bar grafiği |
| **Yol Tarifi Entegrasyonu** | Şube koordinatlarından tek tıkla Google Harita yol tarifi alımı |
| **Stealth Scrape Simulator** | Admin formunda anlık seçici/DOM taraması ve terminal log görselleştiricisi |
| **Sağlık Teşhis Paneli** | MongoDB latency ping, Gemini quota ve ReportSystem durumunu izleyen neon header halkaları |
| **Bildirim Merkezi** | ReportSystem mikroservis entegrasyonu ile Telegram, E-posta ve SMS üzerinden kazıcı hata ve stok alarmları |
| **AI Destekli Parse** | Gemini Flash 2.0 ile HTML'den otomatik ürün çıkarımı |
| **Fallback Parser** | AI başarısız olursa BeautifulSoup tabanlı gelişmiş yedek sistem |
| **Manuel Stok Girişi** | Web sitesi bulunmayan yerel esnaflar için haritadan koordinat seçmeli (**Map Picker - Pigeon-Maps**) manuel ürün stok yönetimi |

---

## Desteklenen Mağazalar

| Kategori | Mağazalar | Sayı |
|---|---|---|
| Elektronik | Teknosa · Vatan Bilgisayar · MediaMarkt · Hepsiburada · Trendyol | 5 |
| Beyaz Eşya | Arçelik · Beko · Vestel · Bosch · Siemens | 5 |
| Giyim | Flo · LC Waikiki · Koton · Boyner · DeFacto | 5 |
| Spor | Decathlon · Nike · Adidas · Intersport · Sportive | 5 |
| Kozmetik | Gratis · Watsons · Sephora · Rossmann · Eve | 5 |

> Yeni mağaza eklemek için [Katkıda Bulunma](#katkıda-bulunma) bölümüne bakın.

---

## Teknoloji Yığını

### Backend

| Bileşen | Teknoloji | Amaç |
|---|---|---|
| Framework | FastAPI 0.109+ | REST API |
| Dil | Python 3.11+ | Backend geliştirme |
| Scraping | Playwright 1.41+ | Headless browser |
| AI Parse | Google Gemini Flash 2.0 | HTML → ürün verisi |
| Fallback Parse | BeautifulSoup4 | Yedek parser |
| Validation | Pydantic v2 | Request/Response doğrulama |
| Veritabanı | MongoDB + Motor | Çift Modlu (MongoDB / In-Memory Fallback) Önbellekleme & Dinamik SaaS Yönetimi |
| Önbellek | Redis 8 (hiredis) | Milisaniye altı arama sonucu önbellekleme, TTL & LRU eviction |
| Kimlik Doğrulama | Firebase Admin SDK | JWT token doğrulama, Google/Email giriş, admin rol koruması |
| Bildirim Mikroservisi | ReportSystem (Java 17 / Javalin) | Çok kanallı bildirim hattı (Telegram, E-posta, SMS, WhatsApp) REST API üzerinden |

### DevOps & CI/CD

| Bileşen | Teknoloji | Amaç |
|---|---|---|
| CI Pipeline | GitHub Actions | Her push/PR'da otomatik pytest, Vite build, docker-compose doğrulama |
| Container | Docker Compose | Çoklu servis orkestrasyonu (Backend, Frontend, MongoDB, Redis, ReportSystem) |

### Frontend

| Bileşen | Teknoloji | Amaç |
|---|---|---|
| Framework | React 19 + TypeScript 5 | UI |
| Build | Vite 6 | Dev server & bundler |
| Stil | Tailwind CSS v4 | Utility-first CSS |
| Animasyon | GSAP 3 | Geçiş animasyonları |
| Harita | pigeon-maps | OpenStreetMap tabanlı |
| Server State | TanStack Query v5 | API caching |

---

## Başlangıç

### Gereksinimler

- Python 3.11+ ve pip
- Node.js 18+ ve npm
- Gemini API Key → [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### Kurulum

```bash
# Repoyu klonla
git clone <repo-url>
cd Product-Locator

# Backend
cd backend
cp .env.example .env          # .env'i düzenle → GEMINI_API_KEY ekle
python -m venv venv
.\venv\Scripts\activate       # Windows
pip install -r requirements.txt
playwright install chromium

# Frontend
cd ../frontend
npm install
```

### Çalıştırma

```bash
# Terminal 1 — Backend (port 8001)
cd backend
.\venv\Scripts\activate
python app.py

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

### Docker ile Çalıştırma

```bash
cp backend/.env.example backend/.env
# .env'i düzenle → GEMINI_API_KEY ekle

docker-compose up --build
```

| Servis | Adres |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8001 |
| ReportSystem (Bildirim) | http://localhost:8080 |
| Swagger Docs | http://localhost:8001/docs |

---

## API Referansı

### `GET /api/v1/search`

Kayıtlı mağazalarda ürün stok araması yapar.

**Parametreler:**

| Parametre | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `q` | string | ✅ | Ürün adı (min. 2, maks. 200 karakter) |
| `city` | string | — | Şehir filtresi |
| `district` | string | — | İlçe filtresi |

**Örnek:**

```bash
curl "http://localhost:8001/api/v1/search?q=iPhone+15+Pro&city=İzmir"
```

**Yanıt:**

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
      "last_updated": "2026-05-29T19:30:00Z"
    }
  ]
}
```

**Stok Durumları:**

| Değer | Anlamı |
|---|---|
| `IN_STOCK` | Mevcut |
| `OUT_OF_STOCK` | Yok |
| `LIMITED` | Sınırlı |

### SaaS Dinamik Mağaza / Admin API

Sisteme dinamik olarak mağaza ekleme, silme, güncelleme veya arama kazıyıcılarını anlık olarak pasifleştirip aktifleştirme yeteneği sağlar.

- **GET** `/api/v1/admin/stores` -> Tüm tanımlı mağazaları (MongoDB veya bellek üstü) listeler.
- **GET** `/api/v1/admin/stores/{key}` -> Belirtilen mağazanın detaylarını getirir.
- **POST** `/api/v1/admin/stores` -> Yeni bir mağaza ve CSS seçicileri ekler.
- **PATCH** `/api/v1/admin/stores/{key}/toggle` -> Mağazayı arama motorunda anında aktif/pasif yapar.
- **PUT** `/api/v1/admin/stores/{key}` -> Mağaza detaylarını veya CSS seçicilerini günceller.
- **DELETE** `/api/v1/admin/stores/{key}` -> Mağazayı sistemden ve arama listesinden tamamen kaldırır.

---

## Proje Yapısı

```
Product-Locator/
│
├── backend/
│   ├── app.py                         # Uygulama giriş noktası
│   ├── requirements.txt               # Python bağımlılıkları
│   ├── Dockerfile
│   ├── .env.example                   # Environment şablonu
│   └── src/
│       ├── config/
│       │   ├── settings.py            # Pydantic-Settings konfigürasyonu
│       │   └── store_registry.py      # Statik mağaza tanımları ve veri modelleri
│       ├── models/
│       │   ├── product.py             # Ürün veri modelleri
│       │   └── store.py               # StoreConfigModel (Admin şeması)
│       ├── routes/
│       │   ├── search.py              # Arama API endpoint'i (Rate limit korumalı)
│       │   └── admin.py               # SaaS Dinamik Mağaza CRUD rotaları
│       ├── services/
│       │   ├── db_service.py          # Çift Modlu (MongoDB / In-Memory Fallback) veritabanı & önbellek yönetimi
│       │   ├── search_orchestrator.py # Arama koordinasyonu
│       │   ├── search_service.py      # İş mantığı
│       │   ├── ai_parser.py           # Gemini AI parser
│       │   ├── fallback_parser.py     # Yedek parser
│       │   └── store_service.py       # Mağaza verileri
│       └── universal_agent/           # Genel site arama motoru
│
├── frontend/
│   └── src/
│       ├── App.tsx                    # Ana bileşen
│       ├── components/                # UI bileşenleri
│       ├── hooks/                     # Custom hook'lar
│       └── types/                     # TypeScript tipleri
│
├── docker-compose.yml
└── README.md
```

---

## Environment Değişkenleri

| Değişken | Zorunlu | Varsayılan | Açıklama |
|---|---|---|---|
| `GEMINI_API_KEY` | ✅ | — | Gemini API anahtarı |
| `SERP_API_KEY` | — | `""` | SerpAPI anahtarı |
| `OPENAI_API_KEY` | — | `""` | Şu an kullanılmıyor |
| `MONGO_URL` | — | `mongodb://localhost:27017` | MongoDB bağlantısı |
| `DB_NAME` | — | `product_locator` | Veritabanı adı |

## Manuel Stok Girişi & Haritadan Konum Seçici (Map Picker)

Product Locator, web sitesi veya e-ticaret altyapısı bulunmayan yerel fiziksel mağazaların (esnafların) da sisteme dahil edilebilmesi için manuel stok giriş sistemini tam destekler.

### Manuel Stok Yönetimi Öne Çıkan Özellikler:
- **İnteraktif Konum Seçici (Map Picker):** Admin Panelinden manuel ürün eklenirken veya güncellenirken, yönetici Pigeon-Maps haritası üzerinde istediği noktaya tıklayarak şubenin enlem (`latitude`) ve boylam (`longitude`) koordinatlarını otomatik olarak forma doldurabilir.
- **Arama Pipeline Entegrasyonu:** Manuel olarak eklenen ürünler, arama motoruna (search orchestrator) entegre edilmiştir. Arama yapıldığında, web sitelerinden anlık olarak çekilen (scrape edilen) ürünler ileşleşen aktif manuel stoklar birleştirilir; fiyata, kategoriye ve mesafeye göre sıralanır.
- **Çift Modlu Çalışma Güvencesi (Dual-Mode Sync):** Veriler MongoDB üzerinde kalıcı saklanır; MongoDB çevrimdışı olduğunda ise thread-safe in-memory cache fallback mekanizması sayesinde veri kaybı yaşanmadan kesintisiz hizmet sunulur.

---

## Katkıda Bulunma

### Yeni Mağaza Ekleme

Yeni mağazalar kod yazmadan veya dinamik olarak yönetilebilir:

#### Yöntem A: SaaS Dinamik API (Tavsiye Edilen)
Swagger arayüzü (`/docs`) veya Admin API (`POST /api/v1/admin/stores`) aracılığıyla dinamik olarak kazıcı seçicileriyle (no-code selectors) mağaza ekleyebilirsiniz. MongoDB aktifken bu veriler kalıcı saklanır; MongoDB çevrimdışıyken ise Dual-Mode Sync mimarisi sayesinde in-memory registry üstünden çalışmaya devam eder.

#### Yöntem B: Statik Kod Seviyesinde Ekleme
`backend/src/config/store_registry.py` dosyasına ekleyin:

```python
"magaza_adi": StoreConfig(
    name="Mağaza Adı",
    domain="magaza.com.tr",
    search_url_template="https://www.magaza.com.tr/arama?q={query}",
    category=StoreCategory.ELECTRONICS,
),
```

### Geliştirme Kuralları

- Branch isimlendirme: `feature/xxx`, `fix/xxx`, `docs/xxx`
- Commit mesajları: [Conventional Commits](https://www.conventionalcommits.org/) formatı
- PR açmadan önce testlerin geçtiğinden emin olun

---

## Dokümantasyon

| Döküman | Konum | İçerik |
|---|---|---|
| Bu dosya | `README.md` | Proje tanıtımı ve başlangıç rehberi |
| Türkçe Başlangıç | [`README_TR.md`](README_TR.md) | Sistemin Türkçe detaylı kılavuzu |
| Backend Rehberi | [`backend/README.md`](backend/README.md) | Kurulum, servisler, test |
| Türkçe Backend | [`backend/README_TR.md`](backend/README_TR.md) | Backend kurulum ve QA rehberi |
| Mimari Detaylar | [`backend/ARCHITECTURE.md`](backend/ARCHITECTURE.md) | Servis akışları, veri modelleri |
| Türkçe Mimari | [`backend/ARCHITECTURE_TR.md`](backend/ARCHITECTURE_TR.md) | Detaylı Türkçe mimari ve parser akış şeması |
| Kurulum Kılavuzu | [`DEPLOY.md`](DEPLOY.md) | Detaylı canlı ortam bulut kurulum kılavuzu (İngilizce) |
| Türkçe Kurulum | [`DEPLOY_TR.md`](DEPLOY_TR.md) | Veritabanı ve sunucu canlandırma Türkçe rehberi |
| API Docs (Canlı) | http://localhost:8001/docs | Swagger UI — interaktif |

---

## Lisans

MIT License — Detaylar için [`LICENSE`](LICENSE) dosyasına bakın.

---

<p align="center">
  <sub>Product Locator — v0.1.0</sub>
</p>
