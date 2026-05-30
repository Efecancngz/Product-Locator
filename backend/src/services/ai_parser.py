"""
AI Parser Service - Uses Gemini to extract structured product data from HTML
"""
import json
import logging
from typing import Dict, List, Optional
import google.generativeai as genai
from src.config.settings import settings

logger = logging.getLogger(__name__)

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)

EXTRACTION_PROMPT = """
You are a web scraping expert. Extract product and store availability information from the following HTML content.

HTML Content:
{html_content}

Source URL: {source_url}

Please return the extracted data strictly in the following JSON format (do not write anything else, only return valid JSON):
{{
  "products": [
    {{
      "name": "Full product title",
      "price": 1234.56,
      "currency": "TRY",
      "in_stock": true,
      "store_info": {{
        "chain": "Retail store brand chain name (e.g., Vatan Bilgisayar, Flo, LC Waikiki)",
        "branch": "Branch name (if available)",
        "city": "City name (if available)",
        "district": "District name (if available)"
      }},
      "image_url": "Product image URL (if available)"
    }}
  ]
}}

Rules:
1. Extract only real product listings, do not extract general categories or empty catalog links.
2. If the price cannot be identified, assign it a null value.
3. If store chain information is missing, infer the brand from the source URL.
4. Extract a maximum of 5 products from the page.
5. Preserve Turkish characters exactly as they appear in the HTML content.
"""


class AIParser:
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        
    async def parse_html(self, html: str, source_url: str) -> List[Dict]:
        """
        Parse HTML content using Gemini AI to extract product information.
        
        Args:
            html: Raw HTML content (truncated to save tokens)
            source_url: URL of the page
            
        Returns:
            List of product dictionaries
        """
        try:
            # Truncate HTML to save tokens (keep first 30K chars)
            truncated_html = html[:30000] if len(html) > 30000 else html
            
            prompt = EXTRACTION_PROMPT.format(
                html_content=truncated_html,
                source_url=source_url
            )
            
            # Generate response
            response = self.model.generate_content(prompt)
            
            # Extract JSON from response
            response_text = response.text.strip()
            
            # Try to find JSON in response (sometimes model adds extra text)
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            response_text = response_text.strip()
            
            # Parse JSON
            data = json.loads(response_text)
            
            products = data.get("products", [])
            
            # Add source URL to each product
            for product in products:
                product["source_url"] = source_url
                
            logger.info(f"AI Parser extracted {len(products)} products from {source_url}")
            return products
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            logger.debug(f"Response was: {response_text[:500] if 'response_text' in locals() else 'N/A'}")
            return []
        except Exception as e:
            logger.error(f"AI Parser error for {source_url}: {e}")
            return []
    
    def extract_store_from_url(self, url: str) -> Optional[str]:
        """
        Fallback: Extract store name from URL domain.
        """
        import urllib.parse
        try:
            domain = urllib.parse.urlparse(url).netloc
            domain = domain.replace("www.", "")
            
            # Known mappings
            store_map = {
                "vatanbilgisayar.com": "Vatan Bilgisayar",
                "teknosa.com": "Teknosa",
                "mediamarkt.com.tr": "MediaMarkt",
                "flo.com.tr": "Flo",
                "lcwaikiki.com": "LC Waikiki",
                "koton.com": "Koton",
                "nike.com": "Nike",
                "intersport.com.tr": "Intersport",
                "decathlon.com.tr": "Decathlon",
                "boyner.com.tr": "Boyner",
            }
            
            for domain_part, store_name in store_map.items():
                if domain_part in domain:
                    return store_name
                    
            # Fallback: capitalize first part of domain
            return domain.split(".")[0].capitalize()
        except:
            return None


# Singleton instance
ai_parser = AIParser()
