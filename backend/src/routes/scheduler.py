"""
Scheduler Admin API Routes
Provides endpoints to manage the background watchlist scan scheduler.
"""
from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import Optional
from src.services.scheduler_service import scheduler_service
from src.services.db_service import db_service
from src.middleware.auth import require_admin
from fastapi import Depends
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["scheduler"], dependencies=[Depends(require_admin)])


class SchedulerConfigModel(BaseModel):
    """Pydantic model for scheduler configuration updates."""
    enabled: Optional[bool] = None
    cron_hour: Optional[int] = Field(None, ge=0, le=23, description="Cron hour (0-23)")
    cron_minute: Optional[int] = Field(None, ge=0, le=59, description="Cron minute (0-59)")
    interval_hours: Optional[int] = Field(None, ge=0, le=168, description="Interval hours (0=cron mode, 1-168=interval)")


@router.get(
    "/admin/scheduler/status",
    summary="Get Scheduler Status",
    description="Returns the current state of the background watchlist scan scheduler, including next run time and last scan summary.",
)
async def get_scheduler_status():
    status_info = scheduler_service.get_status()
    
    # Attach last scan summary
    last_scan = await db_service.get_last_scan()
    if last_scan:
        # Remove heavy 'results' array for the status overview
        last_scan_summary = {
            "started_at": last_scan.get("started_at"),
            "completed_at": last_scan.get("completed_at"),
            "duration_seconds": last_scan.get("duration_seconds"),
            "total_items": last_scan.get("total_items", 0),
            "alerts_triggered": last_scan.get("alerts_triggered", 0),
            "errors": last_scan.get("errors", 0),
            "trigger": last_scan.get("trigger", "unknown"),
        }
        status_info["last_scan"] = last_scan_summary
    else:
        status_info["last_scan"] = None

    return status_info


@router.post(
    "/admin/scheduler/start",
    summary="Start Scheduler",
    description="Starts the background scheduler. If already running, returns current status.",
)
async def start_scheduler():
    if scheduler_service.is_running:
        return {"message": "Scheduler is already running.", **scheduler_service.get_status()}
    
    # Ensure enabled
    scheduler_service.config["enabled"] = True
    await scheduler_service.start()
    return {"message": "Scheduler started successfully.", **scheduler_service.get_status()}


@router.post(
    "/admin/scheduler/stop",
    summary="Stop Scheduler",
    description="Stops the background scheduler. Scheduled scans will not run until restarted.",
)
async def stop_scheduler():
    if not scheduler_service.is_running:
        return {"message": "Scheduler is already stopped.", **scheduler_service.get_status()}
    
    scheduler_service.stop()
    return {"message": "Scheduler stopped successfully.", **scheduler_service.get_status()}


@router.post(
    "/admin/scheduler/configure",
    summary="Configure Scheduler",
    description="Updates the scheduler cron/interval settings. The scheduler is automatically rescheduled.",
)
async def configure_scheduler(config: SchedulerConfigModel):
    update = {}
    if config.enabled is not None:
        update["enabled"] = config.enabled
    if config.cron_hour is not None:
        update["cron_hour"] = config.cron_hour
    if config.cron_minute is not None:
        update["cron_minute"] = config.cron_minute
    if config.interval_hours is not None:
        update["interval_hours"] = config.interval_hours

    if not update:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No configuration parameters provided."
        )

    await scheduler_service.reschedule(update)
    return {"message": "Scheduler reconfigured.", **scheduler_service.get_status()}


@router.post(
    "/admin/scheduler/run-now",
    summary="Run Scan Now",
    description="Triggers an immediate watchlist scan without waiting for the next scheduled time.",
)
async def run_scan_now():
    logger.info("[SchedulerAPI] Manual scan triggered via API.")
    
    # Override the trigger field to 'manual' for this run
    result = await scheduler_service.run_now()
    if result:
        result["trigger"] = "manual"
    
    return {"message": "Scan completed.", "scan": result}


@router.get(
    "/admin/scheduler/history",
    summary="Get Scan History",
    description="Returns paginated history of completed watchlist scans.",
)
async def get_scan_history(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
):
    skip = (page - 1) * per_page
    scans, total = await db_service.get_scan_history(limit=per_page, skip=skip)
    
    # Strip heavy 'results' arrays from list view
    for scan in scans:
        if "results" in scan:
            scan["result_count"] = len(scan["results"])
            del scan["results"]
    
    return {
        "scans": scans,
        "total": total,
        "page": page,
        "per_page": per_page,
    }
