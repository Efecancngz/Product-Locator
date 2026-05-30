
import asyncio
import urllib.parse
from typing import List, Dict, Optional
from playwright.async_api import async_playwright

# Import store registry
from src.config.store_registry import (
    STORE_CONFIGS, StoreCategory, get_stores_by_category, 
    get_all_enabled_stores, get_search_url, get_store_by_domain
)
import random

# Premium desktop User-Agents list for rotation
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 OPR/109.0.0.0"
]


class SearchEngine:
    async def search(self, query: str, limit: int = 5) -> List[Dict]:
        raise NotImplementedError


class GoogleSearcher(SearchEngine):
    async def search(self, query: str, limit: int = 5) -> List[Dict]:
        results = []
        print(f"[GoogleSearcher] Searching for: {query}")
        
        async with async_playwright() as p:
            # Use headless=True but with args to mock real browser to avoid instant block
            user_agent = random.choice(USER_AGENTS)
            browser = await p.chromium.launch(headless=True, args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
                f"--user-agent={user_agent}"
            ])
            
            v_width = random.randint(1280, 1920)
            v_height = random.randint(720, 1080)
            
            context = await browser.new_context(
                viewport={"width": v_width, "height": v_height},
                user_agent=user_agent,
                locale="tr-TR",
                timezone_id="Europe/Istanbul"
            )
            page = await context.new_page()
            await page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            
            try:
                await page.goto("https://www.google.com", timeout=30000)
                
                # Consent Dialog (TR)
                try:
                    consent_btn = page.locator("button:has-text('Kabul et'), button:has-text('Tümünü kabul et')").first
                    if await consent_btn.is_visible(timeout=3000):
                        await consent_btn.click()
                except:
                    pass

                # Search Input 
                sel = "textarea[name='q']"
                if not await page.is_visible(sel):
                    sel = "input[name='q']"
                    
                await page.fill(sel, query)
                await page.press(sel, "Enter")
                
                # Wait for results
                await page.wait_for_selector("div.g", timeout=10000)
                
                items = await page.query_selector_all("div.g")
                
                for item in items[:limit*2]:
                    try:
                        link_el = await item.query_selector("a")
                        if not link_el: continue
                        
                        href = await link_el.get_attribute("href")
                        
                        title_el = await item.query_selector("h3")
                        title = await title_el.inner_text() if title_el else "Unknown"
                        
                        if href and href.startswith("http") and "google.com" not in href:
                            results.append({
                                "title": title,
                                "url": href,
                                "source": "google"
                            })
                            
                        if len(results) >= limit:
                            break
                    except:
                        continue
                        
            except Exception as e:
                print(f"[GoogleSearcher] Error: {e}")
            finally:
                await browser.close()
                
        print(f"[GoogleSearcher] Found {len(results)} results.")
        return results


class GenericSiteSearcher(SearchEngine):
    """
    Multi-store search engine that searches across all registered stores.
    Supports category filtering for sector-specific searches.
    """
    
    def __init__(self, domains: List[str] = None, category: Optional[StoreCategory] = None):
        """
        Initialize the searcher.
        
        Args:
            domains: Optional list of specific domains to search (overrides category)
            category: Optional category to filter stores (electronics, clothing, etc.)
        """
        if domains is not None:
            self.domains = domains
        elif category is not None:
            # Get stores from specific category
            stores = get_stores_by_category(category)
            self.domains = [f"https://www.{s.domain}" for s in stores]
        else:
            # Default: electronics stores for backward compatibility
            # But we'll use a smarter approach based on query
            self.domains = [
                "https://www.vatanbilgisayar.com", 
                "https://www.teknosa.com"
            ]
        
        self.category = category

    def _get_domains_for_query(self, query: str) -> List[str]:
        """
        Smart domain selection based on query keywords.
        Returns appropriate stores based on what user is searching for.
        """
        query_lower = query.lower()
        
        # Category detection keywords
        electronics_keywords = ["iphone", "samsung", "telefon", "laptop", "bilgisayar", "tablet", "playstation", "xbox", "tv", "televizyon", "kulaklık", "airpods"]
        appliance_keywords = ["buzdolabı", "çamaşır", "bulaşık", "fırın", "klima", "elektrik süpürgesi", "mikrodalga", "aspiratör", "ocak"]
        clothing_keywords = ["elbise", "pantolon", "gömlek", "ceket", "mont", "kaban", "tişört", "kazak", "etek"]
        sports_keywords = ["ayakkabı", "spor", "koşu", "futbol", "basketbol", "nike", "adidas", "forma", "şort"]
        cosmetics_keywords = ["parfüm", "makyaj", "ruj", "fondöten", "krem", "şampuan", "saç", "cilt"]
        
        selected_domains = []
        
        # Check each category
        if any(kw in query_lower for kw in electronics_keywords):
            stores = get_stores_by_category(StoreCategory.ELECTRONICS)
            selected_domains.extend([f"https://www.{s.domain}" for s in stores[:3]])  # Limit to 3 per category
        
        if any(kw in query_lower for kw in appliance_keywords):
            stores = get_stores_by_category(StoreCategory.APPLIANCES)
            selected_domains.extend([f"https://www.{s.domain}" for s in stores[:3]])
        
        if any(kw in query_lower for kw in clothing_keywords):
            stores = get_stores_by_category(StoreCategory.CLOTHING)
            selected_domains.extend([f"https://www.{s.domain}" for s in stores[:3]])
            
        if any(kw in query_lower for kw in sports_keywords):
            stores = get_stores_by_category(StoreCategory.SPORTS)
            selected_domains.extend([f"https://www.{s.domain}" for s in stores[:3]])
            
        if any(kw in query_lower for kw in cosmetics_keywords):
            stores = get_stores_by_category(StoreCategory.COSMETICS)
            selected_domains.extend([f"https://www.{s.domain}" for s in stores[:3]])
        
        # If no specific category detected, default to electronics (most common)
        if not selected_domains:
            stores = get_stores_by_category(StoreCategory.ELECTRONICS)
            selected_domains = [f"https://www.{s.domain}" for s in stores[:3]]
        
        return list(set(selected_domains))  # Remove duplicates

    def _get_search_url_for_domain(self, domain: str, query: str) -> str:
        """Build the search URL for a specific domain using registry."""
        safe_query = urllib.parse.quote(query)
        
        # Try to find in registry first
        for key, config in STORE_CONFIGS.items():
            if config.domain in domain:
                return config.search_url_template.format(query=safe_query)
        
        # Fallback for legacy domains not in registry
        if "vatanbilgisayar" in domain:
            return f"{domain}/arama/{safe_query}/"
        elif "teknosa" in domain:
            return f"{domain}/arama/?s={safe_query}"
        elif "mediamarkt" in domain:
            return f"{domain}/tr/search.html?query={safe_query}"
        elif "hepsiburada" in domain:
            return f"{domain}/ara?q={safe_query}"
        elif "trendyol" in domain:
            return f"{domain}/sr?q={safe_query}"
        elif "arcelik" in domain or "beko" in domain:
            return f"{domain}/arama?text={safe_query}"
        elif "vestel" in domain:
            return f"{domain}/arama?q={safe_query}"
        elif "flo" in domain:
            return f"{domain}/arama?q={safe_query}"
        elif "lcwaikiki" in domain:
            return f"{domain}/tr-TR/TR/arama?q={safe_query}"
        elif "koton" in domain:
            return f"{domain}/tr/search?q={safe_query}"
        elif "boyner" in domain:
            return f"{domain}/arama?q={safe_query}"
        elif "defacto" in domain:
            return f"{domain}/search?q={safe_query}"
        elif "decathlon" in domain:
            return f"{domain}/search?Ntt={safe_query}"
        elif "nike" in domain:
            return f"{domain}/tr/w?q={safe_query}"
        elif "adidas" in domain:
            return f"{domain}/tr/search?q={safe_query}"
        elif "gratis" in domain or "grfratis" in domain:
            return f"{domain}/arama?q={safe_query}"
        elif "watsons" in domain:
            return f"{domain}/search?q={safe_query}"
        elif "sephora" in domain:
            return f"{domain}/search?q={safe_query}"
        
        # Generic fallback
        return f"{domain}/search?q={safe_query}"

    async def search(self, query: str, limit: int = 5) -> List[Dict]:
        # Determine domains to search
        if self.category:
            domains_to_search = self.domains
        else:
            domains_to_search = self._get_domains_for_query(query)
        
        results = []
        print(f"[GenericSiteSearcher] Searching {len(domains_to_search)} stores for: {query}")
        print(f"[GenericSiteSearcher] Domains: {domains_to_search}")
        
        async with async_playwright() as p:
            user_agent = random.choice(USER_AGENTS)
            browser = await p.chromium.launch(headless=True, args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
                f"--user-agent={user_agent}"
            ])
            v_width = random.randint(1280, 1920)
            v_height = random.randint(720, 1080)
            context = await browser.new_context(
                 viewport={"width": v_width, "height": v_height},
                 user_agent=user_agent,
                 locale="tr-TR",
                 timezone_id="Europe/Istanbul"
            )
            
            async def search_domain(domain):
                domain_results = []
                page = None
                try:
                    print(f"DEBUG: Processing {domain}...", flush=True)
                    # Enhanced Headers for Bot Evasion
                    await context.set_extra_http_headers({
                        "User-Agent": user_agent,
                        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                        "Referer": "https://www.google.com/"
                    })
                    page = await context.new_page()
                    await page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
                    
                    # Get search URL from registry
                    search_url = self._get_search_url_for_domain(domain, query)
                    
                    print(f"DEBUG: Navigating to {search_url}...", flush=True)
                    await page.goto(search_url, timeout=45000)
                    print(f"DEBUG: Navigation complete for {domain}", flush=True)
                        
                    # Wait for Navigation/Load
                    try:
                        await page.wait_for_load_state("domcontentloaded", timeout=15000)
                        await page.wait_for_timeout(2000)
                    except Exception as e:
                        print(f"DEBUG: Load state wait failed for {domain}: {e}", flush=True)
                        pass 

                    # HANDLE POPUPS & OVERLAYS
                    print(f"DEBUG: Handling popups for {domain}...", flush=True)
                    try:
                        # Remove common overlay elements
                        await page.evaluate("""() => {
                            const overlays = document.querySelectorAll(
                                'efilli-layout-dynamic, .modal, .popup, .overlay, ' +
                                '[class*="cookie"], [class*="consent"], [id*="cookie"], [id*="consent"]'
                            );
                            overlays.forEach(el => el.remove());
                        }""")
                        
                        # Common cookie accept buttons
                        cookie_selectors = [
                            ".cc-nb-okagree", 
                            "#onetrust-accept-btn-handler",
                            "[class*='accept-cookie']",
                            "[class*='cookie-accept']",
                            "button:has-text('Kabul')",
                            "button:has-text('Accept')"
                        ]
                        for sel in cookie_selectors:
                            try:
                                if await page.is_visible(sel, timeout=1000):
                                    await page.click(sel)
                                    await page.wait_for_timeout(300)
                                    break
                            except:
                                continue
                                
                        # Close app promo popups
                        if await page.is_visible(".close-open-app", timeout=500):
                            await page.click(".close-open-app")
                    except:
                        pass
                    
                    print(f"DEBUG: Popups handled for {domain}. Scrolling...", flush=True)
                    
                    # SCROLL TO TRIGGER LAZY LOAD
                    try:
                        for _ in range(4):
                            await page.keyboard.press("PageDown")
                            await page.wait_for_timeout(800)
                        await page.keyboard.press("Home")
                        await page.wait_for_timeout(500)
                    except:
                        pass
                        
                    print(f"DEBUG: Extracting links for {domain}...", flush=True)

                    # WAIT FOR PRODUCT GRID
                    product_indicators = [
                        ".product-list__item", 
                        ".product-item", 
                        ".product-card",
                        "div[class*='product']",
                        "a[href*='urun']",
                        "[data-product]"
                    ]
                    
                    try:
                        for indicator in product_indicators[:3]:
                            try:
                                await page.wait_for_selector(indicator, timeout=4000)
                                break
                            except:
                                continue
                    except:
                        pass
                    
                    # Extract links
                    candidate_links = await page.evaluate('''() => {
                        const params = [];
                        const allLinks = Array.from(document.querySelectorAll('a'));
                        for (const link of allLinks) {
                            if (link.href && link.innerText && link.innerText.length > 3) {
                                params.push({url: link.href, text: link.innerText});
                            }
                        }
                        return params;
                    }''')

                    print(f"DEBUG: Found {len(candidate_links)} total links on {domain}", flush=True)

                    count = 0
                    matched_in_domain = 0

                    # Negative keywords for Category Pages
                    ignored_terms = ["kategori", "modelleri", "list", "search", "arama", "marka", "filtre", "sirala", "sepet", "login", "register", "hesap"]
                    
                    for link in candidate_links:
                        url_lower = link['url'].lower()
                        text_lower = link['text'].lower()
                        
                        # Skip Category/Listing pages
                        if any(term in url_lower for term in ignored_terms):
                            continue

                        # Query matching
                        query_parts = query.lower().split()
                        
                        skip_words = [
                            "fiyat", "fiyatı", "fiyatları", "indirim", "kampanya", "satın", "al", "en", "ucuz",
                            "stok", "stokta", "mağaza", "mağazası", "mağazada", "mağazalar",
                            "istanbul", "ankara", "izmir", "bursa", "antalya", "adana", "konya", 
                            "gaziantep", "mersin", "kayseri", "eskişehir", "trabzon", "samsun",
                            "ve", "veya", "ile", "için", "de", "da", "den", "dan", "türkiye"
                        ]
                        
                        is_match = True
                        for part in query_parts:
                            if part in skip_words:
                                continue
                            if len(part) < 2 and not part.isdigit():
                                continue
                            if (part not in text_lower) and (part not in url_lower):
                                is_match = False
                                break
                        
                        if is_match:
                            if "javascript" not in url_lower:
                                domain_results.append({
                                    "title": link['text'].strip()[:200],  # Limit title length
                                    "url": link['url'],
                                    "source": domain
                                })
                                count += 1
                                matched_in_domain += 1
                                if count >= 3: break
                    
                    if matched_in_domain == 0:
                        print(f"   [Warning] No matching links found on {domain} for '{query}'")
                        
                except Exception as e:
                    print(f"   Error on {domain}: {e}")
                finally:
                    if page: await page.close()
                return domain_results

            # Execute all domains in parallel
            tasks = [search_domain(d) for d in domains_to_search]
            all_domain_results = await asyncio.gather(*tasks)
            
            for res_list in all_domain_results:
                results.extend(res_list)
            
            await browser.close()
            
        print(f"[GenericSiteSearcher] Found {len(results)} results.")
        return results


# Factory function for creating category-specific searchers
def create_category_searcher(category: StoreCategory) -> GenericSiteSearcher:
    """Create a searcher for a specific category."""
    return GenericSiteSearcher(category=category)


# Test function
async def test_search():
    # Test with smart query detection
    engine = GenericSiteSearcher()
    res = await engine.search("iphone 15")
    for r in res:
        print(r)

if __name__ == "__main__":
    asyncio.run(test_search())

