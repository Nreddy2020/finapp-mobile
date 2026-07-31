from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
import uuid

# Status Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Account Models
class AccountBase(BaseModel):
    name: str
    type: Literal["bank", "cash", "wallet", "other"] = "bank"
    currency: str = "INR"
    opening_balance: float = 0.0

class AccountCreate(AccountBase):
    pass

class Account(AccountBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Transaction Models
class TransactionBase(BaseModel):
    account_id: str
    type: Literal["income", "expense", "transfer"]
    category: str
    amount: float
    date: datetime
    description: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class Transaction(TransactionBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
