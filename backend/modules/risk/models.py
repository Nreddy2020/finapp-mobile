from pydantic import BaseModel
from typing import List, Optional
from enum import Enum
from datetime import datetime

class RiskDecision(str, Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    CHALLENGE = "CHALLENGE"

class RiskAssessment(BaseModel):
    decision: RiskDecision
    score: int # 0-100 (100 = High Risk)
    reasons: List[str] = []
    timestamp: datetime = datetime.utcnow()
