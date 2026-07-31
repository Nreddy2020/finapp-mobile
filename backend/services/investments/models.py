from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
import uuid

class InvestmentBase(BaseModel):
    user_id: str
    symbol: str  # e.g., AAPL, GC=F
    type: Literal["stock", "crypto", "metal", "mutual_fund"]
    quantity: float
    avg_price: float

class InvestmentCreate(InvestmentBase):
    pass

class Investment(InvestmentBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
