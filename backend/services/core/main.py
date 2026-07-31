from fastapi import FastAPI, HTTPException, Depends
from typing import List, Optional
from shared.database import db
from shared.security import get_current_user_id
from models import (
    StatusCheck, StatusCheckCreate,
    Account, AccountCreate,
    Transaction, TransactionCreate
)

app = FastAPI(title="Core Service")

@app.on_event("startup")
async def startup():
    await db.connect()

@app.on_event("shutdown")
async def shutdown():
    await db.close()

# Status Routes
@app.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.model_dump())
    await db.db.status_checks.insert_one(status_obj.model_dump())
    return status_obj

@app.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.db.status_checks.find().sort("timestamp", -1).to_list(1000)
    return [StatusCheck(**s) for s in status_checks]

# Accounts Routes
@app.post("/accounts", response_model=Account)
async def create_account(account_in: AccountCreate, user_id: str = Depends(get_current_user_id)):
    account = Account(**account_in.model_dump())
    # In a real app, verify user owns account or link it. For now, simplistic.
    await db.db.accounts.insert_one(account.model_dump())
    return account

@app.get("/accounts", response_model=List[Account])
async def list_accounts(user_id: str = Depends(get_current_user_id)):
    accounts = await db.db.accounts.find().sort("created_at", -1).to_list(1000)
    return [Account(**a) for a in accounts]

@app.get("/accounts/{account_id}", response_model=Account)
async def get_account(account_id: str, user_id: str = Depends(get_current_user_id)):
    doc = await db.db.accounts.find_one({"id": account_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Account not found")
    return Account(**doc)

# Transaction Routes
@app.post("/transactions", response_model=Transaction)
async def create_transaction(tx_in: TransactionCreate, user_id: str = Depends(get_current_user_id)):
    account = await db.db.accounts.find_one({"id": tx_in.account_id})
    if not account:
        raise HTTPException(status_code=400, detail="Invalid account_id")
    
    tx = Transaction(**tx_in.model_dump())
    await db.db.transactions.insert_one(tx.model_dump())
    return tx

@app.get("/transactions", response_model=List[Transaction])
async def list_transactions(account_id: Optional[str] = None, user_id: str = Depends(get_current_user_id)):
    query = {}
    if account_id:
        query["account_id"] = account_id
    
    transactions = await db.db.transactions.find(query).sort("date", -1).to_list(1000)
    return [Transaction(**tx) for tx in transactions]
