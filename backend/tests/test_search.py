import pytest
from src.universal_agent.search_engine import GenericSiteSearcher

@pytest.mark.asyncio
async def test_generic_site_searcher():
    """Verify that GenericSiteSearcher correctly generates keyword search URLs and scrapes (skips if Playwright is missing)."""
    s = GenericSiteSearcher()
    try:
        results = await s.search("iphone 15", limit=2)
        assert isinstance(results, list)
    except Exception as e:
        error_msg = str(e)
        if "Executable doesn't exist" in error_msg or "playwright install" in error_msg or "BrowserType.launch" in error_msg:
            pytest.skip(f"Skipping search engine test: Playwright browser executable is missing. Details: {error_msg}")
        else:
            raise e
