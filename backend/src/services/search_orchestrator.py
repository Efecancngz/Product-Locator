"""
Search Orchestrator - Coordinates Google Search, Scraping, and AI Parsing
"""
import asyncio
import logging
from typing import List, Dict, Optional
import urllib.parse
from playwright.async_api import async_playwright, Page
from src.config.settings import settings
from src.services.ai_parser import ai_parser

logger = logging.getLogger(__name__)


class SearchOrchestrator:
    """
    Orchestrates the full search flow:
    1. Google Search for relevant pages
    2. Scrape those pages with Playwright
    3. Parse with AI to extract products
    """
    
    def __init__(self):
        self.max_results = 5
        self.page_timeout = 45000  # Increased for slow pages
        
    async def search(self, query: str, city: Optional[str] = None, district: Optional[str] = None) -> List[Dict]:
        """
        Main search method.
        
        Args:
            query: Product search query
            city: Optional city filter
            district: Optional district filter
            
        Returns:
            List of product dictionaries with store info
        """
        logger.info(f"[Orchestrator] Starting search for: {query} (city={city})")
        
        # Build search query with location
        search_query = self._build_search_query(query, city)
        
        # Step 1: Get relevant URLs via direct site search
        # Note: Pass original query, not search_query (extra terms break filtering)
        urls = await self._google_search(query)
        
        if not urls:
            logger.warning("[Orchestrator] No URLs found from Google search")
            return []
        
        logger.info(f"[Orchestrator] Found {len(urls)} URLs to scrape")
        
        # Step 2: Scrape and parse each URL
        all_products = []
        
        # Premium desktop User-Agents list for rotation
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 OPR/109.0.0.0"
        ]
        import random
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            
            # Rotate viewports and browser configurations
            v_width = random.randint(1280, 1920)
            v_height = random.randint(720, 1080)
            
            context = await browser.new_context(
                user_agent=random.choice(user_agents),
                viewport={"width": v_width, "height": v_height},
                locale="tr-TR",
                timezone_id="Europe/Istanbul"
            )
            
            for url in urls[:self.max_results]:
                try:
                    products = await self._scrape_and_parse(context, url)
                    all_products.extend(products)
                except Exception as e:
                    logger.error(f"[Orchestrator] Error processing {url}: {e}")
                    continue
            
            await browser.close()
        
        # Step 3: Filter by city/district if specified
        if city:
            all_products = self._filter_by_location(all_products, city, district)
        
        logger.info(f"[Orchestrator] Returning {len(all_products)} products")
        return all_products
    
    def _build_search_query(self, query: str, city: Optional[str] = None) -> str:
        """Build Google search query with location and store keywords."""
        base_query = f"{query} fiyat stok mağaza"
        if city:
            base_query += f" {city}"
        return base_query
    
    async def _google_search(self, query: str) -> List[str]:
        """
        Search using direct site scraping (DuckDuckGo is unreliable).
        Uses GenericSiteSearcher to search directly on known e-commerce sites.
        """
        from src.universal_agent.search_engine import GenericSiteSearcher
        
        urls = []
        
        try:
            searcher = GenericSiteSearcher()
            # Search with just the query (not the full search_query with "fiyat stok mağaza")
            results = await searcher.search(query, limit=self.max_results)
            
            for result in results:
                url = result.get("url")
                if url:
                    urls.append(url)
                    
            logger.info(f"[Orchestrator] GenericSiteSearcher found {len(urls)} URLs")
            
        except Exception as e:
            logger.error(f"[Orchestrator] Site search error: {e}")
        
        return urls
    
    def _is_valid_store_url(self, url: str) -> bool:
        """Check if URL is from a known retail store."""
        # Skip non-store sites
        skip_domains = [
            "youtube.com", "facebook.com", "instagram.com", "twitter.com",
            "wikipedia.org", "reddit.com", "pinterest.com", "linkedin.com",
            "duckduckgo.com", "google.com", "bing.com"
        ]
        
        url_lower = url.lower()
        for domain in skip_domains:
            if domain in url_lower:
                return False
        
        # Prefer known store domains - all supported stores
        preferred_domains = [
            # Electronics
            "vatanbilgisayar.com", "teknosa.com", "mediamarkt.com.tr",
            "hepsiburada.com", "trendyol.com",
            # Appliances
            "arcelik.com.tr", "beko.com.tr", "vestel.com.tr",
            "bosch-home.com.tr", "siemens-home.bsh-group.com",
            # Clothing
            "flo.com.tr", "lcwaikiki.com", "koton.com",
            "boyner.com.tr", "defacto.com.tr",
            # Sports
            "decathlon.com.tr", "nike.com", "adidas.com.tr",
            "intersport.com.tr", "sportive.com.tr",
            # Cosmetics
            "gratis.com", "grfratis.com", "watsons.com.tr",
            "sephora.com.tr", "rossmann.com.tr", "eve.com.tr"
        ]
        
        for domain in preferred_domains:
            if domain in url_lower:
                return True
        
        # Allow any .com.tr or product-looking URL
        return ".com.tr" in url_lower or "/urun" in url_lower or "/product" in url_lower
    
    async def _scrape_and_parse(self, context, url: str) -> List[Dict]:
        """Scrape a single URL and parse with AI, falling back to simple parser if needed."""
        from src.services.fallback_parser import fallback_parser
        
        page = await context.new_page()
        
        # Anti-Bot webdriver detection bypass & custom headers setup
        await page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        await page.set_extra_http_headers({
            "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Referer": "https://www.google.com/"
        })
        
        try:
            # Block heavy resources
            await page.route("**/*.{png,jpg,jpeg,gif,css,font,woff,woff2}", lambda route: route.abort())
            
            await page.goto(url, timeout=self.page_timeout, wait_until="domcontentloaded")
            await page.wait_for_timeout(2000)
            
            # Get HTML content
            html = await page.content()
            
            products = []
            
            # Try AI parser first (wrapped in try-except)
            try:
                products = await ai_parser.parse_html(html, url)
            except Exception as ai_error:
                logger.warning(f"[Orchestrator] AI parser error, using fallback: {ai_error}")
            
            # If AI parser returns nothing or failed, use fallback parser
            if not products:
                logger.info(f"[Orchestrator] Using fallback parser for {url}")
                products = fallback_parser.parse_html(html, url)
            
            return products
            
        except Exception as e:
            logger.error(f"[Orchestrator] Scrape error for {url}: {e}")
            return []
        finally:
            await page.close()
    
    def _filter_by_location(self, products: List[Dict], city: str, district: Optional[str] = None) -> List[Dict]:
        """Filter products by city and optionally district."""
        filtered = []
        city_lower = city.lower()
        district_lower = district.lower() if district else None
        
        for product in products:
            store_info = product.get("store_info", {})
            product_city = store_info.get("city", "").lower()
            product_district = store_info.get("district", "").lower()
            
            # City match
            if city_lower in product_city or product_city in city_lower:
                # District match (if specified)
                if district_lower:
                    if district_lower in product_district or product_district in district_lower:
                        filtered.append(product)
                else:
                    filtered.append(product)
            # If no city info, include anyway (online stores)
            elif not product_city:
                filtered.append(product)
        
        return filtered


# Singleton
search_orchestrator = SearchOrchestrator()
