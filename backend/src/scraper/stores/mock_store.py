from core.interfaces.scraper import AbstractScraper
from src.models.product import ProductStock, StoreLocation, StockStatus
from typing import List, Optional
import asyncio

class MockScraper(AbstractScraper):
    @property
    def store_name(self) -> str:
        return "MockStore"

    @property
    def base_url(self) -> str:
        return "https://mockstore.com"

    async def search(self, query: str, city: Optional[str] = None, district: Optional[str] = None) -> List[ProductStock]:
        # Simulate network delay
        await asyncio.sleep(0.5)
        
        if "iphone" in query.lower():
            return [
                ProductStock(
                    product_name="iPhone 15 Pro",
                    price=65000.0,
                    stock_status=StockStatus.IN_STOCK,
                    store_location=StoreLocation(
                        city="İstanbul", # Static City
                        district="Kadıköy", # Static District
                        store_name="MockStore Kadıköy Şube",
                        address="Bağdat Cad. No:1"
                    ),
                    source_url="https://www.apple.com/tr/iphone-15-pro/", # Real link example
                    currency="TRY"
                )
            ]
        return []
