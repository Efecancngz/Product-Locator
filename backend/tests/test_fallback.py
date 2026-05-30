import pytest
from src.services.search_orchestrator import search_orchestrator
from src.services.ai_parser import ai_parser
from src.services.fallback_parser import fallback_parser

# Mock HTML sample containing standard Schema.org JSON-LD
MOCK_HTML_WITH_JSON_LD = """
<html>
<head>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": "Apple iPhone 15 Pro 256GB Titanium",
      "image": "https://www.teknosa.com/iphone-15-pro.jpg",
      "offers": {
        "@type": "Offer",
        "price": "72000.00",
        "priceCurrency": "TRY"
      }
    }
    </script>
</head>
<body>
    <h1>iPhone 15 Pro</h1>
</body>
</html>
"""

class MockPlaywrightPage:
    """Mock of Playwright Page object to simulate browser load and HTML extraction."""
    def __init__(self, html):
        self.html = html
        
    async def route(self, pattern, handler):
        pass  # NOP
        
    async def goto(self, url, timeout=0, wait_until=""):
        pass  # NOP
        
    async def wait_for_timeout(self, duration):
        pass  # NOP
        
    async def content(self):
        return self.html
        
    async def close(self):
        pass  # NOP

    async def add_init_script(self, script):
        pass  # NOP

    async def set_extra_http_headers(self, headers):
        pass  # NOP

class MockPlaywrightContext:
    """Mock of Playwright Context object to simulate new page creation."""
    def __init__(self, page):
        self.page = page
        
    async def new_page(self):
        return self.page

@pytest.mark.asyncio
async def test_fallback_parser_trigger_on_ai_failure(monkeypatch):
    """
    IEEE 829 Test Case: TC-FAL-004
    Objective: Verify that if the AI parser raises an exception (e.g. API quota exceeded, offline),
               the SearchOrchestrator seamlessly triggers the FallbackParser and extracts products.
    """
    # 1. Mock the Playwright Page and Context
    mock_page = MockPlaywrightPage(MOCK_HTML_WITH_JSON_LD)
    mock_context = MockPlaywrightContext(mock_page)
    
    # 2. Force AI parser to raise an exception, simulating a failure
    async def mock_ai_parse_html_failure(html_content: str, url: str):
        raise Exception("Gemini AI quota exceeded (Simulated Failure)")
        
    monkeypatch.setattr(ai_parser, "parse_html", mock_ai_parse_html_failure)
    
    # 3. Execute scrape and parse method in orchestrator
    products = await search_orchestrator._scrape_and_parse(
        mock_context, 
        "https://www.teknosa.com/iphone-15-pro-titanium"
    )
    
    # 4. Assertions:
    # A. Products should not be empty, proving fallback parser took over
    assert len(products) > 0
    
    # B. The product fields must be correctly parsed from the HTML using JSON-LD extraction
    product = products[0]
    assert product["name"] == "Apple iPhone 15 Pro 256GB Titanium"
    assert float(product["price"]) == 72000.00
    assert product["currency"] == "TRY"
    assert product["store_info"]["chain"] == "Teknosa"
