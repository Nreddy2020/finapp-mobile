from fastapi import APIRouter, Depends
from shared.security.auth_deps import get_current_user
from modules.intelligence.service.service import IntelligenceService
from modules.intelligence.models import SimulationResult

router = APIRouter()

@router.post("/simulate", response_model=SimulationResult)
async def simulate_market(
    scenario: str,
    user: dict = Depends(get_current_user)
):
    """
    Simulate market conditions on user's portfolio.
    Scenario: 'RECESSION' | 'BOOM'
    """
    return await IntelligenceService.simulate_market_shock(
        scenario=scenario,
        user_id=user["user_id"]
    )
