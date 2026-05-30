import httpx
import os
import csv
from datetime import datetime
from typing import Dict, Any, Optional
from src.config.settings import settings

class ReportService:
    @staticmethod
    def _create_temp_csv(headers: list, data: list, filename: str = "temp_alert.csv") -> str:
        """
        Creates a temporary CSV file to feed into ReportSystem's CSVDataSource.
        Returns the absolute path of the created file.
        """
        # Save temp file inside the backend root directory
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        file_path = os.path.join(backend_dir, filename)
        
        with open(file_path, mode="w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            writer.writerow(data)
            
        return file_path

    @staticmethod
    async def check_report_system_health() -> Dict[str, Any]:
        """
        Pings the ReportSystem Java microservice to verify its operational health.
        """
        url = f"{settings.REPORT_SYSTEM_URL}/api/health"
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    return response.json()
        except Exception as e:
            return {"status": "offline", "error": str(e)}
        return {"status": "offline"}

    @classmethod
    async def send_scraper_alert(
        cls,
        store_name: str,
        domain: str,
        error_message: str,
        telegram_config: Optional[Dict[str, str]] = None,
        email_config: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Formats a parser alert and sends it via the ReportSystem microservice.
        """
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Prepare data for pipeline
        headers = ["storeName", "storeDomain", "errorMessage", "timestamp", "recipient"]
        recipient = "admin"
        if email_config and email_config.get("smtpFrom"):
            recipient = email_config.get("smtpFrom")
            
        data = [store_name, domain, error_message, timestamp, recipient]
        csv_path = cls._create_temp_csv(headers, data, "temp_scraper_alert.csv")
        
        # Prepare output channels
        output_channels = []
        
        # Always output to console for safety/logging
        output_channels.append({"type": "console", "config": {}})
        
        # If Telegram bot credentials are provided
        if telegram_config and telegram_config.get("botToken") and telegram_config.get("chatId"):
            output_channels.append({
                "type": "telegram",
                "config": {
                    "botToken": telegram_config["botToken"],
                    "chatId": telegram_config["chatId"]
                }
            })
            
        # If SMTP Email credentials are provided
        if email_config and email_config.get("smtpHost") and email_config.get("username"):
            output_channels.append({
                "type": "email",
                "config": {
                    "smtpHost": email_config.get("smtpHost", "smtp.gmail.com"),
                    "smtpPort": email_config.get("smtpPort", "587"),
                    "username": email_config["username"],
                    "password": email_config.get("password", ""),
                    "fromAddress": email_config.get("smtpFrom", email_config["username"]),
                    "subject": "⚠️ Product Locator Scraper Alert"
                }
            })

        payload = {
            "dataSource": {
                "type": "csv",
                "config": {
                    "filePath": csv_path
                }
            },
            "template": "scraper_alert.ftl",
            "recipientField": "recipient",
            "outputChannels": output_channels
        }

        try:
            url = f"{settings.REPORT_SYSTEM_URL}/api/pipeline/execute"
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(url, json=payload)
                result = response.json()
                return result
        except Exception as e:
            return {"success": False, "error": str(e)}
        finally:
            # Clean up temporary CSV file
            if os.path.exists(csv_path):
                os.remove(csv_path)

    @classmethod
    async def send_in_stock_alert(
        cls,
        recipient: str,
        product_name: str,
        store_name: str,
        branch_name: str,
        city: str,
        district: str,
        price: float,
        telegram_config: Optional[Dict[str, str]] = None,
        email_config: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Sends an automatic stock alert when an item becomes available in click-and-collect range.
        """
        # Prepare data for pipeline
        headers = ["recipient", "productName", "storeName", "branchName", "city", "district", "price"]
        data = [recipient, product_name, store_name, branch_name, city, district, str(price)]
        csv_path = cls._create_temp_csv(headers, data, "temp_stock_alert.csv")
        
        # Prepare output channels
        output_channels = [{"type": "console", "config": {}}]
        
        if telegram_config and telegram_config.get("botToken"):
            # If sending via user Telegram chat
            chat_id = telegram_config.get("chatId", recipient)
            output_channels.append({
                "type": "telegram",
                "config": {
                    "botToken": telegram_config["botToken"],
                    "chatId": chat_id
                }
            })
            
        if email_config and email_config.get("username"):
            output_channels.append({
                "type": "email",
                "config": {
                    "smtpHost": email_config.get("smtpHost", "smtp.gmail.com"),
                    "smtpPort": email_config.get("smtpPort", "587"),
                    "username": email_config["username"],
                    "password": email_config.get("password", ""),
                    "fromAddress": email_config.get("smtpFrom", email_config["username"]),
                    "subject": "📍 Product Locator - Ürün Stokta!"
                }
            })

        payload = {
            "dataSource": {
                "type": "csv",
                "config": {
                    "filePath": csv_path
                }
            },
            "template": "in_stock_alert.ftl",
            "recipientField": "recipient",
            "outputChannels": output_channels
        }

        try:
            url = f"{settings.REPORT_SYSTEM_URL}/api/pipeline/execute"
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(url, json=payload)
                result = response.json()
                return result
        except Exception as e:
            return {"success": False, "error": str(e)}
        finally:
            if os.path.exists(csv_path):
                os.remove(csv_path)
