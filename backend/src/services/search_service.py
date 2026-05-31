"""
Search Service - Updated to use AI-Powered Search Orchestrator
Now with proper branch distribution across all city locations
"""
import asyncio
from typing import List, Optional, Dict
from src.models.product import SearchResult, ProductStock, StockStatus, StoreLocation
from src.services.search_orchestrator import search_orchestrator
import logging
import copy

logger = logging.getLogger(__name__)


class SearchService:
    def __init__(self):
        pass  # Using singleton orchestrator
    
    async def search_products(self, query: str, city: Optional[str] = None, district: Optional[str] = None, category: Optional[str] = None) -> SearchResult:
        """
        Search for products using AI-powered orchestrator.
        
        Args:
            query: Product search query
            city: Optional city filter
            district: Optional district filter
            category: Optional category filter
            
        Returns:
            SearchResult with found products
        """
        logger.info(f"[SearchService] Searching for: {query} (city={city}, district={district}, category={category})")
        
        # 1. Caching Layer Check — Redis first, then MongoDB fallback
        from src.services.redis_service import redis_service
        from src.services.db_service import db_service

        # Try Redis (sub-millisecond)
        try:
            cached_data = await redis_service.get_cached_search(f"{query}_{category}" if category else query, city, district)
            if cached_data:
                logger.info(f"[SearchService] Redis cache HIT for query: '{query}'")
                return SearchResult.model_validate(cached_data)
        except Exception as redis_err:
            logger.error(f"[SearchService] Redis cache read failed: {redis_err}")

        # Try MongoDB (fallback)
        try:
            cached_data = await db_service.get_cached_search(f"{query}_{category}" if category else query, city, district)
            if cached_data:
                logger.info(f"[SearchService] MongoDB cache HIT for query: '{query}'")
                return SearchResult.model_validate(cached_data)
        except Exception as cache_err:
            logger.error(f"[SearchService] MongoDB cache read failed: {cache_err}")
            
        try:
            # Use orchestrator with 180 second timeout (scraping + AI parsing takes time)
            raw_results = await asyncio.wait_for(
                search_orchestrator.search(query, city, district, category),
                timeout=180.0
            )
            logger.info(f"[SearchService] Orchestrator returned {len(raw_results)} raw results")
        except asyncio.TimeoutError:
            logger.error(f"[SearchService] Search timed out for: {query}")
            return SearchResult(query=query, found_products=[], total_found=0)
        except Exception as e:
            logger.error(f"[SearchService] Search failed: {e}", exc_info=True)
            return SearchResult(query=query, found_products=[], total_found=0)
        
        # Map AI results to ProductStock models
        all_products: List[ProductStock] = []
        
        for item in raw_results:
            try:
                product = self._map_to_product_stock(item)
                if product:
                    all_products.append(product)
            except Exception as e:
                logger.error(f"[SearchService] Failed to map item: {e}")
                continue
        
        # --- Manual Products Integration ---
        # Merge manually entered products (stores without websites) into the search results
        try:
            manual_results = await db_service.search_manual_products(query, city, category)
            for mp in manual_results:
                manual_product = ProductStock(
                    product_name=mp.get("product_name", ""),
                    price=mp.get("price"),
                    currency=mp.get("currency", "TRY"),
                    stock_status=StockStatus.IN_STOCK if mp.get("in_stock", True) else StockStatus.OUT_OF_STOCK,
                    store_location=StoreLocation(
                        store_name=mp.get("store_name", "Manuel Mağaza"),
                        city=mp.get("city", ""),
                        district=mp.get("district"),
                        branch=mp.get("branch", ""),
                        address=mp.get("address"),
                        latitude=mp.get("latitude"),
                        longitude=mp.get("longitude"),
                    ),
                    source_url=f"manual-entry:{mp.get('id', '')}"
                )
                all_products.append(manual_product)
            if manual_results:
                logger.info(f"[SearchService] Added {len(manual_results)} manual products to results")
        except Exception as manual_err:
            logger.error(f"[SearchService] Manual products search failed: {manual_err}")
        
        # Enrich with store coordinates and branch info
        from src.services.store_service import store_service
        
        # Build city stores cache for all chains
        city_stores_cache: Dict[str, List[Dict]] = {}
        
        if city:
            all_city_stores = store_service.get_stores_by_city(city)
            for store in all_city_stores:
                chain = store.get("chain", "")
                if chain not in city_stores_cache:
                    city_stores_cache[chain] = []
                city_stores_cache[chain].append(store)
            logger.info(f"[SearchService] Found stores in {city}: {list(city_stores_cache.keys())}")
        
        # Process products and distribute across branches
        enriched_products: List[ProductStock] = []
        
        for product in all_products:
            chain = product.store_location.store_name
            branch = product.store_location.branch
            
            # Fuzzy match chain in city_stores_cache
            matched_chain_key = None
            chain_normalized = store_service._normalize_name(chain)
            for cache_chain in city_stores_cache.keys():
                cache_chain_norm = store_service._normalize_name(cache_chain)
                if cache_chain_norm == chain_normalized or \
                   chain_normalized in cache_chain_norm or \
                   cache_chain_norm in chain_normalized:
                    matched_chain_key = cache_chain
                    break
            
            # If we have city stores for this chain and no specific branch
            if matched_chain_key and city_stores_cache[matched_chain_key]:
                stores_in_city = city_stores_cache[matched_chain_key]
                
                # If district is specified, filter by district first
                # If district is specified, filter by district first
                if district:
                    norm_district = store_service._normalize_name(district)
                    logger.info(f"[SearchService] Filtering stores for district: {district} (normalized: {norm_district})")
                    
                    district_stores = []
                    for s in stores_in_city:
                        s_dist = store_service._normalize_name(s.get("district", ""))
                        # Check for exact match or substring match (e.g. "Konak" in "Merkez Konak")
                        if norm_district == s_dist or norm_district in s_dist or s_dist in norm_district:
                            district_stores.append(s)
                            
                    if district_stores:
                        logger.info(f"[SearchService] Found {len(district_stores)} stores in {district}")
                        stores_in_city = district_stores
                    else:
                        logger.warning(f"[SearchService] No stores found in {district}, showing all {len(stores_in_city)} city stores")
                
                # If product has no branch or branch is generic, create copies for each store
                if not branch or branch.startswith("Satıcı:") or branch == "" or branch == "/":
                    # Create a product entry for EACH branch in the city
                    for store in stores_in_city:
                        product_copy = copy.deepcopy(product)
                        product_copy.store_location.branch = store.get("branch", "")
                        product_copy.store_location.latitude = store.get("lat")
                        product_copy.store_location.longitude = store.get("lng")
                        product_copy.store_location.address = store.get("address", "")
                        product_copy.store_location.city = store.get("city", city or "")
                        product_copy.store_location.district = store.get("district", "")
                        enriched_products.append(product_copy)
                        logger.debug(f"[SearchService] Created branch copy: {chain} - {store.get('branch')}")
                else:
                    # Product has specific branch info, try to enrich with coordinates (fuzzy branch name matching)
                    matched = False
                    branch_normalized = store_service._normalize_name(branch)
                    for store in stores_in_city:
                        store_branch_norm = store_service._normalize_name(store.get("branch", ""))
                        if store_branch_norm == branch_normalized or \
                           branch_normalized in store_branch_norm or \
                           store_branch_norm in branch_normalized:
                            product.store_location.latitude = store.get("lat")
                            product.store_location.longitude = store.get("lng")
                            product.store_location.address = store.get("address", "")
                            product.store_location.city = store.get("city", city or "")
                            product.store_location.district = store.get("district", "")
                            matched = True
                            break
                    
                    if not matched:
                        # No exact match, use first store as fallback
                        fallback_store = stores_in_city[0]
                        product.store_location.latitude = fallback_store.get("lat")
                        product.store_location.longitude = fallback_store.get("lng")
                        product.store_location.city = fallback_store.get("city", city or "")
                        product.store_location.district = fallback_store.get("district", "")
                    
                    enriched_products.append(product)
            else:
                # Chain not in city cache, try global coordinate lookup with full info
                store_info = store_service.get_store_info(chain, branch)
                if store_info:
                    product.store_location.latitude = store_info.get("lat")
                    product.store_location.longitude = store_info.get("lng")
                    product.store_location.city = store_info.get("city", city or "")
                    product.store_location.district = store_info.get("district", "")
                    product.store_location.branch = store_info.get("branch", "")
                    product.store_location.address = store_info.get("address", "")
                    logger.debug(f"[SearchService] Enriched {chain} with store info from {store_info.get('city')}/{store_info.get('district')}")
                elif city:
                    # If no store info but city was provided, at least set city
                    product.store_location.city = city
                
                enriched_products.append(product)
        
        # Final District Check: Ensure all products strictly match the requested district if provided
        if district:
            norm_req_district = store_service._normalize_name(district)
            final_filtered = []
            for p in enriched_products:
                p_dist = store_service._normalize_name(p.store_location.district or "")
                # Accept if exact match or if one contains the other (fuzzy match)
                if norm_req_district == p_dist or norm_req_district in p_dist or p_dist in norm_req_district:
                    final_filtered.append(p)
            
            logger.info(f"[SearchService] Post-enrichment filtered from {len(enriched_products)} to {len(final_filtered)} products for district {district}")
            enriched_products = final_filtered

        # Limit total results to avoid overwhelming the UI
        MAX_RESULTS = 30
        if len(enriched_products) > MAX_RESULTS:
            enriched_products = enriched_products[:MAX_RESULTS]
        
        logger.info(f"[SearchService] Returning {len(enriched_products)} products (from {len(all_products)} unique)")
        
        result_to_return = SearchResult(
            query=query,
            found_products=enriched_products,
            total_found=len(enriched_products)
        )
        
        # 2. Caching Layer Store — Redis (fast) + MongoDB (persistent)
        try:
            await redis_service.cache_search(f"{query}_{category}" if category else query, city, district, result_to_return.model_dump())
        except Exception as redis_err:
            logger.error(f"[SearchService] Redis cache write failed: {redis_err}")
        try:
            await db_service.cache_search(f"{query}_{category}" if category else query, city, district, result_to_return.model_dump())
        except Exception as cache_err:
            logger.error(f"[SearchService] MongoDB cache write failed: {cache_err}")
            
        return result_to_return
    
    def _map_to_product_stock(self, item: dict) -> Optional[ProductStock]:
        """Map AI parser output to ProductStock model."""
        name = item.get("name")
        if not name:
            return None
        
        # Extract store info
        store_info = item.get("store_info", {})
        
        # Determine stock status
        in_stock = item.get("in_stock", True)
        stock_status = StockStatus.IN_STOCK if in_stock else StockStatus.OUT_OF_STOCK
        
        # Build store location
        store_location = StoreLocation(
            store_name=store_info.get("chain", "Online Store"),
            city=store_info.get("city", ""),
            district=store_info.get("district"),
            branch=store_info.get("branch"),
            address=store_info.get("address"),
            latitude=store_info.get("lat"),
            longitude=store_info.get("lng")
        )
        
        return ProductStock(
            product_name=name,
            price=item.get("price"),
            currency=item.get("currency", "TRY"),
            stock_status=stock_status,
            store_location=store_location,
            source_url=item.get("source_url", "")
        )

