"""
Consent Management (GDPR / RBI Compliance)
- Version tracking
- Enforcement before actions
- Audit trail
"""

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from fastapi import HTTPException
import os

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGODB_URL)
db = client.compliance

CURRENT_CONSENT_VERSION = "v1.0.0"

async def record_consent(user_id: str, version: str, permissions: dict):
    """Record user consent with version and permissions"""
    await db.consents.insert_one({
        "user_id": user_id,
        "version": version,
        "permissions": permissions,
        "timestamp": datetime.utcnow()
    })

async def has_valid_consent(user_id: str, required_version: str = CURRENT_CONSENT_VERSION) -> bool:
    """Check if user has valid consent for current version"""
    consent = await db.consents.find_one({
        "user_id": user_id,
        "version": required_version
    })
    return consent is not None

async def enforce_consent(user_id: str):
    """
    Enforce consent before allowing actions
    CRITICAL: Call this before any data processing
    """
    if not await has_valid_consent(user_id):
        raise HTTPException(
            status_code=403,
            detail={
                "error": "Consent required",
                "required_version": CURRENT_CONSENT_VERSION,
                "message": "Please accept the latest privacy policy"
            }
        )

async def get_user_consent_history(user_id: str):
    """Get all consent records for a user (GDPR right to access)"""
    consents = await db.consents.find({"user_id": user_id}).to_list(None)
    return consents

async def revoke_consent(user_id: str):
    """Revoke all consent (part of account deletion)"""
    await db.consents.update_many(
        {"user_id": user_id},
        {"$set": {"revoked": True, "revoked_at": datetime.utcnow()}}
    )
