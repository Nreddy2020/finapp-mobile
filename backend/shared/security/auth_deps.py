"""
Device-Bound Authentication Dependency
- Validates JWT + device binding on every request
- Enforces server-side security
"""

from fastapi import Depends, HTTPException, Request, Header
import jwt
from jwt.exceptions import PyJWTError
from infra.secrets import get_secret_safe

JWT_SECRET = get_secret_safe("JWT_SECRET", "dev_secret_change_in_production")
ALGORITHM = "HS256"

async def get_current_user(
    request: Request,
    authorization: str = Header(None),
    x_device_id: str = Header(None, alias="X-Device-ID")
):
    """
    Validate JWT and device binding
    CRITICAL: This runs on EVERY protected endpoint
    """
    
    # Check headers exist
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    
    if not x_device_id:
        raise HTTPException(status_code=401, detail="Missing X-Device-ID header")
    
    # Extract token
    try:
        scheme, token = authorization.split(" ")
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid auth scheme")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Authorization header")
    
    # Decode JWT
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    except PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    # Validate device binding (CRITICAL SECURITY CHECK)
    if payload.get("device_id") != x_device_id:
        raise HTTPException(
            status_code=401,
            detail="Device mismatch - token not valid for this device"
        )
    
    # Validate token type
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    
    return {
        "user_id": payload["sub"],
        "device_id": payload["device_id"],
        "jti": payload["jti"]
    }
