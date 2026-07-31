"""
Immutable Audit Event Store
BANK-GRADE: Hash-chained, append-only, tamper-evident
"""

from datetime import datetime
import hashlib
import json
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from infra.db.mongo import MongoDB

class AuditEvent(BaseModel):
    """
    Audit Event Schema
    Immutable record of an action.
    """
    event_type: str
    actor: str
    resource: str
    data: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    prev_hash: str
    hash: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    class Config:
        populate_by_name = True

async def write_audit_event(
    event_type: str,
    actor: str,
    resource: str,
    data: dict,
    ip_address: str = None,
    user_agent: str = None
) -> str:
    """
    Write immutable audit event with hash chaining.
    CRITICAL: Never allow deletion of audit collection.
    """
    db = MongoDB.client  # Direct access
    
    # If MongoDB.client is available:
    if db:
        audit_db = db["audit_log"] # Separate DB for audit is safer
    else:
        # Fallback if accessed before app startup (shouldn't happen)
        raise RuntimeError("DB not connected")

    # Get previous hash for chain
    last_event = await audit_db.events.find_one(sort=[("timestamp", -1)])
    prev_hash = last_event["hash"] if last_event else "genesis"
    
    # Create event model
    event = AuditEvent(
        event_type=event_type,
        actor=actor,
        resource=resource,
        data=data,
        prev_hash=prev_hash,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    # Compute Hash
    # We dump the dict exclude 'hash' and '_id'
    payload = event.model_dump(exclude={"hash", "id"}, mode='json')
    # Use consistent sorting for hash stability
    serialized = json.dumps(payload, sort_keys=True, default=str).encode()
    event.hash = hashlib.sha256(serialized).hexdigest()
    
    # Write to DB
    await audit_db.events.insert_one(event.model_dump(mode='json'))
    
    return event.hash

async def verify_audit_chain() -> bool:
    """
    Verify integrity of audit chain
    """
    if not MongoDB.client:
         raise RuntimeError("DB not connected")
         
    audit_db = MongoDB.client["audit_log"]
    events = audit_db.events.find().sort("timestamp", 1)
    
    prev_hash = "genesis"
    async for event_doc in events:
        # Reconstruct model logic to verify hash
        stored_hash = event_doc.get("hash")
        
        # Remove DB specific fields
        payload = {k: v for k, v in event_doc.items() if k not in ["_id", "hash"]}
        
        # We need to ensure we serialize exactly as we did on write. 
        # This can be tricky with JSON dumps if not careful.
        # For this refactor, we assume the data stored is JSON compatible (handled by model_dump mode='json')
        serialized = json.dumps(payload, sort_keys=True, default=str).encode()
        computed_hash = hashlib.sha256(serialized).hexdigest()
        
        if computed_hash != stored_hash:
            return False
            
        if event_doc["prev_hash"] != prev_hash:
            return False
            
        prev_hash = stored_hash
        
    return True
