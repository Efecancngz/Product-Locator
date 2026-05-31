"""
Manual Product Models
Pydantic schemas for manually entered product stock data.
Used by deployers who partner with stores that don't have websites.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from src.config.store_registry import StoreCategory


class ManualProductCreate(BaseModel):
    """Schema for creating a new manual product entry."""
    product_name: str = Field(
        ...,
        min_length=2,
        max_length=300,
        description="Full product title (e.g., 'iPhone 15 Pro 256GB Siyah')"
    )
    price: Optional[float] = Field(
        None,
        ge=0,
        description="Product listing price (e.g., 74999.00)"
    )
    currency: str = Field(
        "TRY",
        description="Currency code (default: TRY)"
    )
    category: StoreCategory = Field(
        ...,
        description="Product category (electronics, clothing, sports, cosmetics, appliances)"
    )
    store_name: str = Field(
        ...,
        min_length=2,
        max_length=200,
        description="Physical store name (e.g., 'Akman Elektronik')"
    )
    branch: str = Field(
        "",
        max_length=200,
        description="Branch name or location label (e.g., 'Bornova Şubesi')"
    )
    city: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="City name (e.g., 'İzmir')"
    )
    district: Optional[str] = Field(
        None,
        max_length=100,
        description="District name (e.g., 'Bornova')"
    )
    address: Optional[str] = Field(
        None,
        max_length=500,
        description="Full street address"
    )
    latitude: Optional[float] = Field(
        None,
        ge=-90,
        le=90,
        description="Latitude coordinate from map picker"
    )
    longitude: Optional[float] = Field(
        None,
        ge=-180,
        le=180,
        description="Longitude coordinate from map picker"
    )
    in_stock: bool = Field(
        True,
        description="Whether the product is currently in stock"
    )
    notes: Optional[str] = Field(
        None,
        max_length=1000,
        description="Optional notes about the product or store"
    )


class ManualProductUpdate(BaseModel):
    """Schema for updating an existing manual product entry. All fields optional."""
    product_name: Optional[str] = Field(None, min_length=2, max_length=300)
    price: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = None
    category: Optional[StoreCategory] = None
    store_name: Optional[str] = Field(None, min_length=2, max_length=200)
    branch: Optional[str] = Field(None, max_length=200)
    city: Optional[str] = Field(None, min_length=2, max_length=100)
    district: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = Field(None, max_length=500)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    in_stock: Optional[bool] = None
    notes: Optional[str] = Field(None, max_length=1000)


class ManualProductResponse(BaseModel):
    """Schema for returning a manual product entry."""
    id: str = Field(description="Unique product ID")
    product_name: str
    price: Optional[float] = None
    currency: str = "TRY"
    category: str
    store_name: str
    branch: str = ""
    city: str
    district: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    in_stock: bool = True
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: str = "admin"


class ManualProductListResponse(BaseModel):
    """Paginated response for manual product listing."""
    products: List[ManualProductResponse]
    total: int
    page: int
    per_page: int
