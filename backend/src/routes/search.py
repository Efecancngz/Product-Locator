"""
Product Search Routes

API endpoints to execute keyword-based real-time stock searches across retailers.
"""
from fastapi import APIRouter, Query, Request
from src.services.search_service import SearchService
from src.models.product import SearchResult
from src.config.limiter import limiter

router = APIRouter(tags=["search"])
search_service = SearchService()


@router.get(
    "/search",
    response_model=SearchResult,
    summary="Search Products",
    response_description="List of matching products and total branch count",
)
@limiter.limit("5/minute")
async def search_products(
    request: Request,
    q: str = Query(
        ...,
        min_length=2,
        max_length=100,
        description="Product query or brand (e.g., 'iPhone 15 Pro', 'Dyson V15')",
        example="iPhone 15 Pro",
    ),
    city: str = Query(
        None,
        description="Optional city filter (e.g., 'İzmir', 'İstanbul', 'Ankara')",
        example="İzmir",
    ),
    district: str = Query(
        None,
        description="Optional district filter — used when city parameter is supplied (e.g., 'Karşıyaka', 'Kadıköy')",
        example="Karşıyaka",
    ),
):
    """
    Searches for the specified keyword across all active retailers and returns structural stock details.

    ## Search Execution Pipeline

    1. Resolves retailer search templates to query URLs.
    2. Scrapes HTML pages concurrently utilizing Playwright headless browsers.
    3. Leverages Gemini Flash 2.0 to extract structured product lists from raw markup.
    4. Matches results against local coordinate database for store branch enrichment.
    5. Applies city/district location filters and enforces a 30-result ceiling.

    ## Supported Retailer Categories

    - **Electronics:** Teknosa, Vatan Bilgisayar, MediaMarkt, Hepsiburada, Trendyol
    - **Appliances:** Arçelik, Beko, Vestel, Bosch, Siemens
    - **Clothing:** Flo, LC Waikiki, Koton, Boyner, DeFacto
    - **Sports:** Decathlon, Nike, Adidas, Intersport, Sportive
    - **Cosmetics:** Gratis, Watsons, Sephora, Rossmann, Eve

    ## Notes

    - Processing latency averages 30–180 seconds depending on target retailer response speeds.
    - Some retailer requests might be skipped due to aggressive Cloudflare or bot protection schemas.
    - Output represents instant, live scraped branch data — real-time availability.
    """
    return await search_service.search_products(q, city, district)

