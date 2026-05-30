"""
Fallback HTML Parser - Uses BeautifulSoup and regular expressions
to extract product data when AI parser fails or hits rate limits.
"""
import re
import json
import logging
from typing import Dict, List, Optional
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class FallbackParser:
    """
    Simple HTML parser that extracts product data without using AI.
    Works by looking for known patterns in e-commerce sites.
    """
    
    def parse_html(self, html: str, source_url: str) -> List[Dict]:
        """
        Parse HTML content to extract product information.
        
        Args:
            html: Raw HTML content
            source_url: URL of the page
            
        Returns:
            List of product dictionaries
        """
        products = []
        
        # Try site-specific extraction first
        
        # 1. Teknosa: insider_object
        if "teknosa.com" in source_url:
            insider_products = self._extract_insider_object(html, source_url)
            if insider_products:
                products.extend(insider_products)
                
        # 2. Vatan Bilgisayar: specific selectors
        elif "vatanbilgisayar.com" in source_url:
            vatan_products = self._extract_vatan(html, source_url)
            if vatan_products:
                products.extend(vatan_products)
            
        # 3. Try dataLayer (many sites use this)
        if not products:
            datalayer_products = self._extract_datalayer(html, source_url)
            if datalayer_products:
                products.extend(datalayer_products)
        
        # 4. Try JSON-LD (Schema.org) - Very common in modern e-commerce
        if not products:
            jsonld_products = self._extract_jsonld(html, source_url)
            if jsonld_products:
                products.extend(jsonld_products)

        # 5. Try generic product extraction as last resort
        if not products:
            generic_products = self._extract_generic(html, source_url)
            if generic_products:
                products.extend(generic_products)
        
        logger.info(f"[FallbackParser] Extracted {len(products)} products from {source_url}")
        return products
    
    def _extract_jsonld(self, html: str, source_url: str) -> List[Dict]:
        """Extract products from Schema.org JSON-LD with robust malformed JSON evasion."""
        products = []
        try:
            soup = BeautifulSoup(html, 'html.parser')
            scripts = soup.find_all('script', type='application/ld+json')
            
            for script in scripts:
                try:
                    if not script.string:
                        continue
                    
                    script_content = script.string.strip()
                    
                    # Remove JavaScript assignments or trailing semi-colons
                    if "=" in script_content[:30] and (script_content.startswith("var ") or script_content.startswith("window.")):
                        script_content = re.sub(r'^[a-zA-Z0-9_.\s]+=\s*', '', script_content)
                        script_content = re.sub(r';\s*$', '', script_content)
                    
                    # Clean inline JS comments that break standard json.loads safely
                    script_content = re.sub(r'/\*.*?\*/', '', script_content, flags=re.DOTALL)
                    script_content = re.sub(r'(?<!http:)(?<!https:)//.*?\n', '\n', script_content)
                    
                    data = json.loads(script_content)
                    
                    # Helper to process a single item
                    def process_item(item):
                        p_type = item.get('@type')
                        if isinstance(p_type, list):
                            p_type = p_type[0] if p_type else ""
                            
                        if p_type == 'Product':
                            name = item.get('name')
                            offers = item.get('offers', {})
                            
                            # Handle offers list or single object
                            price_raw = None
                            currency = 'TRY'
                            url = item.get('url') or source_url
                            availability = ''
                            
                            if isinstance(offers, list):
                                if offers:
                                    price_raw = offers[0].get('price')
                                    currency = offers[0].get('priceCurrency', 'TRY')
                                    url = item.get('url') or offers[0].get('url') or url
                                    availability = offers[0].get('availability', '')
                            elif isinstance(offers, dict):
                                price_raw = offers.get('price')
                                currency = offers.get('priceCurrency', 'TRY')
                                url = item.get('url') or offers.get('url') or url
                                availability = offers.get('availability', '')
                                
                            image = item.get('image')
                            if isinstance(image, list):
                                image = image[0]
                            elif isinstance(image, dict):
                                image = image.get('url')
                            
                            if name and price_raw is not None:
                                # Use robust _parse_price to handle Turkish formats
                                price = self._parse_price(str(price_raw))
                                if price is not None:
                                    # Enforce Schema stock checking
                                    in_stock = True
                                    if availability:
                                        availability_str = str(availability).lower()
                                        if 'outofstock' in availability_str or 'out_of_stock' in availability_str:
                                            in_stock = False
                                            
                                    return {
                                        "name": name,
                                        "price": price,
                                        "currency": currency,
                                        "in_stock": in_stock,
                                        "store_info": {
                                            "chain": self._get_store_from_url(source_url),
                                            "branch": "",
                                            "city": "",
                                            "district": ""
                                        },
                                        "source_url": url or source_url,
                                        "image_url": image
                                    }
                        return None

                    # Handle different JSON-LD structures
                    if isinstance(data, list):
                        for entry in data:
                            p = process_item(entry)
                            if p: products.append(p)
                    elif isinstance(data, dict):
                        # Direct product
                        p = process_item(data)
                        if p: products.append(p)
                        
                        # Graph format
                        if '@graph' in data:
                            for entry in data['@graph']:
                                p = process_item(entry)
                                if p: products.append(p)
                                
                        # List structure
                        if data.get('@type') == 'ItemList' and 'itemListElement' in data:
                            for element in data['itemListElement']:
                                item = element.get('item', {})
                                if item:
                                    p = process_item(item)
                                    if p: products.append(p)
                                    
                except Exception as e:
                    logger.debug(f"[FallbackParser] Nested JSON-LD parse error: {e}")
                    continue
                    
        except Exception as e:
            logger.debug(f"[FallbackParser] JSON-LD extraction failed: {e}")
            
        return products

    
    def _extract_vatan(self, html: str, source_url: str) -> List[Dict]:
        """Extract products from Vatan Bilgisayar using CSS selectors."""
        products = []
        
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # Vatan uses these selectors for product cards
            product_cards = soup.select('.product-list__item, .product-item, .product-list--list-page .product-list__item')
            
            for card in product_cards[:15]:
                try:
                    # Product name
                    name_elem = card.select_one('.product-list__product-name, .product-name a, h3 a')
                    name = name_elem.get_text(strip=True) if name_elem else None
                    
                    # Price - try multiple selectors
                    price_elem = card.select_one('.product-list__price, .product-price, .price-new, [data-price]')
                    price_text = price_elem.get_text(strip=True) if price_elem else None
                    price = self._parse_price(price_text) if price_text else None
                    
                    # Product URL
                    link_elem = card.select_one('a[href*="/arama/"], a[href*="/urun/"], a.product-link')
                    url = None
                    if link_elem and link_elem.get('href'):
                        href = link_elem.get('href')
                        url = f"https://www.vatanbilgisayar.com{href}" if href.startswith('/') else href
                    
                    # Stock status
                    in_stock = card.select_one('.out-of-stock, .stokta-yok') is None
                    
                    if name and price:
                        product = {
                            "name": name,
                            "price": price,
                            "currency": "TRY",
                            "in_stock": in_stock,
                            "store_info": {
                                "chain": "Vatan Bilgisayar",
                                "branch": "",
                                "city": "",
                                "district": ""
                            },
                            "source_url": url or source_url
                        }
                        products.append(product)
                        
                except Exception as e:
                    logger.debug(f"[FallbackParser] Vatan card parse error: {e}")
                    continue
                    
        except Exception as e:
            logger.debug(f"[FallbackParser] Vatan extraction failed: {e}")
            
        return products
    
    def _parse_price(self, price_text: str) -> Optional[float]:
        """Parse price from text like '59.999 TL' or '59,999.00'."""
        try:
            # Remove non-numeric except . and ,
            cleaned = re.sub(r'[^\d.,]', '', price_text)
            # Handle Turkish format (. for thousands, , for decimals)
            if ',' in cleaned and '.' in cleaned:
                # 59.999,00 format
                cleaned = cleaned.replace('.', '').replace(',', '.')
            elif '.' in cleaned and cleaned.count('.') > 1:
                # 59.999.00 format - first dots are thousands
                parts = cleaned.rsplit('.', 1)
                cleaned = parts[0].replace('.', '') + '.' + parts[1]
            elif ',' in cleaned:
                # 59999,00 format
                cleaned = cleaned.replace(',', '.')
            
            return float(cleaned) if cleaned else None
        except:
            return None
    
    def _extract_insider_object(self, html: str, source_url: str) -> List[Dict]:
        """Extract products from Teknosa's insider_object JavaScript variable."""
        products = []
        
        try:
            # Find insider_object in the HTML
            pattern = r'window\.insider_object\s*=\s*(\{.*?\});'
            match = re.search(pattern, html, re.DOTALL)
            
            if not match:
                return []
            
            json_str = match.group(1)
            # Fix common JSON issues
            json_str = re.sub(r',\s*]', ']', json_str)  # Remove trailing commas
            json_str = re.sub(r',\s*}', '}', json_str)
            
            data = json.loads(json_str)
            
            listing = data.get("listing", {})
            items = listing.get("items", [])
            
            for item in items[:10]:  # Limit to 10 products
                # Get shop/seller info - shop_name is usually marketplace seller, not store branch
                custom = item.get("custom", {})
                shop_name = custom.get("shop_name", "")
                seller_name = custom.get("seller_name", shop_name)
                
                # Check if this is a marketplace seller or actual Teknosa
                is_teknosa_direct = shop_name.upper() in ["TEKNOSA", ""] or "teknosa" in shop_name.lower()
                
                # Extract city from product data if available
                product_city = custom.get("city", "")
                product_district = custom.get("district", "")
                
                product = {
                    "name": item.get("name", ""),
                    "price": item.get("unit_sale_price") or item.get("unit_price"),
                    "currency": item.get("currency", "TRY"),
                    "in_stock": True,
                    "store_info": {
                        "chain": "Teknosa",
                        # Use seller name if it's a marketplace seller, otherwise leave empty for store lookup
                        "branch": "" if is_teknosa_direct else f"Satıcı: {seller_name}",
                        "seller": seller_name if not is_teknosa_direct else None,
                        "city": product_city,
                        "district": product_district
                    },
                    "source_url": item.get("url", source_url),
                    "image_url": item.get("product_image_url", "")
                }
                
                if product["name"] and product["price"]:
                    products.append(product)
                    
        except Exception as e:
            logger.debug(f"[FallbackParser] insider_object extraction failed: {e}")
            
        return products
    
    def _extract_datalayer(self, html: str, source_url: str) -> List[Dict]:
        """Extract products from dataLayer (common in Vatan and other sites)."""
        products = []
        
        try:
            # Find product data in dataLayer
            # Look for impressions or product arrays
            pattern = r'"products"\s*:\s*\[(.*?)\]'
            matches = re.findall(pattern, html, re.DOTALL)
            
            for match in matches:
                try:
                    # Try to parse each product
                    product_pattern = r'\{[^}]+\}'
                    product_matches = re.findall(product_pattern, match)
                    
                    for prod_str in product_matches[:5]:
                        # Clean and parse
                        prod_str = prod_str.strip()
                        if '"name"' in prod_str and '"price"' in prod_str:
                            product_data = json.loads(prod_str)
                            product = {
                                "name": product_data.get("name", ""),
                                "price": product_data.get("price"),
                                "currency": "TRY",
                                "in_stock": True,
                                "store_info": {
                                    "chain": self._get_store_from_url(source_url),
                                    "branch": "",
                                    "city": "",
                                    "district": ""
                                },
                                "source_url": source_url
                            }
                            if product["name"] and product["price"]:
                                products.append(product)
                except:
                    continue
                    
        except Exception as e:
            logger.debug(f"[FallbackParser] dataLayer extraction failed: {e}")
            
        return products
    
    def _extract_generic(self, html: str, source_url: str) -> List[Dict]:
        """Generic product extraction using BeautifulSoup."""
        products = []
        
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # Common product container selectors
            selectors = [
                '.product-item',
                '.product-card',
                '.product-list__item',
                '[data-product]',
                '.search-result-item'
            ]
            
            for selector in selectors:
                items = soup.select(selector)
                if items:
                    for item in items[:5]:
                        product = self._parse_product_element(item, source_url)
                        if product:
                            products.append(product)
                    break
                    
        except Exception as e:
            logger.debug(f"[FallbackParser] Generic extraction failed: {e}")
            
        return products
    
    def _parse_product_element(self, element, source_url: str) -> Optional[Dict]:
        """Parse a single product element."""
        try:
            # Try to find product name
            name_selectors = ['h2', 'h3', '.product-name', '.product-title', '[data-name]']
            name = ""
            for sel in name_selectors:
                name_elem = element.select_one(sel)
                if name_elem:
                    name = name_elem.get_text(strip=True)
                    break
            
            if not name:
                return None
                
            # Try to find price
            price_selectors = ['.price', '.product-price', '[data-price]', '.price-current']
            price = None
            for sel in price_selectors:
                price_elem = element.select_one(sel)
                if price_elem:
                    price_text = price_elem.get_text(strip=True)
                    # Extract numeric price
                    price_match = re.search(r'[\d.,]+', price_text.replace('.', '').replace(',', '.'))
                    if price_match:
                        price = float(price_match.group())
                    break
            
            return {
                "name": name,
                "price": price,
                "currency": "TRY",
                "in_stock": True,
                "store_info": {
                    "chain": self._get_store_from_url(source_url),
                    "branch": "",
                    "city": "",
                    "district": ""
                },
                "source_url": source_url
            }
            
        except Exception as e:
            return None
    
    def _get_store_from_url(self, url: str) -> str:
        """Extract store name from URL."""
        import urllib.parse
        try:
            domain = urllib.parse.urlparse(url).netloc.replace("www.", "").lower()
            
            # Complete mapping for all supported stores
            store_map = {
                # Electronics
                "vatanbilgisayar.com": "Vatan Bilgisayar",
                "teknosa.com": "Teknosa",
                "mediamarkt.com.tr": "MediaMarkt",
                "hepsiburada.com": "Hepsiburada",
                "trendyol.com": "Trendyol",
                # Appliances
                "arcelik.com.tr": "Arçelik",
                "beko.com.tr": "Beko",
                "vestel.com.tr": "Vestel",
                "bosch-home.com.tr": "Bosch",
                "siemens-home.bsh-group.com": "Siemens",
                # Clothing
                "flo.com.tr": "Flo",
                "lcwaikiki.com": "LC Waikiki",
                "koton.com": "Koton",
                "boyner.com.tr": "Boyner",
                "defacto.com.tr": "DeFacto",
                # Sports
                "decathlon.com.tr": "Decathlon",
                "nike.com": "Nike",
                "adidas.com.tr": "Adidas",
                "intersport.com.tr": "Intersport",
                "sportive.com.tr": "Sportive",
                # Cosmetics
                "gratis.com": "Gratis",
                "grfratis.com": "Gratis",
                "watsons.com.tr": "Watsons",
                "sephora.com.tr": "Sephora",
                "rossmann.com.tr": "Rossmann",
                "eve.com.tr": "Eve",
            }
            
            for domain_part, store_name in store_map.items():
                if domain_part in domain:
                    return store_name
            
            # Fallback: capitalize first part of domain
            return domain.split(".")[0].capitalize()
        except:
            return "Online Store"


# Singleton instance
fallback_parser = FallbackParser()
