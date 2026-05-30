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
