# Product Locator — Deployment Guide

This guide describes how to host and deploy the complete **Product Locator** application stack (FastAPI Backend + React Frontend + MongoDB) utilizing free-tier hosting options and student cloud credits (such as the **GitHub Student Developer Pack** and **Azure for Students** $100 credits).

---

## Deployment Architecture

```
                      ┌──────────────────────┐
                      │    React Frontend    │
                      │  (Hosted on Vercel)  │
                      └──────────────────────┘
                                  │
                       HTTPS API Requests (CORS)
                                  │
                                  ▼
                      ┌──────────────────────┐
                      │   FastAPI Backend    │
                      │  (Docker on Azure VM │
                      │   or DO Droplet)     │
                      └──────────────────────┘
                                  │
                         Intra-Cloud (TCP)
                                  │
                                  ▼
                      ┌──────────────────────┐
                      │    MongoDB Atlas     │
                      │  (Cloud Free Tier)   │
                      └──────────────────────┘
```

---

## 1. Database Provisioning (MongoDB Atlas)

To preserve performance and keep hosting completely free, we recommend hosting the database on **MongoDB Atlas** (Free Tier M0):

1. Register or log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new organization and project.
3. Click **Create a Cluster** and choose the **M0 Free Tier** (available in AWS, GCP, or Azure regions).
4. In the **Security Quickstart**:
   - Create a database user (e.g., `db_admin`) and copy the password securely.
   - In **IP Access List**, select **Allow Access from Anywhere** (`0.0.0.0/0`) since our cloud servers (Vercel and VM) will need to query the database.
5. Once the cluster is provisioned, click **Connect** → **Drivers** and copy your MongoDB connection string:
   ```
   mongodb+srv://db_admin:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with your database user password and keep this URI safe for environmental configurations.

---

## 2. Backend Deployment (Azure VM or DigitalOcean)

You can spin up a lightweight virtual machine using your **Azure for Students** credits ($100 free credits) or a **DigitalOcean Droplet** (via $200 student pack credits):

### Step A: Provisioning the VM
1. Go to your cloud console (Azure Portal or DigitalOcean Console).
2. Create a new Virtual Machine / Droplet:
   - **OS**: Ubuntu 22.04 LTS (highly stable).
   - **Size**: Standard B1s (1 vCPU, 1GB RAM) on Azure or $4/mo Basic Droplet on DigitalOcean.
   - **Authentication**: SSH Public Key (recommended for security) or secure Password.
3. In inbound port rules, open the following TCP ports:
   - `22` (SSH access)
   - `8001` (FastAPI REST API port)

### Step B: Installing Docker & Environment Setup
Connect to your virtual machine via SSH and execute the following:

```bash
# Update repository lists
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
sudo apt install docker.io docker-compose -y
sudo systemctl enable --now docker

# Clone the repository
git clone <your-repository-url>
cd Product-Locator/backend
```

Configure your environment variables inside `backend/.env`:

```bash
nano .env
```

Paste the following configurations (replacing with your own credentials):

```ini
GEMINI_API_KEY=your_gemini_api_key_here
MONGO_URL=mongodb+srv://db_admin:your_secure_password@cluster0.abcde.mongodb.net
DB_NAME=product_locator
ENV=production
CORS_ORIGINS=["https://your-frontend.vercel.app"]

# Scheduler Defaults (Optional)
SCHEDULER_ENABLED=true
SCHEDULER_CRON_HOUR=3
SCHEDULER_CRON_MINUTE=0
SCHEDULER_INTERVAL_HOURS=0
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

### Step C: Running the Backend
To start the backend securely inside a Docker container:

```bash
# Build and run the backend container in the background
sudo docker-compose up --build -d backend
```

Your API will now be live at: `http://<your-vm-public-ip>:8001`. You can test it by visiting `http://<your-vm-public-ip>:8001/docs` in your browser.

---

## 3. Frontend Deployment (Vercel)

The frontend is served as a static React application, which can be deployed to **Vercel** for free:

1. Register or log in to [Vercel](https://vercel.com) using your GitHub account.
2. Click **Add New** → **Project** and import your cloned `Product-Locator` repository.
3. In **Project Configuration**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
4. Expand **Build and Development Settings**:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. In **Environment Variables** (or edit `frontend/src/api/client.ts` beforehand):
   - If you want to use env parameters, ensure `client.ts` loads your backend VM IP:
     ```typescript
     const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1';
     ```
   - Add VITE_API_URL as an environment variable in Vercel:
     - **Key**: `VITE_API_URL`
     - **Value**: `http://<your-vm-public-ip>:8001/api/v1`
6. Click **Deploy**. Vercel will build your assets and provision a secure global CDN URL (e.g., `https://product-locator.vercel.app`).

---

## 4. Production Security Hardening

To make your CV portfolio look absolutely bulletproof for tech leads:

1. **Enable HTTPS (Nginx SSL)**: You can secure your VM endpoint with Let's Encrypt certificates by routing your API behind Nginx:
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   ```
2. **Setup Domain**: Bind a free domain (e.g., using No-IP or duckdns) to your VM public IP to replace raw IP calls in your frontend client.
3. **Restrict MongoDB Access**: Update MongoDB Atlas IP Access list to only allow your virtual machine's public IP, preventing public access to your database port.

---

## 5. Manual Stock Entry & Notification Service Deployments

### MongoDB / In-Memory (Dual-Mode Design)
The Manual Stock Entry system operates in the `manual_products` collection under MongoDB/Atlas. To keep hosting 100% free, the database acts in **Dual-Mode**, seamlessly falling back to a secure thread-safe In-Memory Cache if MongoDB is unconfigured or offline. Selecting branch coordinates via the interactive **Map Picker** (Pigeon-Maps) runs client-side and requires zero paid Google Maps API keys.

### ReportSystem & Custom Templates & Webhooks
* The Java-based `report-system` microservice is **fully integrated and active by default inside `docker-compose.yml`**, pulling directly from the public Docker Hub registry image `novaity/report-system:latest`.
* **Custom Notification Templates:** The Turkish FreeMarker templates (`in_stock_alert.ftl` and `scraper_alert.ftl`) inside the host `./templates` folder are dynamically mounted into the ReportSystem container's `/app/templates` path. This customizes all alert emails and messages to Turkish out of the box.
* **Webhook Callbacks:** When price drops or stock status transitions are detected, the backend fires real-time HTTP POST JSON payloads to a custom **Webhook URL** configurable inside the Admin settings panel. This enables instant integrations with communication servers like Slack or Discord.
