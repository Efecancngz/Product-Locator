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

    class Config:
        env_file = ".env"

settings = Settings()
