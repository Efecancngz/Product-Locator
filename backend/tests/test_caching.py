import pytest
from src.services.search_service import SearchService
from src.services.db_service import db_service

@pytest.mark.asyncio
async def test_search_service_caching_flow(monkeypatch, mock_products):
    """
    Objective: Verify that the search service properly checks the caching layer.
               1. First call should be a cache miss, trigger scraping, and then cache the result.
               2. Second call should be a cache hit, returning the result directly from the cache
                  without executing any scraping or orchestrator logic.
    """
    # Clear cache before starting
    db_service.memory_cache.clear()
    
    # Track how many times search service calls the orchestrator / actual search method
    orchestrator_call_count = 0
    
    async def mock_orchestrator_search(self, query: str, city=None, district=None):
        nonlocal orchestrator_call_count
        orchestrator_call_count += 1
        return [
            {
                "name": "Cached Test Product",
                "price": 999.00,
                "currency": "TRY",
                "in_stock": True,
                "store_info": {
                    "chain": "Teknosa",
                    "city": "İzmir",
                    "district": "Bornova",
                    "branch": "Forum Bornova"
                },
                "source_url": "http://test-caching"
            }
        ]
        
    from src.services.search_orchestrator import SearchOrchestrator
    monkeypatch.setattr(SearchOrchestrator, "search", mock_orchestrator_search)
    
    search_service = SearchService()
    
    # 1st Call: Cache Miss
    print("\n[CACHE TEST] Performing 1st Search (Should be Cache Miss)")
    result1 = await search_service.search_products("cache-test-prod", city="İzmir")
    
    assert orchestrator_call_count == 1, "Orchestrator should have been called once on cache miss"
    assert len(result1.found_products) == 1
    assert result1.found_products[0].product_name == "Cached Test Product"
    
    # 2nd Call: Cache Hit
    print("[CACHE TEST] Performing 2nd Search (Should be Cache Hit)")
    result2 = await search_service.search_products("cache-test-prod", city="İzmir")
    
    assert orchestrator_call_count == 1, "Orchestrator should NOT have been called again on cache hit"
    assert len(result2.found_products) == 1
    assert result2.found_products[0].product_name == "Cached Test Product"
    print("  [PASS] Caching flow verified successfully.")
