import logging
import math
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from motor.motor_asyncio import AsyncIOMotorDatabase
from infra.db.mongo import MongoDB
from modules.inflation.domain.models import (
    InflationRate, 
    UserInflationPreferences, 
    InflationSource, 
    InflationCategory
)

logger = logging.getLogger("fintech.modules.inflation.service")

class InflationService:
    
    @staticmethod
    async def get_db() -> AsyncIOMotorDatabase:
        return MongoDB.get_db()

    @staticmethod
    async def get_current_inflation(
        source: str = "RBI",
        category: str = "overall",
        country_code: str = "IND"
    ) -> Optional[float]:
        """
        Get the most recent inflation rate.
        """
        db = await InflationService.get_db()
        
        # Determine strict source enum if possible, or use raw string
        # Using string for flexibility in query
        
        # Sort by period_end descending to get latest
        doc = await db.inflation_rates.find_one(
            {
                "source": source,
                "category": category,
                "country_code": country_code,
                "is_forecast": False
            },
            sort=[("period_end", -1)]
        )
        
        if doc:
            return doc["rate"]
            
        # If no data found, return fallback/mock for now (as per requirements to keep app working)
        # In a real scenario, this would trigger a fetch job.
        logger.warning(f"No inflation data found for {source}/{category}. Returning fallback.")
        return InflationService._get_fallback_rate(source, category)

    @staticmethod
    def _get_fallback_rate(source: str, category: str) -> float:
        # Temporary mock fallback until data ingestion pipeline is active
        base_rates = {
            "RBI": 5.49,
            "WorldBank": 5.2,
            "IMF": 5.6
        }
        return base_rates.get(source, 5.0)

    @staticmethod
    async def calculate_impact(amount: float, years: int, rate: float) -> Dict:
        """
        Pure business logic calculation.
        """
        future_nominal = amount * math.pow((1 + rate / 100), years)
        purchasing_power_loss = future_nominal - amount
        # Real value today = Amount / (1+r)^t
        real_value = amount / math.pow((1 + rate / 100), years)
        
        return {
            "current_amount": amount,
            "future_nominal_value": round(future_nominal, 2),
            "purchasing_power_loss": round(purchasing_power_loss, 2),
            "real_value_today": round(real_value, 2),
            "inflation_rate": rate,
            "years": years
        }

    @staticmethod
    async def get_user_preferences(user_id: str) -> Optional[UserInflationPreferences]:
        db = await InflationService.get_db()
        doc = await db.user_inflation_preferences.find_one({"user_id": user_id})
        if doc:
            return UserInflationPreferences(**doc)
        return None

    @staticmethod
    async def update_user_preferences(user_id: str, updates: Dict) -> UserInflationPreferences:
        db = await InflationService.get_db()
        
        # Upsert
        now = datetime.utcnow()
        updates["updated_at"] = now
        
        result = await db.user_inflation_preferences.find_one_and_update(
            {"user_id": user_id},
            {"$set": updates, "$setOnInsert": {"created_at": now, "preferred_source": "RBI"}},
            upsert=True,
            return_document=True
        )
        return UserInflationPreferences(**result)

    @staticmethod
    async def get_category_breakdown(source: str, country_code: str = "IND") -> Dict[str, float]:
        """
        Returns inflation rates for all categories.
        """
        db = await InflationService.get_db()
        
        # Pipeline to get latest rate for each category
        pipeline = [
            {"$match": {"source": source, "country_code": country_code, "is_forecast": False}},
            {"$sort": {"period_end": -1}},
            {"$group": {
                "_id": "$category",
                "rate": {"$first": "$rate"}
            }}
        ]
        
        cursor = db.inflation_rates.aggregate(pipeline)
        results = {}
        async for doc in cursor:
            results[doc["_id"]] = doc["rate"]
            
        # Fill missing with fallback if empty (dev experience)
        if not results:
             categories = [e.value for e in InflationCategory]
             for cat in categories:
                 results[cat] = InflationService._get_fallback_rate(source, cat)
                 
        return results
