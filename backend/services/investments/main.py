from fastapi import FastAPI, HTTPException, Depends
from typing import List
from shared.database import db
from shared.security import get_current_user_id
from models import Investment, InvestmentCreate

app = FastAPI(title="Investments Service")

@app.on_event("startup")
async def startup():
    await db.connect()

@app.on_event("shutdown")
async def shutdown():
    await db.close()

@app.post("/investments", response_model=Investment)
async def create_investment(inv_in: InvestmentCreate, user_id: str = Depends(get_current_user_id)):
    # Verify user_id context matches token if strictly needed
    if inv_in.user_id != user_id:
         # Optional: enforcement
         pass

    inv = Investment(**inv_in.model_dump())
    await db.db.investments.insert_one(inv.model_dump())
    return inv

@app.get("/investments", response_model=List[Investment])
async def list_investments(user_id: str = Depends(get_current_user_id)):
    investments = await db.db.investments.find({"user_id": user_id}).sort("created_at", -1).to_list(1000)
    return [Investment(**i) for i in investments]
