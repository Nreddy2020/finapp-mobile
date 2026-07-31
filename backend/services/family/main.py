from fastapi import FastAPI, HTTPException, Depends
from typing import List
from shared.database import db
from shared.security import get_current_user_id
from models import FamilyMember, FamilyMemberCreate

app = FastAPI(title="Family Service")

@app.on_event("startup")
async def startup():
    await db.connect()

@app.on_event("shutdown")
async def shutdown():
    await db.close()

@app.post("/members", response_model=FamilyMember)
async def add_member(member_in: FamilyMemberCreate, user_id: str = Depends(get_current_user_id)):
    member = FamilyMember(**member_in.model_dump())
    await db.db.family_members.insert_one(member.model_dump())
    return member

@app.get("/members", response_model=List[FamilyMember])
async def list_members(user_id: str = Depends(get_current_user_id)):
    # In reality should filter by family_id/group logic
    members = await db.db.family_members.find().to_list(100)
    return [FamilyMember(**m) for m in members]
