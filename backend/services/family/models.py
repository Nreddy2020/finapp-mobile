from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
import uuid

class FamilyMemberBase(BaseModel):
    user_id: str # The registered user ID if linked
    name: str
    relation: str # Parent, Child, Spouse

class FamilyMemberCreate(FamilyMemberBase):
    pass

class FamilyMember(FamilyMemberBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SharedExpenseBase(BaseModel):
    description: str
    amount: float
    paid_by: str # user_id or member_id
    split_with: list[str] # list of member_ids

class SharedExpenseCreate(SharedExpenseBase):
    pass
