from pydantic import BaseModel

class SimulationResult(BaseModel):
    scenario: str
    revenue: str
    profit: str
    trend: str
    stress: str
