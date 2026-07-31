from fastapi import APIRouter, HTTPException, Query, Path, Body
from typing import List, Dict, Optional
from datetime import datetime

from modules.inflation.service.service import InflationService
from modules.inflation.domain.models import InflationRateResponse, InflationCategory, InflationImpactRequest, InflationImpactResponse, InflationSource

router = APIRouter(tags=["Inflation"])

@router.get("/current", response_model=InflationRateResponse)
async def get_current_inflation(
    source: str = Query("RBI", description="Data source"),
    category: str = Query("overall", description="Category"),
):
    """
    Get current inflation rate from DB.
    """
    rate = await InflationService.get_current_inflation(source, category)
    if rate is None:
        raise HTTPException(status_code=404, detail="Inflation data not found")
        
    return InflationRateResponse(
        rate=rate,
        source=source,
        category=category,
        period_end=datetime.utcnow(), # Approximate if real data missing dates
        is_forecast=False
    )

@router.get("/categories")
async def get_category_inflation(
    source: str = Query("RBI", description="Data source")
):
    """
    Get inflation breakdown by category.
    """
    return await InflationService.get_category_breakdown(source)

@router.post("/impact", response_model=InflationImpactResponse)
async def calculate_impact(
    request: InflationImpactRequest,
    source: str = Query("RBI")
):
    """
    Calculate inflation impact strictly via Service domain logic.
    """
    rate = request.inflation_rate
    if rate is None:
        rate = await InflationService.get_current_inflation(source, "overall")
        if rate is None:
             raise HTTPException(status_code=500, detail="Could not retrieve current inflation rate")

    result = await InflationService.calculate_impact(request.amount, request.years, rate)
    return InflationImpactResponse(**result)

@router.get("/personalized/{user_id}")
async def get_personalized_inflation(
    user_id: str = Path(...),
    source: str = Query("RBI")
):
    """
    Get personalized inflation (Mock/Placeholder for now, implementation connected to Service)
    """
    # Just returning simple structure for now to maintain API contract
    rate = await InflationService.get_current_inflation(source, "overall")
    return {
        "user_id": user_id,
        "personalized_rate": rate,
        "source": source,
        "timestamp": datetime.utcnow()
    }
