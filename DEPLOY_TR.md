# Product Locator — Canlıya Alma (Deployment) Kılavuzu

Bu kılavuz, **Product Locator** uygulamasını (FastAPI Backend + React Frontend + MongoDB) GitHub Student Developer Pack ve Azure Öğrenci Üyeliği ($100 ücretsiz kredi) gibi avantajları kullanarak ücretsiz veya son derece düşük maliyetle nasıl canlı sunuculara (cloud) kurabileceğinizi adım adım açıklar.

---

## Kurulum Mimarisi

```
                      ┌──────────────────────┐
                      │    React Frontend    │
                      │  (Vercel Üzerinde)   │
                      └──────────────────────┘
                                  │
                       HTTPS API İstekleri (CORS)
                                  │
                                  ▼
                      ┌──────────────────────┐
                      │   FastAPI Backend    │
                      │  (Azure VM veya DO   │
                      │  üzerinde Docker)    │
                      └──────────────────────┘
                                  │
                         Bulut İçi Bağlantı
                                  │
                                  ▼
                      ┌──────────────────────┐
                      │    MongoDB Atlas     │
                      │ (Ücretsiz Bulut DB)  │
                      └──────────────────────┘
```

---

## 1. Bulut Veritabanı Kurulumu (MongoDB Atlas)

Performansı korumak ve veritabanı maliyetini tamamen sıfırlamak için veritabanını **MongoDB Atlas** üzerinde (M0 Ücretsiz Planı) barındırmanızı öneririz:

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) adresine kaydolun veya giriş yapın.
2. Yeni bir organizasyon ve proje oluşturun.
3. **Create a Cluster** seçeneğine tıklayın ve **M0 Free Tier** (AWS, GCP veya Azure bölgelerinde mevcuttur) paketini seçin.
4. **Security Quickstart** (Güvenlik Başlangıcı) ayarlarında:
   - Bir veritabanı kullanıcısı (örn: `db_admin`) ve güçlü bir şifre oluşturup kopyalayın.
   - **IP Access List** (IP Erişim Listesi) kısmında, sunucularımızın (Vercel ve VM) veritabanına erişebilmesi için **Allow Access from Anywhere** (`0.0.0.0/0`) seçeneğini etkinleştirin.
5. Kurulum tamamlandığında, Cluster panelinden **Connect** → **Drivers** seçeneğine tıklayarak MongoDB bağlantı adresinizi (Connection String) kopyalayın:
   ```
   mongodb+srv://db_admin:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   ```
6. `<password>` alanını kendi şifrenizle değiştirerek bu adresi çevre değişkenlerinde (environmental variables) kullanmak üzere saklayın.

---

## 2. Backend Sunucu Kurulumu (Azure VM veya DigitalOcean)

**Azure for Students** üyeliğinizdeki 100 dolarlık ücretsiz krediyi kullanarak bir Sanal Makine (Virtual Machine) veya **GitHub Student Developer Pack** kapsamındaki 200 dolarlık DigitalOcean kredisini kullanarak bir Droplet oluşturabilirsiniz:

### Adım A: Sanal Makineyi Oluşturma
1. Bulut konsoluna (Azure Portal veya DigitalOcean Console) giriş yapın.
2. Yeni bir Sanal Makine (Virtual Machine / Droplet) oluşturun:
   - **İşletim Sistemi**: Ubuntu 22.04 LTS (en stabil dağıtım).
   - **Boyut**: Azure'da standart B1s (1 vCPU, 1GB RAM) veya DigitalOcean'da $4/aylık temel paket.
   - **Kimlik Doğrulama**: SSH Anahtarı (güvenlik için önerilir) veya güçlü bir şifre.
3. Gelen bağlantı noktası kurallarından (Inbound Port Rules) şu portları dış dünyaya açın:
   - `22` (SSH terminal bağlantısı)
   - `8001` (FastAPI REST API portumuz)

### Adım B: Docker Kurulumu ve Çevre Değişkenleri
Sanal makinenize SSH üzerinden terminal ile bağlanın ve şu komutları sırasıyla çalıştırın:

```bash
# Sistem paketlerini güncelle
sudo apt update && sudo apt upgrade -y

# Docker ve Docker Compose kurulumunu yap
sudo apt install docker.io docker-compose -y
sudo systemctl enable --now docker

# Repoyu sunucuya klonla
git clone <sizin-repo-adresiniz>
cd Product-Locator/backend
```

Backend çevre değişkenlerini yapılandırmak için `.env` dosyasını oluşturun:

```bash
nano .env
```

Aşağıdaki satırları yapıştırın (kendi şifreleriniz ve anahtarlarınızla güncelleyin):

```ini
GEMINI_API_KEY=gemini_api_keyiniz_buraya
MONGO_URL=mongodb+srv://db_admin:sifreniz@cluster0.abcde.mongodb.net
DB_NAME=product_locator
ENV=production
CORS_ORIGINS=["https://sizin-frontend-adresiniz.vercel.app"]
```

`Ctrl+O`, `Enter`, `Ctrl+X` tuş kombinasyonlarıyla kaydedip çıkın.

### Adım C: Backend'i Docker ile Çalıştırma
API servisinin arka planda kesintisiz çalışması için Docker konteynerini başlatın:

```bash
# Backend Docker konteynerini arka planda (detached) inşa et ve başlat
sudo docker-compose up --build -d backend
```

API sunucunuz artık şu adreste canlıdır: `http://<sunucu-ip-adresiniz>:8001`. Tarayıcınızdan `http://<sunucu-ip-adresiniz>:8001/docs` adresini açarak canlı Swagger dokümantasyonunu test edebilirsiniz.

---

## 3. Frontend Arayüzünün Canlıya Alınması (Vercel)

React statik dosyalar halinde derlendiği için tamamen ücretsiz, limitsiz ve global CDN desteği sunan **Vercel** üzerinde barındırılacaktır:

1. [Vercel](https://vercel.com) adresine GitHub hesabınızla giriş yapın.
2. **Add New** → **Project** yolunu izleyin ve klonladığınız `Product-Locator` reposunu içeri aktarın (import).
3. **Project Configuration** (Proje Ayarları) ekranında:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
4. **Build and Development Settings** ayarlarını genişletin:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Environment Variables** (Çevre Değişkenleri) kısmına gelin:
   - Frontend'in arama isteklerini sunucunuza atabilmesi için şu değişkeni ekleyin:
     - **Key**: `VITE_API_URL`
     - **Value**: `http://<sunucu-ip-adresiniz>:8001/api/v1`
6. **Deploy** butonuna tıklayın. Vercel uygulamanızı saniyeler içinde derleyecek ve size `https://product-locator.vercel.app` gibi güvenli (HTTPS) bir canlı URL tanımlayacaktır.

---

## 4. Üretim Ortamı (Production) Güvenlik Sıkılaştırması

Canlıya aldığınız projenin CV değerini artıracak profesyonel adımlar:

1. **HTTPS (Nginx SSL) Yapılandırması**: Sunucunuza atılan HTTP isteklerini şifrelemek ve yeşil kilit ikonu almak için Certbot ve Nginx kurarak SSL sertifikası tanımlayabilirsiniz:
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   ```
2. **Ücretsiz Alan Adı**: duckdns veya No-IP gibi servislerden ücretsiz bir alt alan adı alarak API isteklerindeki ham IP adresini bir domain ile değiştirebilirsiniz.
3. **MongoDB IP Sınırlaması**: MongoDB Atlas panelindeki IP erişim listesinden `0.0.0.0/0` yerine yalnızca sanal sunucunuzun (VM) IP adresini ekleyerek, veritabanına dışarıdan gelebilecek tüm siber saldırı kapılarını kilitleyebilirsiniz.

---

## 5. Manuel Stok Girişi & Raporlama Mikroservis Tercihleri

### MongoDB / In-Memory (Çift Modlu Çalışma)
Manuel Stok Girişi sistemi MongoDB Atlas veya yerel MongoDB üzerinde `manual_products` koleksiyonunda saklanır. Ancak canlı sunucu maliyetlerinizi sıfırlamak isterseniz, veritabanı kurmadan bile uygulama **Dual-Mode** sayesinde bellekte (In-Memory) çalışmaya devam eder. Ürün girişi yaparken koordinatlar için entegre Pigeon-Maps **Map Picker** (Harita Seçici) harici bir API key gerektirmediğinden anında çalışır.

### ReportSystem & Custom Şablonları & Webhooks
* Java tabanlı `report-system` mikroservisi, **`docker-compose.yml` dosyası içerisinde doğrudan Docker Hub üzerindeki resmi `novaity/report-system:latest` imajından çekilecek şekilde tanımlanmıştır**.
* **Özel Bildirim Şablonları:** Host makinenizdeki `./templates` dizininde yer alan Türkçe FreeMarker şablonları (`in_stock_alert.ftl` ve `scraper_alert.ftl`), volume mount aracılığıyla ReportSystem konteyneri içerisine (`/app/templates`) dinamik olarak bağlanır. Bu sayede bildirim e-postaları ve mesajları anında Türkçe olarak özelleştirilmiş şekilde iletilir.
* **Webhook Desteği:** Fiyat veya stok değişimlerinde, admin panelinden ayarlayabileceğiniz **Webhook URL**'sine gerçek zamanlı HTTP POST JSON payload'ı fırlatılır. Bu sayede sistemi Slack, Discord veya harici diğer otomasyon botlarıyla kolayca entegre edebilirsiniz.
