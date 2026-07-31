from .models import RiskAssessment, RiskDecision
from audit.events import write_audit_event
from infra.db.mongo import MongoDB
from datetime import datetime, timedelta

class RiskService:
    
    # Configuration
    VELOCITY_LIMIT_PER_MINUTE = 5
    HIGH_VALUE_THRESHOLD = 100000.0
    
    @staticmethod
    async def evaluate_transaction(user_id: str, amount: float, category: str, device_id: str = None) -> RiskAssessment:
        reasons = []
        score = 0
        
        # 1. High Value Check
        if amount > RiskService.HIGH_VALUE_THRESHOLD:
            score += 50
            reasons.append(f"High Value Transaction (> {RiskService.HIGH_VALUE_THRESHOLD})")
            
        # 2. Velocity Check (Simple MongoDB Count)
        # Count transactions in the last minute
        one_minute_ago = datetime.utcnow() - timedelta(minutes=1)
        # Note: This requires the transactions implementation to actually be saving to a 'transactions' collection
        # or tracking via audit log. For now, let's query the audit log for 'TRANSACTION_CREATED' events
        # as a proxy since we might not have a formal ledger collection yet.
        
        try:
            # Audit events are stored in 'audit_log' DB, 'events' collection
            # WE MUST Use MongoDB.client to access the separate audit database
            # Timestamp is stored as ISO string in audit log (from Pydantic json dump)
            velocity_count = await MongoDB.client["audit_log"].events.count_documents({
                "actor": user_id,
                "event_type": "TRANSACTION_CREATED",
                "timestamp": {"$gte": one_minute_ago.isoformat()} 
            })
            
            if velocity_count >= RiskService.VELOCITY_LIMIT_PER_MINUTE:
                score += 100
                reasons.append(f"Velocity Limit Exceeded ({velocity_count} in last min)")
        except Exception as e:
            print(f"Risk Engine Velocity Check Failed: {e}")
            # Fail open or closed? Fail open for availability, but log error.
        
        # 3. Decision Logic
        if score >= 100:
            decision = RiskDecision.REJECT
        elif score >= 50:
            decision = RiskDecision.CHALLENGE # Start with Challenge for high value
            # For this phase, we might just log it or auto-approve if no challenge mech exists
            # Let's auto-approve but Flag
            # valid decision is APPROVE but with high score? 
            # If we return REJECT, the transaction fails.
            pass 
        else:
            decision = RiskDecision.APPROVE
            
        # Log if rejected
        if decision == RiskDecision.REJECT:
            await write_audit_event(
                event_type="RISK_BLOCK",
                actor=user_id,
                resource="risk_engine",
                data={"reason": reasons, "amount": amount, "score": score}
            )
            
        return RiskAssessment(
            decision=decision,
            score=score,
            reasons=reasons
        )
