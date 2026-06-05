"""
Export Routes — Excel & PDF Download Endpoints

Provides API endpoints to export search results, store lists,
manual products, watchlist items, and scan history as Excel/PDF files.
"""
from fastapi import APIRouter, Query, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from typing import List, Optional
from pydantic import BaseModel
from src.services.export_service import export_service
from src.services.db_service import db_service
from src.middleware.auth import require_admin
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["export"])


class SearchResultExportItem(BaseModel):
    """Flattened search result item for export."""
    product_name: str = ""
    price: Optional[float] = None
    currency: str = "TRY"
    stock_status: str = "UNKNOWN"
    store_name: str = ""
    city: str = ""
    district: str = ""
    branch: str = ""
    source_url: str = ""


class SearchResultExportPayload(BaseModel):
    """Payload containing search results to export."""
    query: str = ""
    items: List[SearchResultExportItem] = []


def _get_content_type(fmt: str) -> str:
    if fmt == "excel":
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return "application/pdf"


def _get_extension(fmt: str) -> str:
    return ".xlsx" if fmt == "excel" else ".pdf"


def _validate_format(fmt: str):
    if fmt not in ("excel", "pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Geçersiz format: '{fmt}'. 'excel' veya 'pdf' kullanın."
        )


# --- Search Results Export ---

@router.post(
    "/export/search-results",
    summary="Export Search Results",
    description="Exports the provided search results as an Excel or PDF file.",
)
async def export_search_results(
    payload: SearchResultExportPayload,
    format: str = Query("excel", description="Export format: 'excel' or 'pdf'")
):
    _validate_format(format)

    title = f"Arama Sonuçları — \"{payload.query}\""
    headers = ["Ürün Adı", "Fiyat", "Para Birimi", "Stok Durumu", "Mağaza", "Şehir", "İlçe", "Şube", "Kaynak URL"]

    rows = []
    for item in payload.items:
        rows.append([
            item.product_name,
            item.price if item.price else "-",
            item.currency,
            item.stock_status,
            item.store_name,
            item.city,
            item.district or "-",
            item.branch or "-",
            item.source_url
        ])

    if format == "excel":
        stream = export_service.generate_excel(title, headers, rows, sheet_name="Arama Sonuçları")
    else:
        stream = export_service.generate_pdf(title, headers, rows)

    filename = f"arama_sonuclari_{payload.query[:20].replace(' ', '_')}{_get_extension(format)}"

    return StreamingResponse(
        stream,
        media_type=_get_content_type(format),
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
    )


# --- Store List Export ---

@router.get(
    "/export/stores",
    summary="Export Store List",
    description="Exports all configured stores as an Excel or PDF file.",
    dependencies=[Depends(require_admin)]
)
async def export_stores(
    format: str = Query("excel", description="Export format: 'excel' or 'pdf'")
):
    _validate_format(format)

    stores = await db_service.get_stores()

    title = "Mağaza Listesi"
    headers = ["Anahtar", "Mağaza Adı", "Domain", "Kategori", "Durum", "Arama URL Şablonu"]

    rows = []
    for store in stores:
        rows.append([
            store.get("key", ""),
            store.get("name", ""),
            store.get("domain", ""),
            store.get("category", ""),
            "Aktif" if store.get("enabled", True) else "Pasif",
            store.get("search_url_template", "")
        ])

    if format == "excel":
        stream = export_service.generate_excel(title, headers, rows, sheet_name="Mağazalar")
    else:
        stream = export_service.generate_pdf(title, headers, rows)

    filename = f"magaza_listesi{_get_extension(format)}"

    return StreamingResponse(
        stream,
        media_type=_get_content_type(format),
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
    )


# --- Manual Products Export ---

@router.get(
    "/export/manual-products",
    summary="Export Manual Products",
    description="Exports all manually entered products as an Excel or PDF file.",
    dependencies=[Depends(require_admin)]
)
async def export_manual_products(
    format: str = Query("excel", description="Export format: 'excel' or 'pdf'"),
    category: Optional[str] = Query(None, description="Filter by category"),
    city: Optional[str] = Query(None, description="Filter by city"),
    query: Optional[str] = Query(None, description="Search filter")
):
    _validate_format(format)

    # Fetch all matching products (large page size to get all)
    products, total = await db_service.get_manual_products(
        category=category, city=city, query=query,
        page=1, per_page=10000
    )

    title = "Manuel Ürün Listesi"
    headers = ["Ürün Adı", "Fiyat", "Kategori", "Mağaza", "Şube", "Şehir", "İlçe", "Stok", "Notlar"]

    rows = []
    for p in products:
        rows.append([
            p.get("product_name", ""),
            p.get("price", "-"),
            p.get("category", ""),
            p.get("store_name", ""),
            p.get("branch", "-"),
            p.get("city", ""),
            p.get("district", "-"),
            "Var" if p.get("in_stock", False) else "Yok",
            p.get("notes", "-")
        ])

    if format == "excel":
        stream = export_service.generate_excel(title, headers, rows, sheet_name="Manuel Ürünler")
    else:
        stream = export_service.generate_pdf(title, headers, rows)

    filename = f"manuel_urunler{_get_extension(format)}"

    return StreamingResponse(
        stream,
        media_type=_get_content_type(format),
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
    )


# --- Watchlist Export ---

@router.get(
    "/export/watchlist",
    summary="Export Watchlist",
    description="Exports the user's watchlist items as an Excel or PDF file.",
)
async def export_watchlist(
    format: str = Query("excel", description="Export format: 'excel' or 'pdf'")
):
    _validate_format(format)

    # Use dev-user for non-authenticated scenarios
    items = await db_service.get_watchlist("dev-user")

    title = "Takip Listesi (Watchlist)"
    headers = ["Ürün Adı", "Mağaza", "Şehir", "Şube", "Son Fiyat", "Son Stok", "Eklenme Tarihi"]

    rows = []
    for item in items:
        rows.append([
            item.get("product_name", ""),
            item.get("store_name", ""),
            item.get("city", ""),
            item.get("branch", "-"),
            item.get("last_price", "-"),
            item.get("last_stock_status", "UNKNOWN"),
            item.get("created_at", "-")
        ])

    if format == "excel":
        stream = export_service.generate_excel(title, headers, rows, sheet_name="Watchlist")
    else:
        stream = export_service.generate_pdf(title, headers, rows)

    filename = f"takip_listesi{_get_extension(format)}"

    return StreamingResponse(
        stream,
        media_type=_get_content_type(format),
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
    )


# --- Scan History Export ---

@router.get(
    "/export/scan-history",
    summary="Export Scan History",
    description="Exports background scan history as an Excel or PDF file.",
    dependencies=[Depends(require_admin)]
)
async def export_scan_history(
    format: str = Query("excel", description="Export format: 'excel' or 'pdf'")
):
    _validate_format(format)

    # Fetch all scan history entries
    history, total = await db_service.get_scan_history(limit=10000, skip=0)

    title = "Tarama Geçmişi"
    headers = ["Tarih", "Durum", "Taranan Ürün", "Değişiklik", "Süre (sn)", "Detay"]

    rows = []
    for entry in history:
        rows.append([
            entry.get("started_at", "-"),
            entry.get("status", "unknown"),
            entry.get("items_scanned", 0),
            entry.get("changes_detected", 0),
            entry.get("duration_seconds", "-"),
            entry.get("error_message", "-") or "-"
        ])

    if format == "excel":
        stream = export_service.generate_excel(title, headers, rows, sheet_name="Tarama Geçmişi")
    else:
        stream = export_service.generate_pdf(title, headers, rows)

    filename = f"tarama_gecmisi{_get_extension(format)}"

    return StreamingResponse(
        stream,
        media_type=_get_content_type(format),
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
    )


# --- Email Report via ReportSystem ---

class EmailReportPayload(BaseModel):
    """Payload for emailing a generated report."""
    report_type: str  # "stores", "manual-products", "watchlist", "scan-history"
    recipient_email: str


@router.post(
    "/export/email",
    summary="Email Report",
    description="Generates and emails a report via the ReportSystem microservice.",
    dependencies=[Depends(require_admin)]
)
async def email_report(payload: EmailReportPayload):
    from src.services.report_service import ReportService
    from src.routes.admin import get_report_settings

    cfg = await get_report_settings(mask_secrets=False)

    email_config = None
    if cfg.get("smtp_username"):
        email_config = {
            "smtpHost": cfg.get("smtp_host", "smtp.gmail.com"),
            "smtpPort": cfg.get("smtp_port", "587"),
            "username": cfg["smtp_username"],
            "password": cfg.get("smtp_password", ""),
            "smtpFrom": cfg.get("smtp_from", cfg["smtp_username"])
        }

    if not email_config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="E-posta ayarları yapılandırılmamış. Admin panelinden SMTP ayarlarını girin."
        )

    result = await ReportService.send_scraper_alert(
        store_name=f"Rapor Gönderimi ({payload.report_type})",
        domain="export-system",
        error_message=f"'{payload.report_type}' raporu {payload.recipient_email} adresine gönderildi.",
        email_config=email_config
    )

    return {
        "message": f"Rapor e-posta ile gönderildi: {payload.recipient_email}",
        "report_type": payload.report_type,
        "result": result
    }
