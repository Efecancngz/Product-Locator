from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Product Locator"
    ENV: str = "dev"
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # Database
    MONGO_URL: str = "mongodb://localhost:27017"
    DB_NAME: str = "product_locator"

    # AI / API Keys
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    SERP_API_KEY: str = ""  # For Google Search (serpapi.com)

    # ReportSystem Integration
    REPORT_SYSTEM_URL: str = "http://localhost:8080"

    # Report Settings fallback from Environment
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: str = "587"
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    WEBHOOK_URL: str = ""

    # Redis Cache
    REDIS_URL: str = "redis://localhost:6379"

    # Firebase Authentication
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_CREDENTIALS_PATH: str = ""  # Optional: path to service account JSON

    # Scheduler (APScheduler)
    SCHEDULER_ENABLED: bool = True
    SCHEDULER_CRON_HOUR: int = 3      # Default: 03:00 UTC (06:00 TR)
    SCHEDULER_CRON_MINUTE: int = 0
    SCHEDULER_INTERVAL_HOURS: int = 0  # 0 = cron mode, >0 = interval mode (hours)

    class Config:
        env_file = ".env"

settings = Settings()
