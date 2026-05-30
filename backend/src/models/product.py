"""
Product Domain Models

Pydantic v2 data models used for API request/response schema validation 
and interactive Swagger UI documentation.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class StockStatus(str, Enum):
    """Product stock status availability enumerator."""
    IN_STOCK = "IN_STOCK"
    OUT_OF_STOCK = "OUT_OF_STOCK"
    LIMITED = "LIMITED"
    UNKNOWN = "UNKNOWN"


class StoreLocation(BaseModel):
    """Retailer store location and regional branch branch details."""

    store_name: str = Field(description="Retail chain brand name (e.g., 'Teknosa', 'Vatan Bilgisayar')")
    city: str = Field(description="City location name (e.g., 'İzmir', 'İstanbul')")
    district: Optional[str] = Field(None, description="District location name (e.g., 'Karşıyaka', 'Bornova')")
    branch: Optional[str] = Field(None, description="Branch store name or mall name (e.g., 'Forum Bornova')")
    address: Optional[str] = Field(None, description="Full explicit address details")
    latitude: Optional[float] = Field(None, description="Latitude coordinate for mapping")
    longitude: Optional[float] = Field(None, description="Longitude coordinate for mapping")


class ProductStock(BaseModel):
    """Product stock availability record at a specific branch."""

    product_name: str = Field(description="Full product title including brand, model, and variants")
    price: Optional[float] = Field(None, description="Product listing price denominated in currency")
    currency: str = Field("TRY", description="Currency symbol (default: TRY)")
    stock_status: StockStatus = Field(description="Current branch stock status indicator")
    store_location: StoreLocation = Field(description="Store branch details where item is located")
    source_url: str = Field(description="Original catalog page URL where source data was scraped")
    last_updated: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp indicating when the branch detail was scraped (UTC)"
    )


class SearchResult(BaseModel):
    """Aggregated catalog query search results containing matching stocks across retailers."""

    query: str = Field(description="The matching keyword search query")
    found_products: List[ProductStock] = Field(
        default=[],
        description="List of matching products currently in stock (max 30)"
    )
    total_found: int = Field(
        default=0,
        description="Total found product count across branches"
    )

