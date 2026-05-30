"""
E2E API Verification Script - Product Locator
Runs in-process HTTP requests to verify all security, validation, and rate limits.
"""
import sys
import os
from fastapi.testclient import TestClient

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import app
from src.config.limiter import limiter
from src.config.store_registry import STORE_CONFIGS

def run_e2e_tests():
    # Patch SearchService to make tests offline and fast
    from src.services.search_service import SearchService
    from src.models.product import SearchResult, ProductStock, StoreLocation, StockStatus

    async def mock_search_products(self, query: str, city=None, district=None):
        return SearchResult(
            query=query,
            found_products=[
                ProductStock(
                    product_name="E2E Mocked iPhone 15 Pro",
                    price=62000.0,
                    currency="TRY",
                    stock_status=StockStatus.IN_STOCK,
                    store_location=StoreLocation(
                        store_name="Vatan Bilgisayar",
                        city="İzmir",
                        district="Konak"
                    ),
                    source_url="http://test-source"
                )
            ],
            total_found=1
        )
    SearchService.search_products = mock_search_products

    print("=" * 70)
    print("   PRODUCT LOCATOR - E2E SECURITY & QA VERIFICATION SCRIPT")
    print("=" * 70)
    
    # Using official FastAPI TestClient wrapper
    with TestClient(app) as client:
        
        # --- TEST 1: HEALTH CHECK ---
        print("\n[TEST 1] GET / (Health Check & Connectivity)")
        response = client.get("/")
        print(f"  -> HTTP Status Code: {response.status_code}")
        print(f"  -> Server Mode: {response.json().get('mode')}")
        print(f"  -> API Version: {response.json().get('version')}")
        assert response.status_code == 200, "Health check failed"
        print("  [PASS] Health check passed.")
        
        # --- TEST 2: SECURITY HEADERS ---
        print("\n[TEST 2] GET / (Checking Secure Headers - TC-SEC-001)")
        headers = response.headers
        required_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Content-Security-Policy": "default-src 'self'"
        }
        for header, expected in required_headers.items():
            val = headers.get(header)
            print(f"  -> {header}: {val}")
            assert val is not None, f"Missing secure header: {header}"
            if "default-src" in expected:
                assert "default-src 'self'" in val
            else:
                assert val == expected
        print("  [PASS] All custom security headers are present and correctly configured.")
        
        # --- TEST 3: INPUT VALIDATION (TOO SHORT) ---
        print("\n[TEST 3] GET /api/v1/search?q=a (Input validation under-limit - TC-VAL-003)")
        response = client.get("/api/v1/search?q=a")
        print(f"  -> HTTP Status Code: {response.status_code}")
        assert response.status_code == 422, "Query of 1 character should be rejected"
        print("  [PASS] Query length < 2 was successfully rejected with HTTP 422.")
        
        # --- TEST 4: INPUT VALIDATION (TOO LONG) ---
        print("\n[TEST 4] GET /api/v1/search?q=[101 chars] (Input validation over-limit - TC-VAL-003)")
        too_long = "x" * 101
        response = client.get(f"/api/v1/search?q={too_long}")
        print(f"  -> HTTP Status Code: {response.status_code}")
        assert response.status_code == 422, "Query of > 100 characters should be rejected"
        print("  [PASS] Query length > 100 was successfully rejected with HTTP 422.")
        
        # --- TEST 5: RATE LIMITING ---
        print("\n[TEST 5] GET /api/v1/search?q=iphone (Rate Limiting check - TC-RAT-002)")
        
        # Reset local limiter memory database to guarantee fresh starts
        limiter.reset()
        
        for i in range(1, 7):
            response = client.get("/api/v1/search?q=iphone")
            print(f"  -> Request #{i}: HTTP Status Code = {response.status_code}")
            if i <= 5:
                assert response.status_code == 200, f"Request #{i} should be allowed (under limit)"
            else:
                assert response.status_code == 429, "Request #6 should be blocked (exceeded limit)"
                print(f"  -> Exceeded Payload: {response.json()}")
        print("  [PASS] Rate Limiting is active. 6th search request successfully blocked with HTTP 429.")
        
        # --- TEST 6: DYNAMIC STORES ADMIN CRUD API ---
        print("\n[TEST 6] Admin Dynamic Stores CRUD API (SaaS Store Management)")
        
        # 6a. List stores
        list_resp = client.get("/api/v1/admin/stores")
        print(f"  -> GET /api/v1/admin/stores: HTTP {list_resp.status_code}, Found {len(list_resp.json())} stores")
        assert list_resp.status_code == 200
        
        # 6b. Add new store
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
        print(f"  -> POST /api/v1/admin/stores: HTTP {add_resp.status_code}")
        assert add_resp.status_code in [200, 201]
        
        # Verify it was added to memory configurations
        assert "e2e_test_store" in STORE_CONFIGS
        print("  -> Store successfully loaded into active scraping memory registry.")
        
        # 6c. Toggle store status
        toggle_resp = client.patch("/api/v1/admin/stores/e2e_test_store/toggle")
        print(f"  -> PATCH /api/v1/admin/stores/e2e_test_store/toggle: HTTP {toggle_resp.status_code}, enabled = {toggle_resp.json().get('enabled')}")
        assert toggle_resp.status_code == 200
        assert toggle_resp.json().get("enabled") is False
        assert STORE_CONFIGS["e2e_test_store"].enabled is False
        
        # 6d. Delete store configuration
        del_resp = client.delete("/api/v1/admin/stores/e2e_test_store")
        print(f"  -> DELETE /api/v1/admin/stores/e2e_test_store: HTTP {del_resp.status_code}")
        assert del_resp.status_code == 200
        assert "e2e_test_store" not in STORE_CONFIGS
        print("  -> Store successfully deleted from registry.")
        
        print("  [PASS] SaaS Dynamic Store Admin CRUD API flows verified successfully.")
        
        print("\n" + "=" * 70)
        print("SUCCESS: ALL SECURITY, VALIDATION, AND DYNAMIC SAAS CHECKS CONFIRMED!")
        print("=" * 70)

if __name__ == "__main__":
    run_e2e_tests()
