from compliance.consent import enforce_consent
from core.idempotency import IdempotencyManager
from audit.events import write_audit_event
from infra.db.mongo import MongoDB
from modules.risk.service import RiskService
from modules.risk.models import RiskDecision
from fastapi import HTTPException

class TransactionService:
    
    @staticmethod
    async def create_transaction(user_id: str, amount: float, category: str, idempotency_key: str):
        # 1. Enforce consent
        await enforce_consent(user_id)
        
        # 2. Idempotency Lock
        cached_result = await IdempotencyManager.lock(idempotency_key, user_id)
        if cached_result:
            return {"success": True, "transaction": cached_result, "source": "cache"}
        
        try:
            # 3. Risk Engine Evaluation
            risk_assessment = await RiskService.evaluate_transaction(user_id, amount, category)
            
            if risk_assessment.decision == RiskDecision.REJECT:
                # Rollback lock immediately since we are aborting
                await IdempotencyManager.rollback(idempotency_key, user_id, "Risk Blocked")
                raise HTTPException(
                    status_code=403, 
                    detail={
                        "message": "Transaction Deflected by Risk Engine", 
                        "reasons": risk_assessment.reasons
                    }
                )

            # 4. Process Transaction (Business Logic)
            # ... implementation ...
            transaction = {
                "user_id": user_id,
                "amount": amount,
                "category": category,
                "idempotency_key": idempotency_key,
                "timestamp": "now" # In real DB we'd use datetime.utcnow()
            }
            
            # Persist to DB (Stub for now, or use MongoDB directly if ready)
            # await MongoDB.db.transactions.insert_one(transaction) 
            
            # 5. Audit Log
            await write_audit_event(
                event_type="TRANSACTION_CREATED",
                actor=user_id,
                resource="transaction",
                data={"amount": amount, "category": category, "risk_score": risk_assessment.score}
            )
            
            # 6. Commit Idempotency
            await IdempotencyManager.commit(idempotency_key, user_id, transaction)
            
            return {"success": True, "transaction": transaction, "source": "processed"}
            
        except Exception as e:
            # 7. Rollback
            await IdempotencyManager.rollback(idempotency_key, user_id, str(e))
            raise e

    @staticmethod
    async def get_transactions(user_id: str):
        # Fetch committed transactions from Idempotency log or separate collection
        # For now, we can query the idempotency collection for this user as a proxy for transactions
        # or just return a mock list if we haven't set up a dedicated collection yet.
        
        # Real implementation:
        # cursor = MongoDB.db.transactions.find({"user_id": user_id})
        # return await cursor.to_list(length=100)
        
        # Fallback to Idempotency Cache for demo purposes (since we commit there)
        # In main.py we didn't firmly establish a 'transactions' collection, 
        # but IdempotencyManager stores the 'response' which contains the transaction.
        
        # Let's try to fetch from MongoDB direct if possible
        try:
            cursor = MongoDB.db.idempotency_keys.find({
                "user_id": user_id, 
                "status": "COMMITTED"
            })
            items = await cursor.to_list(length=50)
            # Extract transaction data from cached response
            transactions = [item["response"]["transaction"] for item in items if "response" in item and "transaction" in item["response"]]
            return {"transactions": transactions}
        except Exception:
            return {"transactions": []}
