# Product Locator — Frontend

> React 19 + TypeScript + Vite tabanlı modern kullanıcı arayüzü.

---

## Gereksinimler

- Node.js 18+
- Backend çalışır durumda (varsayılan: http://localhost:8001)

## Kurulum & Çalıştırma

```bash
npm install
npm run dev
```

Uygulama **http://localhost:5173** adresinde çalışır.

---

## Komutlar

| Komut | Açıklama |
|---|---|
| `npm run dev` | Geliştirme sunucusu (HMR) |
| `npm run build` | Production build |
| `npm run preview` | Build önizleme |
| `npm run lint` | ESLint kontrolü |

---

## Proje Yapısı

```
src/
├── App.tsx                     # Ana bileşen, state yönetimi
├── main.tsx                    # React mount noktası
├── index.css                   # Global stiller, Tailwind tema
│
├── api/                        # Backend API çağrıları
├── components/
│   ├── filters/                # Konum ve kategori filtreleri
│   ├── map/                    # Harita (pigeon-maps)
│   └── ui/                     # Button, Input, Pagination
├── hooks/                      # Custom hook'lar (useProductSearch)
├── types/                      # TypeScript tip tanımları
└── data/                       # Statik veri (şehir/ilçe listesi)
```

---

## Teknoloji

| Kütüphane | Amaç |
|---|---|
| React 19 | UI framework |
| TypeScript 5 | Tip güvenliği |
| Vite 6 | Build tool |
| Tailwind CSS v4 | Stil |
| GSAP 3 | Animasyonlar |
| pigeon-maps | Harita (OpenStreetMap) |
| TanStack Query v5 | Server state & caching |
| Lucide React | İkonlar |

---

## API Bağlantısı

Frontend, backend'e proxy üzerinden bağlanır:

```
GET /api/v1/search?q={query}&city={city}&district={district}
```

Vite proxy ayarı `/api` isteklerini `http://localhost:8001`'e yönlendirir.

---

## Harita

- **pigeon-maps** + OpenStreetMap — API key gerektirmez
- Yeşil marker → Stokta
- Kırmızı marker → Stok yok
- Marker tıklama → Ürün detay popup

---

## Tema

Tailwind CSS v4 özelleştirilmiş HSL renk paleti. Dark mode `.dark` class'ı ile aktif olur.

Tema değişkenleri: `src/index.css`
