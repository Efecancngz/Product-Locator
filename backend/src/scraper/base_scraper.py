from core.interfaces.scraper import AbstractScraper
from typing import List, Optional
from src.models.product import ProductStock
import logging

# Configure Basic Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BaseScraper(AbstractScraper):
    """
    Base implementation with common functionality.
    Specific store scrapers should inherit from this (or directly from AbstractScraper).
    """
    
    async def search(self, query: str, city: Optional[str] = None, district: Optional[str] = None) -> List[ProductStock]:
        # This method is meant to be overridden, but we provide a default logging here
        logger.info(f"Searching {self.store_name} for '{query}' in {city}/{district}")
        return []

    def normalize_string(self, text: str) -> str:
        """Helper to normalize text for comparison (lowercase, strip, turkish char handling)."""
        if not text:
            return ""
        # TODO: Add proper TR char mapping
        return text.lower().strip()
