"""
Export API Tests — Faz 5

Tests for Excel and PDF export endpoints.
"""
import pytest
from fastapi.testclient import TestClient


class TestExportEndpoints:
    """Test suite for the /export/* API endpoints."""

    # --- Test 1: Excel export for stores ---
    def test_export_stores_excel(self, client: TestClient):
        response = client.get("/api/v1/export/stores?format=excel")
        assert response.status_code == 200
        assert "spreadsheetml" in response.headers.get("content-type", "")
        assert response.headers.get("content-disposition") is not None
        assert "magaza_listesi" in response.headers.get("content-disposition", "")
        # Verify it has content (xlsx magic bytes)
        assert len(response.content) > 100

    # --- Test 2: PDF export for stores ---
    def test_export_stores_pdf(self, client: TestClient):
        response = client.get("/api/v1/export/stores?format=pdf")
        assert response.status_code == 200
        assert "pdf" in response.headers.get("content-type", "")
        # PDF files start with %PDF
        assert response.content[:4] == b"%PDF"

    # --- Test 3: Excel export for search results (POST) ---
    def test_export_search_results_excel(self, client: TestClient):
        payload = {
            "query": "iPhone 15 Pro",
            "items": [
                {
                    "product_name": "iPhone 15 Pro 256GB",
                    "price": 74999.0,
                    "currency": "TRY",
                    "stock_status": "IN_STOCK",
                    "store_name": "Teknosa",
                    "city": "İstanbul",
                    "district": "Kadıköy",
                    "branch": "Capitol AVM",
                    "source_url": "https://teknosa.com/iphone-15-pro"
                },
                {
                    "product_name": "iPhone 15 Pro Max 512GB",
                    "price": 89999.0,
                    "currency": "TRY",
                    "stock_status": "LIMITED",
                    "store_name": "Vatan Bilgisayar",
                    "city": "İzmir",
                    "district": "Konak",
                    "branch": "Konak Vatan",
                    "source_url": "https://vatanbilgisayar.com/iphone-15-pro-max"
                }
            ]
        }
        response = client.post("/api/v1/export/search-results?format=excel", json=payload)
        assert response.status_code == 200
        assert "spreadsheetml" in response.headers.get("content-type", "")
        assert len(response.content) > 100

    # --- Test 4: PDF export for search results (POST) ---
    def test_export_search_results_pdf(self, client: TestClient):
        payload = {
            "query": "Samsung Galaxy S24",
            "items": [
                {
                    "product_name": "Samsung Galaxy S24 Ultra",
                    "price": 64999.0,
                    "currency": "TRY",
                    "stock_status": "IN_STOCK",
                    "store_name": "MediaMarkt",
                    "city": "Ankara",
                    "district": "Çankaya",
                    "branch": "Armada AVM",
                    "source_url": "https://mediamarkt.com.tr/galaxy-s24"
                }
            ]
        }
        response = client.post("/api/v1/export/search-results?format=pdf", json=payload)
        assert response.status_code == 200
        assert response.content[:4] == b"%PDF"

    # --- Test 5: Invalid format parameter returns 400 ---
    def test_export_invalid_format_returns_400(self, client: TestClient):
        response = client.get("/api/v1/export/stores?format=csv")
        assert response.status_code == 400
        assert "Geçersiz format" in response.json().get("detail", "")

    # --- Test 6: Empty data export should succeed (no crash) ---
    def test_export_empty_search_results(self, client: TestClient):
        payload = {
            "query": "nonexistent product xyz",
            "items": []
        }
        response = client.post("/api/v1/export/search-results?format=excel", json=payload)
        assert response.status_code == 200
        assert len(response.content) > 50  # Minimal Excel file

    # --- Test 7: Watchlist export endpoint ---
    def test_export_watchlist_excel(self, client: TestClient):
        response = client.get("/api/v1/export/watchlist?format=excel")
        assert response.status_code == 200
        assert "spreadsheetml" in response.headers.get("content-type", "")

    # --- Test 8: Scan history export endpoint ---
    def test_export_scan_history_pdf(self, client: TestClient):
        response = client.get("/api/v1/export/scan-history?format=pdf")
        assert response.status_code == 200
        assert response.content[:4] == b"%PDF"
