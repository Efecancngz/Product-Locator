"""
Watchlist API Routes
CRUD operations for followed products and webhook stock checks.
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Optional
from src.models.watchlist import (
    WatchlistItemCreate,
    WatchlistItemResponse,
    WatchlistResponse,
    WatchlistItemUpdate
)
from src.services.db_service import db_service
from src.services.report_service import ReportService
from src.services.search_service import SearchService
from src.middleware.auth import get_current_user
import logging
import httpx

logger = logging.getLogger(__name__)
router = APIRouter(tags=["watchlist"])
search_service = SearchService()


@router.get(
    "/watchlist",
    response_model=WatchlistResponse,
    summary="Get User Watchlist",
    description="Retrieves list of followed products for price/stock alerts.",
)
async def get_watchlist(
    user: Optional[dict] = Depends(get_current_user)
):
    user_id = user["uid"] if user else "dev-user"
    items = await db_service.get_watchlist(user_id)
    return {"items": items, "total": len(items)}


@router.post(
    "/watchlist",
    response_model=WatchlistItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add to Watchlist",
    description="Adds a product to the user followed watchlist for price/stock tracking.",
)
async def add_to_watchlist(
    payload: WatchlistItemCreate,
    user: Optional[dict] = Depends(get_current_user)
):
    user_id = user["uid"] if user else "dev-user"
    item_data = payload.model_dump()
    
    item_id = await db_service.add_to_watchlist(user_id, item_data)
    if not item_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to follow product."
        )
        
    created = await db_service.get_watchlist_item_by_id(item_id)
    if not created:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Followed product created but could not be retrieved."
        )
    return created


@router.delete(
    "/watchlist/{id}",
    summary="Remove from Watchlist",
    description="Removes a product from the user's alert watchlist.",
)
async def remove_from_watchlist(
    id: str,
    user: Optional[dict] = Depends(get_current_user)
):
    user_id = user["uid"] if user else "dev-user"
    success = await db_service.delete_from_watchlist(user_id, id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Watchlist item not found: {id}"
        )
    return {"message": "Successfully unfollowed product", "id": id}


@router.patch(
    "/watchlist/{id}/toggle",
    response_model=WatchlistItemResponse,
    summary="Toggle Watchlist Notifications",
    description="Enables or disables notification alerts for a followed product.",
)
async def toggle_watchlist_notifications(
    id: str,
    enabled: bool = Query(..., description="Enable or disable notifications"),
    user: Optional[dict] = Depends(get_current_user)
):
    user_id = user["uid"] if user else "dev-user"
    success = await db_service.update_watchlist_item(user_id, id, {"notifications_enabled": enabled})
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Watchlist item not found: {id}"
        )
        
    updated = await db_service.get_watchlist_item_by_id(id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Product updated but could not be retrieved."
        )
    return updated


@router.post(
    "/watchlist/check",
    summary="Execute Watchlist Scan Check",
    description="Performs real-time search scans for followed items to detect price/stock status changes, triggering alerts.",
)
async def execute_watchlist_check():
    items = await db_service.get_all_watchlist_items()
    logger.info(f"[WatchlistCheck] Scanning {len(items)} items for stock/price changes...")
    
    # Load report settings
    from src.routes.admin import get_report_settings
    cfg = await get_report_settings()
    
    telegram_config = None
    email_config = None
    webhook_url = cfg.get("webhook_url", "")
    
    if cfg.get("telegram_bot_token") and cfg.get("telegram_chat_id"):
        telegram_config = {
            "botToken": cfg["telegram_bot_token"],
            "chatId": cfg["telegram_chat_id"]
        }
    if cfg.get("smtp_username"):
        email_config = {
            "smtpHost": cfg.get("smtp_host", "smtp.gmail.com"),
            "smtpPort": cfg.get("smtp_port", "587"),
            "username": cfg["smtp_username"],
            "password": cfg.get("smtp_password", ""),
            "smtpFrom": cfg.get("smtp_from", cfg["smtp_username"])
        }
        
    results = []
    
    for item in items:
        user_id = item.get("user_id", "dev-user")
        item_id = item.get("id")
        
        product_name = item["product_name"]
        city = item["city"]
        district = item.get("district")
        category = item.get("category", "all")
        store_name = item["store_name"]
        branch = item.get("branch")
        
        prev_stock = item.get("last_stock_status", "UNKNOWN")
        prev_price = item.get("last_price")
        notifications_enabled = item.get("notifications_enabled", True)
        
        logger.info(f"[WatchlistCheck] Checking: '{product_name}' at {store_name} ({branch or 'any'}) in {city}")
        
        try:
            # Perform search query
            search_res = await search_service.search_products(
                query=product_name,
                city=city,
                district=district,
                category=category
            )
            
            # Find the matching branch product
            matched_prod = None
            for p in search_res.found_products:
                if (p.store_location.store_name.lower() == store_name.lower() and
                    (not branch or (p.store_location.branch and p.store_location.branch.lower() == branch.lower()))):
                    matched_prod = p
                    break
            
            current_stock = "OUT_OF_STOCK"
            current_price = prev_price
            
            if matched_prod:
                current_stock = matched_prod.stock_status.value
                current_price = matched_prod.price
                
            # Log changes
            logger.info(f"[WatchlistCheck] '{product_name}' | Stock: {prev_stock} -> {current_stock} | Price: {prev_price} -> {current_price}")
            
            # Trigger alerts conditions
            alert_triggered = False
            alert_reason = ""
            
            # 1. Stock Status Transition: OUT_OF_STOCK/UNKNOWN -> IN_STOCK
            if current_stock == "IN_STOCK" and prev_stock in ["OUT_OF_STOCK", "UNKNOWN"]:
                alert_triggered = True
                alert_reason = "Stok Geldi (In Stock)"
                
            # 2. Price Decrease
            elif current_price is not None and prev_price is not None and current_price < prev_price:
                alert_triggered = True
                alert_reason = "Fiyat Düştü (Price Drop)"
                
            # Update watchlist state
            await db_service.update_watchlist_item(user_id, item_id, {
                "last_stock_status": current_stock,
                "last_price": current_price
            })
            
            # Send notifications if triggered and enabled
            if alert_triggered and notifications_enabled:
                logger.info(f"[WatchlistCheck] Alert triggered: {alert_reason} for '{product_name}'")
                
                # A. Send via ReportSystem (Email / Telegram)
                recipient = email_config.get("smtpFrom", "admin") if email_config else "admin"
                rs_result = await ReportService.send_in_stock_alert(
                    recipient=recipient,
                    product_name=product_name,
                    store_name=store_name,
                    branch_name=branch or "Ana Şube",
                    city=city,
                    district=district or "",
                    price=current_price or 0.0,
                    telegram_config=telegram_config,
                    email_config=email_config
                )
                
                # B. Send Webhook callback if configured
                webhook_result = None
                if webhook_url:
                    try:
                        async with httpx.AsyncClient(timeout=5.0) as client:
                            webhook_payload = {
                                "event": "watchlist_alert",
                                "reason": alert_reason,
                                "product_name": product_name,
                                "store_name": store_name,
                                "branch": branch,
                                "city": city,
                                "district": district,
                                "price": current_price,
                                "prev_price": prev_price,
                                "prev_stock": prev_stock,
                                "current_stock": current_stock,
                                "source_url": item["source_url"]
                            }
                            resp = await client.post(webhook_url, json=webhook_payload)
                            webhook_result = {"status": resp.status_code, "body": resp.text}
                    except Exception as web_err:
                        webhook_result = {"error": str(web_err)}
                        logger.error(f"[WatchlistCheck] Webhook dispatch failed: {web_err}")
                
                results.append({
                    "product_name": product_name,
                    "alert_triggered": True,
                    "reason": alert_reason,
                    "report_system": rs_result,
                    "webhook": webhook_result
                })
            else:
                results.append({
                    "product_name": product_name,
                    "alert_triggered": False
                })
                
        except Exception as scan_err:
            logger.error(f"[WatchlistCheck] Scan failed for item {item_id}: {scan_err}", exc_info=True)
            results.append({
                "product_name": product_name,
                "success": False,
                "error": str(scan_err)
            })
            
    return {"message": "Scan check completed", "results": results}
