"""
Store Config Models
Pydantic schemas for dynamic e-commerce store registration and selector configuration.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict
from src.config.store_registry import StoreCategory

class SelectorConfig(BaseModel):
    """Optional CSS selectors for custom fallback scraper parsing."""
    product_container: str = Field(description="CSS selector for product card container (e.g. '.product-card')")
    product_name: str = Field(description="CSS selector for product title/name (e.g. 'h3.title')")
    product_price: str = Field(description="CSS selector for product price (e.g. '.price-value')")
    product_image: Optional[str] = Field(None, description="Optional CSS selector for product image")
    stock_indicator: Optional[str] = Field(None, description="Optional CSS selector for stock status")

class StoreConfigModel(BaseModel):
    """Pydantic model representing a dynamically managed retail store configuration."""
    key: str = Field(
        ..., 
        min_length=2, 
        max_length=50, 
        description="Unique identifier key for the store (e.g. 'teknosa')"
    )
    name: str = Field(
        ..., 
        min_length=2, 
        max_length=100, 
        description="Public display name of the store chain (e.g. 'Teknosa')"
    )
    domain: str = Field(
        ..., 
        min_length=3, 
        max_length=100, 
        description="Root domain name of the store (e.g. 'teknosa.com')"
    )
    search_url_template: str = Field(
        ..., 
        min_length=10, 
        max_length=500, 
        description="Search URL pattern utilizing '{query}' placeholder (e.g. 'https://www.teknosa.com/arama/?s={query}')"
    )
    category: StoreCategory = Field(
        ..., 
        description="Sector category of the retail store (electronics, clothing, etc.)"
    )
    enabled: bool = Field(
        default=True, 
        description="Toggle status of the store in background scraping orchestrations"
    )
    selectors: Optional[SelectorConfig] = Field(
        default=None, 
        description="Optional custom CSS parsing selectors for fallback BeautifulSoup parser"
    )
