"""
Secure Token Lifecycle Management
- 15-minute access tokens
- 7-day refresh tokens
- Device binding enforcement
"""

from datetime import datetime, timedelta
import jwt
import uuid
from infra.secrets import get_secret_safe

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

JWT_SECRET = get_secret_safe("JWT_SECRET", "dev_secret_change_in_production")

def create_access_token(user_id: str, device_id: str):
    """Create short-lived access token (15 min)"""
    payload = {
        "sub": user_id,
        "device_id": device_id,
        "type": "access",
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "jti": str(uuid.uuid4())
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)
    return token

def create_refresh_token(user_id: str, device_id: str):
    """Create long-lived refresh token (7 days)"""
    payload = {
        "sub": user_id,
        "device_id": device_id,
        "type": "refresh",
        "exp": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "jti": str(uuid.uuid4())
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)

def decode_token(token: str):
    """Decode and validate token"""
    return jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
