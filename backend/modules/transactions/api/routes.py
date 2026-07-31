from fastapi import APIRouter, Depends, Header, HTTPException
from shared.security.auth_deps import get_current_user
from modules.transactions.service.service import TransactionService

router = APIRouter()

@router.post("/")
async def create_transaction(
    amount: float,
    category: str,
    idempotency_key: str = Header(..., alias="Idempotency-Key"),
    user: dict = Depends(get_current_user)
):
    """
    Create transaction with full security enforcement.
    Delegates to TransactionService.
    """
    return await TransactionService.create_transaction(
        user_id=user["user_id"],
        amount=amount,
        category=category,
        idempotency_key=idempotency_key
    )

@router.get("/")
async def get_transactions(user: dict = Depends(get_current_user)):
    """
    Fetch all transactions for the user.
    """
    return await TransactionService.get_transactions(user_id=user["user_id"])
