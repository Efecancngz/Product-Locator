"""
Store Service - Manages store database and coordinate enrichment
"""
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Load store database
STORES_JSON_PATH = Path(__file__).parent.parent / "data" / "stores.json"


class StoreService:
    def __init__(self):
        self.stores: Dict = {}
        self._load_stores()
    
    def _load_stores(self):
        """Load stores from JSON file."""
        try:
            if STORES_JSON_PATH.exists():
                with open(STORES_JSON_PATH, "r", encoding="utf-8") as f:
                    self.stores = json.load(f)
                logger.info(f"[StoreService] Loaded {len(self.stores)} store chains")
            else:
                logger.warning(f"[StoreService] stores.json not found at {STORES_JSON_PATH}")
        except Exception as e:
            logger.error(f"[StoreService] Failed to load stores: {e}")
    
    def get_coordinates(self, chain: str, branch: Optional[str] = None) -> Optional[Tuple[float, float]]:
        """
        Get coordinates for a store branch.
        
        Args:
            chain: Store chain name (e.g., "Vatan Bilgisayar")
            branch: Branch name (e.g., "Kadıköy")
            
        Returns:
            Tuple of (latitude, longitude) or None
        """
        # Normalize chain name
        chain_normalized = self._normalize_name(chain)
        if not chain_normalized:
            return None
        
        # Find matching chain with fuzzy matching
        for store_chain, branches in self.stores.items():
            store_chain_norm = self._normalize_name(store_chain)
            if store_chain_norm == chain_normalized or \
               chain_normalized in store_chain_norm or \
               store_chain_norm in chain_normalized:
                
                # If branch specified, try to find exact match
                if branch:
                    branch_normalized = self._normalize_name(branch)
                    for branch_name, data in branches.items():
                        if self._normalize_name(branch_name) == branch_normalized:
                            return (data.get("lat"), data.get("lng"))
                    
                    # Partial match
                    for branch_name, data in branches.items():
                        if branch_normalized in self._normalize_name(branch_name) or \
                           self._normalize_name(branch_name) in branch_normalized:
                            return (data.get("lat"), data.get("lng"))
                
                # Return first branch if no specific match
                first_branch = list(branches.values())[0] if branches else None
                if first_branch:
                    return (first_branch.get("lat"), first_branch.get("lng"))
        
        return None
    
    def get_store_info(self, chain: str, branch: Optional[str] = None) -> Optional[Dict]:
        """Get full store info including coordinates."""
        chain_normalized = self._normalize_name(chain)
        if not chain_normalized:
            return None
        
        for store_chain, branches in self.stores.items():
            store_chain_norm = self._normalize_name(store_chain)
            if store_chain_norm == chain_normalized or \
               chain_normalized in store_chain_norm or \
               store_chain_norm in chain_normalized:
                
                if branch:
                    branch_normalized = self._normalize_name(branch)
                    for branch_name, data in branches.items():
                        if self._normalize_name(branch_name) == branch_normalized or \
                           branch_normalized in self._normalize_name(branch_name):
                            return {
                                "chain": store_chain,
                                "branch": branch_name,
                                **data
                            }
                
                # Return first branch
                first_branch_name = list(branches.keys())[0] if branches else None
                if first_branch_name:
                    return {
                        "chain": store_chain,
                        "branch": first_branch_name,
                        **branches[first_branch_name]
                    }
        
        return None
    
    def get_stores_by_city(self, city: str) -> List[Dict]:
        """Get all stores in a city."""
        city_normalized = self._normalize_name(city)
        results = []
        
        for chain, branches in self.stores.items():
            for branch_name, data in branches.items():
                if self._normalize_name(data.get("city", "")) == city_normalized:
                    results.append({
                        "chain": chain,
                        "branch": branch_name,
                        **data
                    })
        
        return results
    
    def enrich_product_with_coordinates(self, product: Dict) -> Dict:
        """
        Add coordinates to a product based on store info.
        Modifies the product dict in place and returns it.
        """
        store_info = product.get("store_info", {})
        chain = store_info.get("chain")
        branch = store_info.get("branch")
        
        if chain:
            coords = self.get_coordinates(chain, branch)
            if coords and coords[0] and coords[1]:
                store_info["lat"] = coords[0]
                store_info["lng"] = coords[1]
                product["store_info"] = store_info
        
        return product
    
    def _normalize_name(self, name: str) -> str:
        """Normalize store/branch names for matching."""
        if not name:
            return ""
        
        # Lowercase
        result = name.lower().strip()
        
        # Turkish character normalization
        tr_chars = {
            "ı": "i", "ğ": "g", "ü": "u", "ş": "s", "ö": "o", "ç": "c",
            "İ": "i", "Ğ": "g", "Ü": "u", "Ş": "s", "Ö": "o", "Ç": "c"
        }
        for tr, en in tr_chars.items():
            result = result.replace(tr, en)
        
        return result
    
    def list_all_chains(self) -> List[str]:
        """Get list of all store chains."""
        return list(self.stores.keys())


# Singleton
store_service = StoreService()
