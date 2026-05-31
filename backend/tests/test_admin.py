import pytest
from fastapi import status
from src.config.store_registry import STORE_CONFIGS

def test_admin_list_stores(client):
    """
    Objective: Verify listing all e-commerce stores from the admin endpoint.
    """
    response = client.get("/api/v1/admin/stores")
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert len(data) > 0
    # Every returned store must have a valid category and name
    assert "key" in data[0]
    assert "name" in data[0]
    assert "category" in data[0]

def test_admin_store_crud_lifecycle(client):
    """
    Objective: Verify complete lifecycle of store configuration:
               Create -> Get -> Toggle -> Update -> Delete
    """
    # 1. CREATE CUSTOM STORE
    custom_store = {
        "key": "test_store",
        "name": "Test Retail Store",
        "domain": "teststore.com",
        "search_url_template": "https://www.teststore.com/search?q={query}",
        "category": "electronics",
        "enabled": True,
        "selectors": {
            "product_container": ".card",
            "product_name": "h2.title",
            "product_price": ".price"
        }
    }
    
    create_response = client.post("/api/v1/admin/stores", json=custom_store)
    assert create_response.status_code == status.HTTP_201_CREATED or create_response.status_code == status.HTTP_200_OK
    assert create_response.json()["store"]["key"] == "test_store"
    assert "test_store" in STORE_CONFIGS
    
    # 2. GET SINGLE STORE
    get_response = client.get("/api/v1/admin/stores/test_store")
    assert get_response.status_code == status.HTTP_200_OK
    assert get_response.json()["name"] == "Test Retail Store"
    assert get_response.json()["selectors"]["product_name"] == "h2.title"
    
    # 3. TOGGLE STORE
    toggle_response = client.patch("/api/v1/admin/stores/test_store/toggle")
    assert toggle_response.status_code == status.HTTP_200_OK
    assert toggle_response.json()["enabled"] is False
    assert STORE_CONFIGS["test_store"].enabled is False
    
    # 4. DELETE STORE
    delete_response = client.delete("/api/v1/admin/stores/test_store")
    assert delete_response.status_code == status.HTTP_200_OK
    assert "test_store" not in STORE_CONFIGS
    
    # Verify it is deleted from API
    get_after_delete = client.get("/api/v1/admin/stores/test_store")
    assert get_after_delete.status_code == status.HTTP_404_NOT_FOUND

def test_admin_create_invalid_store(client):
    """
    Objective: Verify invalid Pydantic schemas are rejected with HTTP 422.
    """
    invalid_store = {
        "key": "x",  # Too short (min 2)
        "name": "Invalid",
        "domain": "inv",
        "search_url_template": "short", # Too short (min 10)
        "category": "not-a-valid-category" # Invalid enum category
    }
    response = client.post("/api/v1/admin/stores", json=invalid_store)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_admin_manual_product_crud_lifecycle(client):
    """
    Objective: Verify complete lifecycle of manual product entries:
               Create -> List -> Get -> Update -> Delete
    """
    # 1. CREATE MANUAL PRODUCT
    new_product = {
        "product_name": "Test iPhone 15 Pro",
        "price": 60000.00,
        "currency": "TRY",
        "category": "electronics",
        "store_name": "Test Esnaf",
        "branch": "Merkez Şube",
        "city": "İzmir",
        "district": "Bornova",
        "address": "Sanayi Cad. No: 10",
        "latitude": 38.4628,
        "longitude": 27.2199,
        "in_stock": True,
        "notes": "Test entry notes"
    }

    create_response = client.post("/api/v1/admin/manual-products", json=new_product)
    assert create_response.status_code == status.HTTP_201_CREATED
    product_data = create_response.json()
    assert product_data["product_name"] == "Test iPhone 15 Pro"
    assert "id" in product_data
    product_id = product_data["id"]

    # 2. LIST MANUAL PRODUCTS WITH FILTERS
    list_response = client.get("/api/v1/admin/manual-products?city=İzmir&category=electronics")
    assert list_response.status_code == status.HTTP_200_OK
    list_data = list_response.json()
    assert list_data["total"] >= 1
    assert any(p["id"] == product_id for p in list_data["products"])

    # 3. GET SINGLE MANUAL PRODUCT
    get_response = client.get(f"/api/v1/admin/manual-products/{product_id}")
    assert get_response.status_code == status.HTTP_200_OK
    assert get_response.json()["product_name"] == "Test iPhone 15 Pro"

    # 4. UPDATE MANUAL PRODUCT
    update_payload = {
        "price": 62000.00,
        "in_stock": False
    }
    update_response = client.put(f"/api/v1/admin/manual-products/{product_id}", json=update_payload)
    assert update_response.status_code == status.HTTP_200_OK
    assert update_response.json()["price"] == 62000.00
    assert update_response.json()["in_stock"] is False

    # 5. DELETE MANUAL PRODUCT
    delete_response = client.delete(f"/api/v1/admin/manual-products/{product_id}")
    assert delete_response.status_code == status.HTTP_200_OK
    assert delete_response.json()["id"] == product_id

    # Verify it is deleted from API
    get_after_delete = client.get(f"/api/v1/admin/manual-products/{product_id}")
    assert get_after_delete.status_code == status.HTTP_404_NOT_FOUND


def test_admin_manual_product_bulk_create(client):
    """
    Objective: Verify bulk import of manual product entries.
    """
    bulk_payload = [
        {
            "product_name": "Bulk Product A",
            "price": 1000.00,
            "category": "sports",
            "store_name": "Bulk Store",
            "city": "Ankara"
        },
        {
            "product_name": "Bulk Product B",
            "price": 2000.00,
            "category": "cosmetics",
            "store_name": "Bulk Store",
            "city": "İstanbul"
        }
    ]

    bulk_response = client.post("/api/v1/admin/manual-products/bulk", json=bulk_payload)
    assert bulk_response.status_code == status.HTTP_200_OK
    bulk_data = bulk_response.json()
    assert bulk_data["imported_count"] == 2
    assert bulk_data["total_count"] == 2

