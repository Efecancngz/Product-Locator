"""
Store Registry - Central configuration for all supported stores
Contains search URLs, selectors, and category information
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum


class StoreCategory(str, Enum):
    ELECTRONICS = "electronics"
    APPLIANCES = "appliances"  # Home appliances
    CLOTHING = "clothing"
    SPORTS = "sports"
    COSMETICS = "cosmetics"


@dataclass
class StoreConfig:
    """Configuration for a single store."""
    name: str
    domain: str
    search_url_template: str  # Use {query} placeholder
    category: StoreCategory
    enabled: bool = True
    selectors: Optional[Dict[str, str]] = None


# All supported stores organized by category
STORE_CONFIGS: Dict[str, StoreConfig] = {
    # ===== ELECTRONICS =====
    "teknosa": StoreConfig(
        name="Teknosa",
        domain="teknosa.com",
        search_url_template="https://www.teknosa.com/arama/?s={query}",
        category=StoreCategory.ELECTRONICS
    ),
    "vatan": StoreConfig(
        name="Vatan Bilgisayar",
        domain="vatanbilgisayar.com",
        search_url_template="https://www.vatanbilgisayar.com/arama/{query}/",
        category=StoreCategory.ELECTRONICS
    ),
    "mediamarkt": StoreConfig(
        name="MediaMarkt",
        domain="mediamarkt.com.tr",
        search_url_template="https://www.mediamarkt.com.tr/tr/search.html?query={query}",
        category=StoreCategory.ELECTRONICS
    ),
    "hepsiburada": StoreConfig(
        name="Hepsiburada",
        domain="hepsiburada.com",
        search_url_template="https://www.hepsiburada.com/ara?q={query}",
        category=StoreCategory.ELECTRONICS
    ),
    "trendyol": StoreConfig(
        name="Trendyol",
        domain="trendyol.com",
        search_url_template="https://www.trendyol.com/sr?q={query}",
        category=StoreCategory.ELECTRONICS
    ),
    
    # ===== APPLIANCES (Home Appliances) =====
    "arcelik": StoreConfig(
        name="Arçelik",
        domain="arcelik.com.tr",
        search_url_template="https://www.arcelik.com.tr/arama?text={query}",
        category=StoreCategory.APPLIANCES
    ),
    "beko": StoreConfig(
        name="Beko",
        domain="beko.com.tr",
        search_url_template="https://www.beko.com.tr/arama?text={query}",
        category=StoreCategory.APPLIANCES
    ),
    "vestel": StoreConfig(
        name="Vestel",
        domain="vestel.com.tr",
        search_url_template="https://www.vestel.com.tr/arama?q={query}",
        category=StoreCategory.APPLIANCES
    ),
    "bosch": StoreConfig(
        name="Bosch",
        domain="bosch-home.com.tr",
        search_url_template="https://www.bosch-home.com.tr/urun-listesi/{query}",
        category=StoreCategory.APPLIANCES
    ),
    "siemens": StoreConfig(
        name="Siemens",
        domain="siemens-home.bsh-group.com",
        search_url_template="https://www.siemens-home.bsh-group.com/tr/urun-listesi/{query}",
        category=StoreCategory.APPLIANCES
    ),
    
    # ===== CLOTHING =====
    "flo": StoreConfig(
        name="Flo",
        domain="flo.com.tr",
        search_url_template="https://www.flo.com.tr/arama?q={query}",
        category=StoreCategory.CLOTHING
    ),
    "lcwaikiki": StoreConfig(
        name="LC Waikiki",
        domain="lcwaikiki.com",
        search_url_template="https://www.lcwaikiki.com/tr-TR/TR/arama?q={query}",
        category=StoreCategory.CLOTHING
    ),
    "koton": StoreConfig(
        name="Koton",
        domain="koton.com",
        search_url_template="https://www.koton.com/tr/search?q={query}",
        category=StoreCategory.CLOTHING
    ),
    "boyner": StoreConfig(
        name="Boyner",
        domain="boyner.com.tr",
        search_url_template="https://www.boyner.com.tr/arama?q={query}",
        category=StoreCategory.CLOTHING
    ),
    "defacto": StoreConfig(
        name="DeFacto",
        domain="defacto.com.tr",
        search_url_template="https://www.defacto.com.tr/search?q={query}",
        category=StoreCategory.CLOTHING
    ),
    
    # ===== SPORTS =====
    "decathlon": StoreConfig(
        name="Decathlon",
        domain="decathlon.com.tr",
        search_url_template="https://www.decathlon.com.tr/search?Ntt={query}",
        category=StoreCategory.SPORTS
    ),
    "nike": StoreConfig(
        name="Nike",
        domain="nike.com",
        search_url_template="https://www.nike.com/tr/w?q={query}",
        category=StoreCategory.SPORTS
    ),
    "adidas": StoreConfig(
        name="Adidas",
        domain="adidas.com.tr",
        search_url_template="https://www.adidas.com.tr/tr/search?q={query}",
        category=StoreCategory.SPORTS
    ),
    "intersport": StoreConfig(
        name="Intersport",
        domain="intersport.com.tr",
        search_url_template="https://www.intersport.com.tr/arama?q={query}",
        category=StoreCategory.SPORTS
    ),
    "sportive": StoreConfig(
        name="Sportive",
        domain="sportive.com.tr",
        search_url_template="https://www.sportive.com.tr/arama?q={query}",
        category=StoreCategory.SPORTS
    ),
    
    # ===== COSMETICS =====
    "gratis": StoreConfig(
        name="Gratis",
        domain="grfratis.com",
        search_url_template="https://www.grfratis.com/arama?q={query}",
        category=StoreCategory.COSMETICS
    ),
    "watsons": StoreConfig(
        name="Watsons",
        domain="watsons.com.tr",
        search_url_template="https://www.watsons.com.tr/search?q={query}",
        category=StoreCategory.COSMETICS
    ),
    "sephora": StoreConfig(
        name="Sephora",
        domain="sephora.com.tr",
        search_url_template="https://www.sephora.com.tr/search?q={query}",
        category=StoreCategory.COSMETICS
    ),
    "rossmann": StoreConfig(
        name="Rossmann",
        domain="rossmann.com.tr",
        search_url_template="https://www.rossmann.com.tr/search?q={query}",
        category=StoreCategory.COSMETICS
    ),
    "eve": StoreConfig(
        name="Eve",
        domain="eve.com.tr",
        search_url_template="https://www.eve.com.tr/arama?q={query}",
        category=StoreCategory.COSMETICS
    ),
}


def get_stores_by_category(category: StoreCategory) -> List[StoreConfig]:
    """Get all stores in a specific category."""
    return [s for s in STORE_CONFIGS.values() if s.category == category and s.enabled]


def get_all_enabled_stores() -> List[StoreConfig]:
    """Get all enabled stores."""
    return [s for s in STORE_CONFIGS.values() if s.enabled]


def get_search_url(store_key: str, query: str) -> Optional[str]:
    """Get formatted search URL for a store."""
    import urllib.parse
    config = STORE_CONFIGS.get(store_key)
    if config and config.enabled:
        safe_query = urllib.parse.quote(query)
        return config.search_url_template.format(query=safe_query)
    return None


def get_store_by_domain(domain: str) -> Optional[StoreConfig]:
    """Find store config by domain."""
    domain_lower = domain.lower()
    for config in STORE_CONFIGS.values():
        if config.domain in domain_lower:
            return config
    return None


# Store name to key mapping for reverse lookup
STORE_NAME_TO_KEY = {config.name: key for key, config in STORE_CONFIGS.items()}


def get_store_key_by_name(name: str) -> Optional[str]:
    """Get store key from store name."""
    return STORE_NAME_TO_KEY.get(name)
