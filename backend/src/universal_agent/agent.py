
import asyncio
from typing import List
# Use relative imports if run as package, but for standalone testing we might need path tricks.
# We will assume this is run from backend root via `py -m src.universal_agent.agent`
# Use relative imports if run as package
try:
    from .search_engine import GoogleSearcher, GenericSiteSearcher
    from .page_parser import GenericProductParser
except ImportError:
    # Fallback for direct execution
    from search_engine import GoogleSearcher, GenericSiteSearcher
    from page_parser import GenericProductParser

from playwright.async_api import async_playwright

class UniversalAgent:
    def __init__(self):
        # We try Google first, if it returns 0, we fallback to Site Searcher?
        # Ideally robust strategy. But user wants Results.
        # Let's default to Site Searcher for this environment since we know Google fails 100%.
        self.searcher = GenericSiteSearcher()
        self.parser = GenericProductParser()
        
    async def research(self, query: str) -> List[dict]:
        print(f"[UniversalAgent] Starting research for: {query}")
        
        # 1. Search Phase
        # We append "fiyat" to target e-commerce pages usually
        search_query = f"{query} fiyat"
        search_results = await self.searcher.search(search_query, limit=5)
        
        if not search_results:
            print("[UniversalAgent] No search results found.")
            return []
            
        print(f"[UniversalAgent] Found {len(search_results)} candidate links. Visiting...")
        
        products = []
        
        # 2. Extraction Phase
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True, args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
                "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
            ])
            # Use specific context to avoid bot detection
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
            )
            
            # Process in parallel or serial? Serial for safety first.
            page = await context.new_page()
            
            for res in search_results:
                url = res['url']
                print(f" > Visiting: {url}")
                try:
                    # Block resources to speed up
                    await page.route("**/*.{png,jpg,jpeg,gif,css,font}", lambda route: route.abort())
                    
                    await page.goto(url, timeout=20000, wait_until="domcontentloaded")
                    
                    # Small wait for dynamic content
                    await page.wait_for_timeout(2000)
                    
                    content = await page.content()
                    
                    # Parse
                    product_data = self.parser.parse(content, url)
                    
                    if product_data["name"] and product_data["price"] > 0:
                        print(f"   [+] Found: {product_data['name']} - {product_data['price']} {product_data['currency']}")
                        products.append(product_data)
                    else:
                        print(f"   [-] Could not extract valid product data from {url}")
                        # DUMP HTML
                        import os
                        import time
                        try:
                            os.makedirs("debug_dumps", exist_ok=True) # Create in CWD/debug_dumps
                            # Safe filename
                            safe_name = url.split("//")[-1].replace("/", "_").replace("?", "").replace(".", "_")[-50:]
                            fname = f"debug_dumps/product_failed_{int(time.time())}_{safe_name}.html"
                            with open(fname, "w", encoding="utf-8") as f:
                                f.write(content)
                            print(f"       Refer to dump: {fname}")
                        except Exception as e:
                            print(f"       Failed to dump: {e}")
                        
                except Exception as e:
                    print(f"   [!] Error visiting {url}: {e}")
                    
            await browser.close()
            
        print(f"[UniversalAgent] Research complete. Found {len(products)} valid products.")
        return products

# Test
if __name__ == "__main__":
    async def main():
        agent = UniversalAgent()
        # Test with something generic
        results = await agent.research("fakir kaave kahve makinesi")
        print("\n--- Final Results ---")
        for r in results:
            print(f"{r['name']} | {r['price']} {r['currency']} | {r['url']}")
            
    asyncio.run(main())
