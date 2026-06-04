"""
Scheduler API Tests
Tests for the background watchlist scan scheduler management endpoints.
"""
import pytest
from fastapi import status
from unittest.mock import patch, AsyncMock
from src.services.scheduler_service import scheduler_service
from src.services.db_service import db_service


def test_scheduler_status(client):
    """
    Objective: Verify scheduler status endpoint returns HTTP 200 with expected fields.
    """
    response = client.get("/api/v1/admin/scheduler/status")
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert "is_running" in data
    assert "enabled" in data
    assert "mode" in data
    assert "cron_hour" in data
    assert "cron_minute" in data
    assert "interval_hours" in data
    assert "last_scan" in data


def test_scheduler_start_stop(client):
    """
    Objective: Verify scheduler can be started and stopped via API.
    """
    # Stop first (if running)
    stop_resp = client.post("/api/v1/admin/scheduler/stop")
    assert stop_resp.status_code == status.HTTP_200_OK
    
    # Verify stopped
    status_resp = client.get("/api/v1/admin/scheduler/status")
    assert status_resp.json()["is_running"] is False
    
    # Start
    start_resp = client.post("/api/v1/admin/scheduler/start")
    assert start_resp.status_code == status.HTTP_200_OK
    assert start_resp.json()["is_running"] is True
    
    # Stop again for cleanup
    client.post("/api/v1/admin/scheduler/stop")


def test_scheduler_configure_cron(client):
    """
    Objective: Verify cron schedule can be configured via API.
    """
    config_payload = {
        "cron_hour": 6,
        "cron_minute": 30,
        "interval_hours": 0  # Cron mode
    }
    response = client.post("/api/v1/admin/scheduler/configure", json=config_payload)
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert data["mode"] == "cron"
    assert data["cron_hour"] == 6
    assert data["cron_minute"] == 30


def test_scheduler_configure_interval(client):
    """
    Objective: Verify interval schedule mode can be activated.
    """
    config_payload = {
        "interval_hours": 6  # Every 6 hours
    }
    response = client.post("/api/v1/admin/scheduler/configure", json=config_payload)
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert data["mode"] == "interval"
    assert data["interval_hours"] == 6
    
    # Reset back to cron mode
    client.post("/api/v1/admin/scheduler/configure", json={"interval_hours": 0, "cron_hour": 3, "cron_minute": 0})


def test_scheduler_run_now(client, patch_search_service):
    """
    Objective: Verify manual scan trigger works and returns scan results.
    """
    response = client.post("/api/v1/admin/scheduler/run-now")
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert "message" in data
    assert data["message"] == "Scan completed."
    assert "scan" in data
    scan = data["scan"]
    assert "total_items" in scan
    assert "alerts_triggered" in scan
    assert "trigger" in scan
    assert scan["trigger"] == "manual"


def test_scheduler_history(client):
    """
    Objective: Verify scan history endpoint returns paginated results.
    """
    response = client.get("/api/v1/admin/scheduler/history?page=1&per_page=10")
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert "scans" in data
    assert "total" in data
    assert "page" in data
    assert data["page"] == 1
    assert "per_page" in data


def test_scheduler_invalid_config(client):
    """
    Objective: Verify invalid configuration parameters are rejected with HTTP 422.
    """
    # cron_hour out of range (0-23)
    response = client.post("/api/v1/admin/scheduler/configure", json={"cron_hour": 25})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    # cron_minute out of range (0-59)
    response = client.post("/api/v1/admin/scheduler/configure", json={"cron_minute": 61})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    # interval_hours out of range (0-168)
    response = client.post("/api/v1/admin/scheduler/configure", json={"interval_hours": 200})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Empty body (no parameters)
    response = client.post("/api/v1/admin/scheduler/configure", json={})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
