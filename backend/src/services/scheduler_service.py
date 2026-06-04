"""
Scheduler Service — APScheduler-based background task scheduler.
Runs periodic watchlist stock/price scans and logs results to scan_history.
"""
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from src.config.settings import settings

logger = logging.getLogger(__name__)

JOB_ID = "watchlist_auto_scan"


class SchedulerService:
    """
    Singleton APScheduler wrapper that:
    - Runs inside the FastAPI event loop (AsyncIOScheduler)
    - Supports both cron (fixed time) and interval (every N hours) modes
    - Persists configuration to MongoDB / in-memory fallback
    - Logs every scan run to scan_history collection
    """

    def __init__(self):
        self.scheduler: Optional[AsyncIOScheduler] = None
        self.is_running = False

        # Current configuration (loaded from settings, overridable via API)
        self.config: Dict[str, Any] = {
            "enabled": settings.SCHEDULER_ENABLED,
            "cron_hour": settings.SCHEDULER_CRON_HOUR,
            "cron_minute": settings.SCHEDULER_CRON_MINUTE,
            "interval_hours": settings.SCHEDULER_INTERVAL_HOURS,  # 0 = cron mode
        }

    async def start(self):
        """Initialize and start the scheduler with the current configuration."""
        if self.scheduler and self.is_running:
            logger.info("[Scheduler] Already running.")
            return

        # Load persisted config from DB if available
        await self._load_config_from_db()

        if not self.config.get("enabled", True):
            logger.info("[Scheduler] Disabled by configuration. Skipping start.")
            return

        self.scheduler = AsyncIOScheduler(timezone="UTC")
        self._add_job()
        self.scheduler.start()
        self.is_running = True

        next_run = self._get_next_run_time()
        logger.info(
            f"[Scheduler] Started successfully. "
            f"Mode: {'interval' if self.config['interval_hours'] > 0 else 'cron'}. "
            f"Next run: {next_run}"
        )

    def stop(self):
        """Gracefully shutdown the scheduler."""
        if self.scheduler and self.is_running:
            self.scheduler.shutdown(wait=False)
            self.is_running = False
            logger.info("[Scheduler] Stopped.")

    async def reschedule(self, config: Dict[str, Any]):
        """Update schedule configuration and reschedule the job."""
        self.config.update(config)
        await self._save_config_to_db()

        if not self.scheduler or not self.is_running:
            logger.info("[Scheduler] Not running. Config saved, will apply on next start.")
            return

        # Remove old job and add with new trigger
        try:
            self.scheduler.remove_job(JOB_ID)
        except Exception:
            pass

        self._add_job()
        next_run = self._get_next_run_time()
        logger.info(f"[Scheduler] Rescheduled. Next run: {next_run}")

    async def run_now(self) -> Dict[str, Any]:
        """Execute a watchlist scan immediately (bypasses schedule)."""
        logger.info("[Scheduler] Manual scan triggered.")
        return await self._execute_scan()

    def get_status(self) -> Dict[str, Any]:
        """Return current scheduler state."""
        next_run = self._get_next_run_time()
        mode = "interval" if self.config.get("interval_hours", 0) > 0 else "cron"

        return {
            "is_running": self.is_running,
            "enabled": self.config.get("enabled", True),
            "mode": mode,
            "cron_hour": self.config.get("cron_hour", 3),
            "cron_minute": self.config.get("cron_minute", 0),
            "interval_hours": self.config.get("interval_hours", 0),
            "next_run_time": next_run,
        }

    # ---- Internal Methods ----

    def _add_job(self):
        """Add the scan job with the appropriate trigger."""
        if self.config.get("interval_hours", 0) > 0:
            trigger = IntervalTrigger(hours=self.config["interval_hours"])
        else:
            trigger = CronTrigger(
                hour=self.config.get("cron_hour", 3),
                minute=self.config.get("cron_minute", 0),
            )

        self.scheduler.add_job(
            self._execute_scan,
            trigger=trigger,
            id=JOB_ID,
            replace_existing=True,
            name="Watchlist Auto Scan",
        )

    def _get_next_run_time(self) -> Optional[str]:
        """Get the next scheduled run time as ISO string."""
        if not self.scheduler or not self.is_running:
            return None
        try:
            job = self.scheduler.get_job(JOB_ID)
            if job and job.next_run_time:
                return job.next_run_time.isoformat()
        except Exception:
            pass
        return None

    async def _execute_scan(self) -> Dict[str, Any]:
        """
        Core scan logic — reuses the existing watchlist check pipeline.
        Logs results to scan_history.
        """
        from src.services.db_service import db_service
        from src.services.search_service import SearchService
        from src.services.report_service import ReportService
        from src.routes.admin import get_report_settings

        scan_start = datetime.now(timezone.utc)
        logger.info(f"[Scheduler] Scan started at {scan_start.isoformat()}")

        items = await db_service.get_all_watchlist_items()
        total_items = len(items)
        alerts_triggered = 0
        errors = 0
        results = []

        if total_items == 0:
            logger.info("[Scheduler] No watchlist items to scan.")
            scan_record = {
                "started_at": scan_start,
                "completed_at": datetime.now(timezone.utc),
                "total_items": 0,
                "alerts_triggered": 0,
                "errors": 0,
                "trigger": "scheduled",
                "results": [],
            }
            await db_service.add_scan_history(scan_record)
            return scan_record

        # Load report settings
        cfg = await get_report_settings()
        telegram_config = None
        email_config = None
        webhook_url = cfg.get("webhook_url", "")

        if cfg.get("telegram_bot_token") and cfg.get("telegram_chat_id"):
            telegram_config = {
                "botToken": cfg["telegram_bot_token"],
                "chatId": cfg["telegram_chat_id"],
            }
        if cfg.get("smtp_username"):
            email_config = {
                "smtpHost": cfg.get("smtp_host", "smtp.gmail.com"),
                "smtpPort": cfg.get("smtp_port", "587"),
                "username": cfg["smtp_username"],
                "password": cfg.get("smtp_password", ""),
                "smtpFrom": cfg.get("smtp_from", cfg["smtp_username"]),
            }

        search_service = SearchService()

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

            try:
                search_res = await search_service.search_products(
                    query=product_name,
                    city=city,
                    district=district,
                    category=category,
                )

                matched_prod = None
                for p in search_res.found_products:
                    if p.store_location.store_name.lower() == store_name.lower() and (
                        not branch
                        or (
                            p.store_location.branch
                            and p.store_location.branch.lower() == branch.lower()
                        )
                    ):
                        matched_prod = p
                        break

                current_stock = "OUT_OF_STOCK"
                current_price = prev_price

                if matched_prod:
                    current_stock = matched_prod.stock_status.value
                    current_price = matched_prod.price

                alert_triggered = False
                alert_reason = ""

                if current_stock == "IN_STOCK" and prev_stock in [
                    "OUT_OF_STOCK",
                    "UNKNOWN",
                ]:
                    alert_triggered = True
                    alert_reason = "Stok Geldi (In Stock)"

                elif (
                    current_price is not None
                    and prev_price is not None
                    and current_price < prev_price
                ):
                    alert_triggered = True
                    alert_reason = "Fiyat Düştü (Price Drop)"

                # Update watchlist state
                await db_service.update_watchlist_item(
                    user_id,
                    item_id,
                    {"last_stock_status": current_stock, "last_price": current_price},
                )

                if alert_triggered and notifications_enabled:
                    alerts_triggered += 1

                    # Send via ReportSystem
                    recipient = (
                        email_config.get("smtpFrom", "admin") if email_config else "admin"
                    )
                    try:
                        await ReportService.send_in_stock_alert(
                            recipient=recipient,
                            product_name=product_name,
                            store_name=store_name,
                            branch_name=branch or "Ana Şube",
                            city=city,
                            district=district or "",
                            price=current_price or 0.0,
                            telegram_config=telegram_config,
                            email_config=email_config,
                        )
                    except Exception as rs_err:
                        logger.error(f"[Scheduler] ReportService error: {rs_err}")

                    # Send webhook
                    if webhook_url:
                        try:
                            import httpx

                            async with httpx.AsyncClient(timeout=5.0) as client:
                                await client.post(
                                    webhook_url,
                                    json={
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
                                        "source_url": item.get("source_url", ""),
                                    },
                                )
                        except Exception as wh_err:
                            logger.error(f"[Scheduler] Webhook error: {wh_err}")

                results.append(
                    {
                        "product_name": product_name,
                        "alert_triggered": alert_triggered,
                        "reason": alert_reason if alert_triggered else None,
                    }
                )

            except Exception as scan_err:
                errors += 1
                logger.error(
                    f"[Scheduler] Scan failed for '{product_name}': {scan_err}",
                    exc_info=True,
                )
                results.append(
                    {
                        "product_name": product_name,
                        "alert_triggered": False,
                        "error": str(scan_err),
                    }
                )

        scan_end = datetime.now(timezone.utc)
        scan_record = {
            "started_at": scan_start,
            "completed_at": scan_end,
            "duration_seconds": (scan_end - scan_start).total_seconds(),
            "total_items": total_items,
            "alerts_triggered": alerts_triggered,
            "errors": errors,
            "trigger": "scheduled",
            "results": results,
        }

        await db_service.add_scan_history(scan_record)
        logger.info(
            f"[Scheduler] Scan completed. Items: {total_items}, "
            f"Alerts: {alerts_triggered}, Errors: {errors}, "
            f"Duration: {scan_record['duration_seconds']:.1f}s"
        )

        return scan_record

    async def _load_config_from_db(self):
        """Load persisted scheduler config from MongoDB if available."""
        from src.services.db_service import db_service

        if db_service.is_mongodb_active and db_service.db is not None:
            try:
                doc = await db_service.db.scheduler_config.find_one(
                    {"_id": "scheduler_settings"}
                )
                if doc:
                    self.config["enabled"] = doc.get("enabled", self.config["enabled"])
                    self.config["cron_hour"] = doc.get("cron_hour", self.config["cron_hour"])
                    self.config["cron_minute"] = doc.get(
                        "cron_minute", self.config["cron_minute"]
                    )
                    self.config["interval_hours"] = doc.get(
                        "interval_hours", self.config["interval_hours"]
                    )
                    logger.info(f"[Scheduler] Loaded config from MongoDB: {self.config}")
            except Exception as e:
                logger.warning(f"[Scheduler] Failed to load config from DB: {e}")

    async def _save_config_to_db(self):
        """Persist scheduler config to MongoDB if available."""
        from src.services.db_service import db_service

        if db_service.is_mongodb_active and db_service.db is not None:
            try:
                await db_service.db.scheduler_config.update_one(
                    {"_id": "scheduler_settings"},
                    {"$set": self.config},
                    upsert=True,
                )
                logger.info("[Scheduler] Config saved to MongoDB.")
            except Exception as e:
                logger.warning(f"[Scheduler] Failed to save config to DB: {e}")


# Singleton
scheduler_service = SchedulerService()
