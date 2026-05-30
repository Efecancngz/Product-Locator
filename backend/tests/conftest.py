import sys
import os
import pytest
from fastapi.testclient import TestClient

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import app
from src.services.search_service import SearchService
from src.models.product import SearchResult, ProductStock, StoreLocation, StockStatus

@pytest.fixture(scope="module")
def client():
    """Provides a FastAPI TestClient for integration tests."""
    with TestClient(app) as c:
        yield c

@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Resets the rate limiter storage before each test to ensure test isolation."""
    from src.config.limiter import limiter
    try:
        limiter.reset()
    except Exception:
        try:
            limiter._limiter.storage.reset()
        except Exception:
            pass


@pytest.fixture
def mock_products():
    """Provides standard mock product results for unit and integration testing."""
    return [
        ProductStock(
            product_name="Mock Product Pro 128GB",
            price=35000.0,
            currency="TRY",
            stock_status=StockStatus.IN_STOCK,
            store_location=StoreLocation(
                store_name="Vatan Bilgisayar",
                city="İzmir",
                district="Konak",
                branch="Konak Vatan",
                address="Konak Mh. İzmir",
                latitude=38.418,
                longitude=27.128
            ),
            source_url="https://vatanbilgisayar.com/mock-product"
        )
    ]

@pytest.fixture
def patch_search_service(monkeypatch, mock_products):
    """Monkeys patches SearchService.search_products to avoid actual web scraping and AI calls."""
    async def mock_search_products(self, query: str, city=None, district=None):
        if len(query) < 2 or len(query) > 100:
            raise ValueError("Invalid query size")
        
        # Simulates filtering by city/district in mockup data
        filtered = []
        for p in mock_products:
            if city and city.lower() not in p.store_location.city.lower():
                continue
            if district and district.lower() not in p.store_location.district.lower():
                continue
            filtered.append(p)
            
        return SearchResult(
            query=query,
            found_products=filtered,
            total_found=len(filtered)
        )
    
    monkeypatch.setattr(SearchService, "search_products", mock_search_products)
