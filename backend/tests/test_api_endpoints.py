import pytest
from fastapi import status
from src.config.store_registry import STORE_CONFIGS
from src.config.limiter import limiter

def test_api_health_check(client):
    """
    Objective: Verify health check returns status code 200 and basic API details.
    """
    response = client.get("/")
    assert response.status_code == 200
    assert response.json().get("mode") is not None
    assert response.json().get("version") is not None

def test_api_security_headers(client):
    """
    Objective: Verify presence and correctness of security headers in health endpoint.
    """
    response = client.get("/")
    headers = response.headers
    required_headers = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Content-Security-Policy": "default-src 'self'"
    }
    for header, expected in required_headers.items():
        val = headers.get(header)
        assert val is not None, f"Missing secure header: {header}"
        if "default-src" in expected:
            assert "default-src 'self'" in val
        else:
            assert val == expected

def test_api_input_validation_too_short(client, patch_search_service):
    """
    Objective: Verify query length under 2 characters is rejected with 422.
    """
    response = client.get("/api/v1/search?q=a")
    assert response.status_code == 422

def test_api_input_validation_too_long(client, patch_search_service):
    """
    Objective: Verify query length over 100 characters is rejected with 422.
    """
    too_long = "x" * 101
    response = client.get(f"/api/v1/search?q={too_long}")
    assert response.status_code == 422

def test_api_rate_limiting(client, patch_search_service):
    """
    Objective: Verify that 6th request triggers rate limiter (HTTP 429).
    """
    # Reset limiter storage
    try:
        limiter.reset()
    except Exception:
        try:
            limiter._limiter.storage.reset()
        except Exception:
            pass
            
    for i in range(1, 7):
        response = client.get("/api/v1/search?q=iphone")
        if i <= 5:
            assert response.status_code == 200
        else:
            assert response.status_code == 429

def test_api_dynamic_stores_crud(client):
    """
    Objective: Verify listing, adding, toggling, and deleting store configurations.
    """
    # 1. List stores
    list_resp = client.get("/api/v1/admin/stores")
    assert list_resp.status_code == 200
    
    # 2. Add new store
    custom_store = {
        "key": "e2e_test_store",
        "name": "E2E Test Store",
        "domain": "e2etest.com",
        "search_url_template": "https://www.e2etest.com/search?q={query}",
        "category": "cosmetics",
        "enabled": True,
        "selectors": {
            "product_container": ".product-card",
            "product_name": "h3",
            "product_price": ".price"
        }
    }
    add_resp = client.post("/api/v1/admin/stores", json=custom_store)
    assert add_resp.status_code in [200, 201]
    assert "e2e_test_store" in STORE_CONFIGS
    
    # 3. Toggle store status
    toggle_resp = client.patch("/api/v1/admin/stores/e2e_test_store/toggle")
    assert toggle_resp.status_code == 200
    assert toggle_resp.json().get("enabled") is False
    assert STORE_CONFIGS["e2e_test_store"].enabled is False
    
    # 4. Delete store configuration
    del_resp = client.delete("/api/v1/admin/stores/e2e_test_store")
    assert del_resp.status_code == 200
    assert "e2e_test_store" not in STORE_CONFIGS
