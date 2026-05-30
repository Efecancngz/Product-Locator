"""
Authentication Middleware — Firebase Admin SDK token verification.
Provides dependency injection for protected endpoints.
"""
import logging
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from src.config.settings import settings

logger = logging.getLogger(__name__)

# Firebase Admin SDK initialization (lazy)
_firebase_app = None
_auth_module = None

security = HTTPBearer(auto_error=False)


def _init_firebase():
    """Lazy-initialize Firebase Admin SDK."""
    global _firebase_app, _auth_module
    if _firebase_app is not None:
        return

    if not settings.FIREBASE_PROJECT_ID:
        logger.warning("[Auth] FIREBASE_PROJECT_ID not set — auth will run in permissive mode")
        return

    try:
        import firebase_admin
        from firebase_admin import credentials, auth

        # Initialize with project ID only (no service account file needed for token verification)
        cred = credentials.ApplicationDefault() if settings.FIREBASE_CREDENTIALS_PATH else None
        _firebase_app = firebase_admin.initialize_app(
            cred,
            {"projectId": settings.FIREBASE_PROJECT_ID}
        )
        _auth_module = auth
        logger.info(f"[Auth] Firebase initialized for project: {settings.FIREBASE_PROJECT_ID}")
    except Exception as e:
        logger.error(f"[Auth] Firebase initialization failed: {e}")
        _firebase_app = None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[dict]:
    """
    Extract and verify the Firebase ID token from the Authorization header.
    Returns user info dict or None if no token provided.
    """
    if not credentials:
        return None

    _init_firebase()

    if _auth_module is None:
        # Firebase not configured — permissive mode (dev environment)
        logger.debug("[Auth] Permissive mode — no Firebase configured")
        return {"uid": "dev-user", "email": "dev@localhost", "admin": True}

    try:
        token = credentials.credentials
        decoded = _auth_module.verify_id_token(token)
        return {
            "uid": decoded.get("uid"),
            "email": decoded.get("email", ""),
            "name": decoded.get("name", ""),
            "picture": decoded.get("picture", ""),
            "admin": decoded.get("admin", False),
        }
    except Exception as e:
        logger.warning(f"[Auth] Token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def require_admin(
    user: Optional[dict] = Depends(get_current_user),
) -> dict:
    """
    Dependency that requires a valid authenticated user.
    In dev mode (no Firebase configured), allows all requests through.
    """
    if user is None:
        # Check if Firebase is configured
        _init_firebase()
        if _auth_module is None:
            # Permissive mode — allow through in development
            return {"uid": "dev-user", "email": "dev@localhost", "admin": True}

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
