import pytest
import os
from src.services.search_service import SearchService

@pytest.mark.asyncio
async def test_heavy_categories_scraping():
    """Verify multiple categories and district filters using the SearchService (skipped by default)."""
    # This is a very heavy integration test hitting live web pages and Gemini.
    # It is skipped by default to avoid slow test cycles.
    run_heavy = os.getenv("RUN_HEAVY_TESTS")
    if not run_heavy or run_heavy.lower() != "true":
        pytest.skip("Skipping heavy scraping category tests (set RUN_HEAVY_TESTS=true to enable).")

    service = SearchService()
    result = await service.search_products("playstation 5", "İzmir", "Konak")
    assert result.query == "playstation 5"
    assert isinstance(result.found_products, list)
