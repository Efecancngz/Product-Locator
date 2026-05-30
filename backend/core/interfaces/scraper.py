from abc import ABC, abstractmethod
from typing import List, Dict, Optional
from src.models.product import ProductStock

class AbstractScraper(ABC):
    """
    Interface for all store scrapers.
    Follows Open-Closed Principle: New stores implement this interface without changing core logic.
    """
    
    def __init__(self, config: Optional[Dict] = None):
        self.config = config or {}

    @property
    @abstractmethod
    def store_name(self) -> str:
        """Returns the name of the store (e.g., 'Teknosa', 'MediaMarkt')."""
        pass

    @property
    @abstractmethod
    def base_url(self) -> str:
        """Base URL of the store."""
        pass

    @abstractmethod
    async def search(self, query: str, city: Optional[str] = None, district: Optional[str] = None) -> List[ProductStock]:
        """
        Search for a product in the given location.
        
        Args:
            query: The product name to search for.
            city: The city to filter by (optional).
            district: The district to filter by (optional).
            
        Returns:
            List of ProductStock objects found.
        """
        pass
