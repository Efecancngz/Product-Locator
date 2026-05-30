
import json
import re
from typing import Dict, Optional
from bs4 import BeautifulSoup

class GenericProductParser:
    def parse(self, html: str, url: str) -> Dict:
        """
        Extracts product data from HTML using heuristic strategies.
        Returns dict with: name, price, currency, availability(bool), image_url
        """
        soup = BeautifulSoup(html, "html.parser")
        data = {
            "name": None,
            "price": 0.0,
            "currency": "TRY",
            "in_stock": True,
            "image": None,
            "url": url
        }
        
        # Strategy 1: JSON-LD (Schema.org) - Most Reliable
        ld_scripts = soup.find_all("script", type="application/ld+json")
        for script in ld_scripts:
            try:
                js = json.loads(script.string if script.string else "{}")
                # Handle list of schemas or graph
                if isinstance(js, list):
                    schemas = js
                elif isinstance(js, dict) and "@graph" in js:
                    schemas = js["@graph"]
                else:
                    schemas = [js]
                
                for schema in schemas:
                    if schema.get("@type") == "Product":
                        self._extract_from_schema(schema, data)
                        if data["name"] and data["price"] > 0:
                            return data # Early exit if successful
            except:
                continue

        # Strategy 2: Property Meta Tags (OpenGraph / Twitter / Microdata)
        if not data["name"]:
            data["name"] = self._get_meta(soup, ["og:title", "twitter:title", "title"])
            
        if data["price"] == 0:
            price_str = self._get_meta(soup, ["product:price:amount", "og:price:amount"])
            if price_str:
                data["price"] = self._clean_price(price_str)

        if not data["image"]:
            data["image"] = self._get_meta(soup, ["og:image", "twitter:image"])

        # Strategy 3: Fallback Heuristics (Visual scraping)
        if not data["name"]:
            h1 = soup.find("h1")
            if h1:
                data["name"] = h1.get_text(strip=True)
                
        # Heuristic Price Extraction if generic fails
        if data["price"] == 0:
            # Look for elements with class containing 'price'
            # This is risky but better than nothing
            price_pattern = re.compile(r'(\d{1,3}(?:[.,]\d{3})*([.,]\d{2})?)')
            price_candidates = soup.find_all(string=re.compile(r'TL|₺'))
            
            for cand in price_candidates:
                parent = cand.parent
                # if parent is visible and close to H1... (hard to detect visibility in BS4)
                # Just try to parse first valid number
                match = price_pattern.search(cand)
                if match:
                    val = self._clean_price(match.group(0))
                    if val > 0:
                        data["price"] = val
                        break
                        
        return data

    def _extract_from_schema(self, schema: Dict, data: Dict):
        # Name
        if "name" in schema:
            data["name"] = schema["name"]
            
        # Image
        if "image" in schema:
            img = schema["image"]
            if isinstance(img, list) and img:
                data["image"] = img[0]
            elif isinstance(img, str):
                data["image"] = img
            elif isinstance(img, dict) and "url" in img:
                data["image"] = img["url"]

        # Offers
        if "offers" in schema:
            offer = schema["offers"]
            # Handle list of offers
            if isinstance(offer, list):
                if offer:
                    offer = offer[0] # Take first offer? Or lowPrice?
            
            if isinstance(offer, dict):
                # Price
                if "price" in offer:
                    data["price"] = float(offer["price"])
                elif "lowPrice" in offer:
                    data["price"] = float(offer["lowPrice"])
                    
                # Currency
                if "priceCurrency" in offer:
                    data["currency"] = offer["priceCurrency"]
                    
                # Availability
                if "availability" in offer:
                    avail = offer["availability"]
                    if "OutOfStock" in avail:
                        data["in_stock"] = False
                    else:
                        data["in_stock"] = True

    def _get_meta(self, soup, props):
        for p in props:
            tag = soup.find("meta", property=p) or soup.find("meta", attrs={"name": p})
            if tag and tag.get("content"):
                return tag.get("content")
        return None
        
    def _clean_price(self, text: str) -> float:
        try:
            # Remove currency symbols and format
            # 50.999,00 -> 50999.00
            # 1,234.56 -> 1234.56
            if not text: return 0.0
            
            clean = text.replace("TL", "").replace("₺", "").replace("$", "").replace("€", "").strip()
            
            # Smart comma/dot detection
            if "." in clean and "," in clean:
                # 1.234,56
                if clean.find(".") < clean.find(","):
                     clean = clean.replace(".", "").replace(",", ".")
                # 1,234.56
                else:
                     clean = clean.replace(",", "")
            elif "," in clean:
                # 12,50 or 12,000
                if len(clean.split(",")[-1]) == 2: # probable decimal
                     clean = clean.replace(",", ".")
                else: # probable thousand
                     clean = clean.replace(",", "")
                     
            return float(clean)
        except:
            return 0.0
