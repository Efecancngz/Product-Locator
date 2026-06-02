"""
Watchlist Models
Pydantic schemas for user-followed product stock/price alerts.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class WatchlistItemCreate(BaseModel):
    """Schema for adding a product to the user followed watchlist."""
    product_name: str = Field(
        ...,
        min_length=2,
        max_length=300,
        description="Full name of the watchlisted product"
    )
    category: str = Field(
        "all",
        description="Category classification"
    )
    city: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="City location name"
    )
    district: Optional[str] = Field(
        None,
        max_length=100,
        description="Optional district filter"
    )
    store_name: str = Field(
        ...,
        description="E-commerce retailer or physical store name"
    )
    branch: Optional[str] = Field(
        None,
        description="Optional branch store location"
    )
    price: Optional[float] = Field(
        None,
        ge=0,
        description="Followed price or baseline price"
    )
    currency: str = Field(
        "TRY",
        description="Currency code (default: TRY)"
    )
    source_url: str = Field(
        ...,
        description="Scraped catalog detail page or manual registry URL reference"
    )
    notifications_enabled: bool = Field(
        True,
        description="Whether email/Telegram notifications are active for this item"
    )


class WatchlistItemUpdate(BaseModel):
    """Schema for updating notifications settings or last checked values for a watchlisted item."""
    notifications_enabled: Optional[bool] = None
    price: Optional[float] = None
    last_stock_status: Optional[str] = None
    last_price: Optional[float] = None


class WatchlistItemResponse(BaseModel):
    """Schema for returning followed watchlist records."""
    id: str = Field(description="Unique watchlist item ID")
    user_id: str = Field(description="Firebase or Dev User ID")
    product_name: str
    category: str = "all"
    city: str
    district: Optional[str] = None
    store_name: str
    branch: Optional[str] = None
    price: Optional[float] = None
    currency: str = "TRY"
    source_url: str
    notifications_enabled: bool = True
    last_stock_status: str = "UNKNOWN"
    last_price: Optional[float] = None
    created_at: datetime
    updated_at: datetime


class WatchlistResponse(BaseModel):
    """Response containing list of followed watchlist items."""
    items: List[WatchlistItemResponse]
    total: int
