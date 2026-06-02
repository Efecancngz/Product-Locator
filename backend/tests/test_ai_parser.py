import pytest
import os
from src.services.ai_parser import ai_parser

@pytest.mark.asyncio
async def test_ai_parser_direct():
    """Verify that Gemini AI parser extracts structured product details from HTML markup."""
    # Skip test if GEMINI_API_KEY is missing or contains placeholder values
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or "YOUR" in api_key.upper() or len(api_key) < 10:
        pytest.skip("Skipping live AI parsing test: GEMINI_API_KEY is not configured.")

    html_sample = """
    <html>
    <body>
    <div class="product">
        <h2>Apple iPhone 15 128GB Siyah</h2>
        <span class="price">50.599 TL</span>
        <span class="stock">Stokta</span>
    </div>
    </body>
    </html>
    """
    result = await ai_parser.parse_html(html_sample, 'https://www.teknosa.com/test')
    assert isinstance(result, list)
    if result:
        assert "product_name" in result[0]
