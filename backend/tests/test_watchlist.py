import pytest
from fastapi import status
from unittest.mock import AsyncMock, patch
from src.services.db_service import db_service
from src.services.search_service import SearchService
from src.models.product import SearchResult, ProductStock, StoreLocation, StockStatus

@pytest.mark.asyncio
async def test_watchlist_crud_lifecycle(client):
    """
    Objective: Verify complete lifecycle of user watchlist entries:
               Create -> List -> Toggle -> Delete
    """
    # 1. Add item to watchlist
    watchlist_item = {
        "product_name": "Watchlist Test iPhone 15 Pro",
        "category": "electronics",
        "city": "İzmir",
        "district": "Bornova",
        "store_name": "Test Store",
        "branch": "Test Branch",
        "price": 60000.0,
        "currency": "TRY",
        "source_url": "https://www.example.com/test-iphone-15",
        "notifications_enabled": True
    }
    
    response = client.post("/api/v1/watchlist", json=watchlist_item)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["product_name"] == "Watchlist Test iPhone 15 Pro"
    assert data["notifications_enabled"] is True
    item_id = data["id"]
    
    # 2. List watchlist items
    list_response = client.get("/api/v1/watchlist")
    assert list_response.status_code == status.HTTP_200_OK
    list_data = list_response.json()
    assert list_data["total"] >= 1
    assert any(item["id"] == item_id for item in list_data["items"])
    
    # 3. Toggle notifications status
    toggle_response = client.patch(f"/api/v1/watchlist/{item_id}/toggle?enabled=false")
    assert toggle_response.status_code == status.HTTP_200_OK
    assert toggle_response.json()["notifications_enabled"] is False
    
    # Verify toggle update in get
    db_item = await db_service.get_watchlist_item_by_id(item_id)
    assert db_item["notifications_enabled"] is False
    
    # 4. Remove from watchlist
    delete_response = client.delete(f"/api/v1/watchlist/{item_id}")
    assert delete_response.status_code == status.HTTP_200_OK
    
    # Verify it is deleted
    list_after_delete = client.get("/api/v1/watchlist")
    assert not any(item["id"] == item_id for item in list_after_delete.json()["items"])


def test_watchlist_create_validation_errors(client):
    """
    Objective: Verify invalid inputs are rejected with 422 Unprocessable Entity.
    """
    # Product name is too short (min_length=2)
    invalid_item_1 = {
        "product_name": "x",
        "city": "İzmir",
        "store_name": "Test Store",
        "source_url": "http://example.com"
    }
    response = client.post("/api/v1/watchlist", json=invalid_item_1)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Negative price
    invalid_item_2 = {
        "product_name": "iPhone 15 Pro",
        "city": "İzmir",
        "store_name": "Test Store",
        "price": -100.0,
        "source_url": "http://example.com"
    }
    response = client.post("/api/v1/watchlist", json=invalid_item_2)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Missing required city
    invalid_item_3 = {
        "product_name": "iPhone 15 Pro",
        "store_name": "Test Store",
        "source_url": "http://example.com"
    }
    response = client.post("/api/v1/watchlist", json=invalid_item_3)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_watchlist_toggle_nonexistent(client):
    """
    Objective: Verify patching toggle on a nonexistent item returns 404.
    """
    # 24-character hex or string is standard for MongoDB ObjectIds, or short UUID for In-memory
    response = client.patch("/api/v1/watchlist/nonexistent-id-12345/toggle?enabled=true")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_watchlist_delete_nonexistent(client):
    """
    Objective: Verify deleting a nonexistent item returns 404.
    """
    response = client.delete("/api/v1/watchlist/nonexistent-id-12345")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.asyncio
async def test_watchlist_check_alerts_detection(client, monkeypatch):
    """
    Objective: Verify that watchlist scan checks detect stock status transitions and price drops.
    """
    # Clean up watchlist cache
    if hasattr(db_service, '_watchlist_cache'):
        db_service._watchlist_cache = []

    # 1. Add an item previously "OUT_OF_STOCK" to DB directly to simulate initial state
    item_id_1 = await db_service.add_to_watchlist("dev-user", {
        "product_name": "Alert Test Product 1",
        "category": "electronics",
        "city": "İzmir",
        "store_name": "Alert Store 1",
        "branch": "Alert Branch 1",
        "price": 1000.0,
        "source_url": "http://example.com/item1",
        "notifications_enabled": True,
        "last_stock_status": "OUT_OF_STOCK",
        "last_price": 1000.0
    })

    # 2. Add an item with notification disabled to verify it is NOT triggered
    item_id_2 = await db_service.add_to_watchlist("dev-user", {
        "product_name": "Alert Test Product 2",
        "category": "electronics",
        "city": "İzmir",
        "store_name": "Alert Store 2",
        "branch": "Alert Branch 2",
        "price": 2000.0,
        "source_url": "http://example.com/item2",
        "notifications_enabled": False,
        "last_stock_status": "OUT_OF_STOCK",
        "last_price": 2000.0
    })

    # 3. Add an item previously "IN_STOCK" that now experiences a price drop
    item_id_3 = await db_service.add_to_watchlist("dev-user", {
        "product_name": "Alert Test Product 3",
        "category": "electronics",
        "city": "İzmir",
        "store_name": "Alert Store 3",
        "branch": "Alert Branch 3",
        "price": 3000.0,
        "source_url": "http://example.com/item3",
        "notifications_enabled": True,
        "last_stock_status": "IN_STOCK",
        "last_price": 3000.0
    })

    # Mock the SearchService.search_products to return:
    # - Product 1: IN_STOCK at Alert Store 1 / Alert Branch 1 (triggers Stock Alert)
    # - Product 2: IN_STOCK at Alert Store 2 / Alert Branch 2 (should not trigger alert because notifications_enabled=False)
    # - Product 3: IN_STOCK at Alert Store 3 / Alert Branch 3, price 2500 (triggers Price Drop Alert)
    async def mock_search_products(self, query: str, city=None, district=None, category=None):
        found = []
        if "Product 1" in query:
            found.append(ProductStock(
                product_name="Alert Test Product 1",
                price=1000.0,
                currency="TRY",
                stock_status=StockStatus.IN_STOCK,
                store_location=StoreLocation(
                    store_name="Alert Store 1",
                    city="İzmir",
                    branch="Alert Branch 1"
                ),
                source_url="http://example.com/item1"
            ))
        elif "Product 2" in query:
            found.append(ProductStock(
                product_name="Alert Test Product 2",
                price=2000.0,
                currency="TRY",
                stock_status=StockStatus.IN_STOCK,
                store_location=StoreLocation(
                    store_name="Alert Store 2",
                    city="İzmir",
                    branch="Alert Branch 2"
                ),
                source_url="http://example.com/item2"
            ))
        elif "Product 3" in query:
            found.append(ProductStock(
                product_name="Alert Test Product 3",
                price=2500.0,  # Lower than 3000
                currency="TRY",
                stock_status=StockStatus.IN_STOCK,
                store_location=StoreLocation(
                    store_name="Alert Store 3",
                    city="İzmir",
                    branch="Alert Branch 3"
                ),
                source_url="http://example.com/item3"
            ))
        
        return SearchResult(
            query=query,
            found_products=found,
            total_found=len(found)
        )

    monkeypatch.setattr(SearchService, "search_products", mock_search_products)

    # Mock the ReportService methods to prevent sending real SMTP/Telegram requests during tests
    from src.services.report_service import ReportService
    async def mock_send_in_stock_alert(*args, **kwargs):
        return {"status": "success", "channels": ["mocked"]}
    
    monkeypatch.setattr(ReportService, "send_in_stock_alert", mock_send_in_stock_alert)

    # Call the alert check endpoint
    response = client.post("/api/v1/watchlist/check")
    assert response.status_code == status.HTTP_200_OK
    
    results = response.json()["results"]
    assert len(results) == 3
    
    # Analyze trigger results
    res_1 = next(r for r in results if r["product_name"] == "Alert Test Product 1")
    assert res_1["alert_triggered"] is True
    assert "Stok Geldi" in res_1["reason"]

    res_2 = next(r for r in results if r["product_name"] == "Alert Test Product 2")
    # Alert should not trigger because notifications_enabled is False
    assert res_2["alert_triggered"] is False

    res_3 = next(r for r in results if r["product_name"] == "Alert Test Product 3")
    assert res_3["alert_triggered"] is True
    assert "Fiyat Düştü" in res_3["reason"]

    # Verify updated values in db
    db_1 = await db_service.get_watchlist_item_by_id(item_id_1)
    assert db_1["last_stock_status"] == "IN_STOCK"

    db_3 = await db_service.get_watchlist_item_by_id(item_id_3)
    assert db_3["last_price"] == 2500.0


@pytest.mark.asyncio
async def test_watchlist_webhook_dispatch(client, monkeypatch):
    """
    Objective: Verify that custom webhook POST dispatches correctly with the correct payload during alert checks.
    """
    # Clean up watchlist cache
    if hasattr(db_service, '_watchlist_cache'):
        db_service._watchlist_cache = []

    # Configure report settings mock to return a custom webhook URL
    from src.routes import admin
    async def mock_get_report_settings():
        return {
            "webhook_url": "https://httpbin.org/post",
            "telegram_bot_token": None,
            "telegram_chat_id": None,
            "smtp_username": None
        }
    monkeypatch.setattr(admin, "get_report_settings", mock_get_report_settings)

    # Add item previously "OUT_OF_STOCK"
    item_id = await db_service.add_to_watchlist("dev-user", {
        "product_name": "Webhook Test Product",
        "category": "all",
        "city": "İzmir",
        "store_name": "Webhook Store",
        "branch": "Webhook Branch",
        "price": 5000.0,
        "source_url": "http://example.com/webhook",
        "notifications_enabled": True,
        "last_stock_status": "OUT_OF_STOCK",
        "last_price": 5000.0
    })

    # Mock search service to return IN_STOCK (triggering alert)
    async def mock_search_products(self, query: str, city=None, district=None, category=None):
        return SearchResult(
            query=query,
            found_products=[
                ProductStock(
                    product_name="Webhook Test Product",
                    price=5000.0,
                    currency="TRY",
                    stock_status=StockStatus.IN_STOCK,
                    store_location=StoreLocation(
                        store_name="Webhook Store",
                        city="İzmir",
                        branch="Webhook Branch"
                    ),
                    source_url="http://example.com/webhook"
                )
            ],
            total_found=1
        )
    monkeypatch.setattr(SearchService, "search_products", mock_search_products)

    # Mock the ReportService alert function
    from src.services.report_service import ReportService
    async def mock_send_in_stock_alert(*args, **kwargs):
        return {"status": "success", "channels": []}
    monkeypatch.setattr(ReportService, "send_in_stock_alert", mock_send_in_stock_alert)

    # Capture the webhook POST request parameters
    captured_payloads = []
    class MockResponse:
        def __init__(self, status_code, text):
            self.status_code = status_code
            self.text = text

    import httpx
    async def mock_post(self, url, json=None, *args, **kwargs):
        captured_payloads.append((url, json))
        return MockResponse(200, "OK")
    
    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    # Run check
    response = client.post("/api/v1/watchlist/check")
    assert response.status_code == status.HTTP_200_OK

    # Assert webhook was called
    assert len(captured_payloads) == 1
    url, json_payload = captured_payloads[0]
    assert url == "https://httpbin.org/post"
    assert json_payload["event"] == "watchlist_alert"
    assert json_payload["reason"] == "Stok Geldi (In Stock)"
    assert json_payload["product_name"] == "Webhook Test Product"
    assert json_payload["store_name"] == "Webhook Store"
    assert json_payload["branch"] == "Webhook Branch"
    assert json_payload["current_stock"] == "IN_STOCK"
    assert json_payload["prev_stock"] == "OUT_OF_STOCK"
