"""
Atomic Idempotency Manager
Enforces exactly-once processing for financial transactions.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException
from pymongo import ReturnDocument
from infra.db.mongo import MongoDB

class IdempotencyManager:
    """
    Manages the lifecycle of an idempotent request.
    States: PROCESSING -> COMPLETED | FAILED
    """
    
    @staticmethod
    async def lock(key: str, user_id: str, ttl_hours: int = 24) -> Optional[Dict]:
        """
        Attempts to acquire a lock for the idempotency key.
        - If new: Creates doc with status="PROCESSING". Returns None.
        - If exists & PROCESSING: Raises 409 (Conflict).
        - If exists & COMPLETED: Returns cached result.
        - If exists & FAILED: Allows retry (Resets to PROCESSING).
        """
        db = MongoDB.client
        collection = db.core.idempotency
        
        now = datetime.utcnow()
        
        # 1. Atomic Upsert
        # We try to set status=PROCESSING if it doesn't exist.
        result = await collection.find_one_and_update(
            {"key": key, "user_id": user_id},
            {
                "$setOnInsert": {
                    "created_at": now,
                    "status": "PROCESSING",
                    "expires_at": now + timedelta(hours=ttl_hours)
                }
            },
            upsert=True,
            return_document=ReturnDocument.BEFORE # Returns None if inserted
        )
        
        # If result is None, we successfully inserted (Lock Acquired)
        if result is None:
            return None
            
        # If record exists, check status
        status = result.get("status")
        
        if status == "PROCESSING":
            # Concurrent duplicate request
            # Check if stale lock (optional, e.g., > 1 min? For now assume strict conflict)
            raise HTTPException(
                status_code=409,
                detail="Request currently being processed"
            )
            
        if status == "COMPLETED":
            # Return cached response
            return result.get("response")
            
        if status == "FAILED":
            # Allow retry - Update to PROCESSING
            await collection.update_one(
                {"_id": result["_id"]},
                {"$set": {"status": "PROCESSING", "updated_at": now}}
            )
            return None # Lock Acquired (Retry)
            
        raise HTTPException(status_code=500, detail="Invalid idempotency state")

    @staticmethod
    async def commit(key: str, user_id: str, response_data: Dict[str, Any]):
        """
        Mark request as COMPLETED and cache result.
        """
        db = MongoDB.client
        await db.core.idempotency.update_one(
            {"key": key, "user_id": user_id},
            {
                "$set": {
                    "status": "COMPLETED",
                    "response": response_data,
                    "completed_at": datetime.utcnow()
                }
            }
        )

    @staticmethod
    async def rollback(key: str, user_id: str, error_detail: str):
        """
        Mark request as FAILED to allow retries.
        """
        db = MongoDB.client
        await db.core.idempotency.update_one(
            {"key": key, "user_id": user_id},
            {
                "$set": {
                    "status": "FAILED",
                    "error": error_detail,
                    "failed_at": datetime.utcnow()
                }
            }
        )

# Helper wrapper for simple usage in routes
async def enforce_idempotency(key: str, user_id: str) -> Optional[Dict]:
    """
    Returns cached dict if exists, None if lock acquired.
    Raises HTTPException if conflict.
    """
    return await IdempotencyManager.lock(key, user_id)
