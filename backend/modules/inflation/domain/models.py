from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict, BeforeValidator
from typing_extensions import Annotated

# Helper for MongoDB ObjectIDs
PyObjectId = Annotated[str, BeforeValidator(str)]

class MongoBaseModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={datetime: lambda dt: dt.isoformat()}
    )

class InflationSource(str, Enum):
    RBI = "RBI"
    WORLDBANK = "WorldBank"
    IMF = "IMF"
    MANUAL = "Manual"

class InflationCategory(str, Enum):
    OVERALL = "overall"
    FOOD = "food"
    HOUSING = "housing"
    HEALTHCARE = "healthcare"
    EDUCATION = "education"
    TRANSPORT = "transport"
    ENTERTAINMENT = "entertainment"
    CLOTHING = "clothing"
    UTILITIES = "utilities"

# --- Domain Models ---

class InflationRate(MongoBaseModel):
    """
    Core inflation rate document.
    """
    source: InflationSource
    country_code: str = Field(default="IND", max_length=3)
    region: Optional[str] = None
    rate: float
    category: InflationCategory = Field(default=InflationCategory.OVERALL)
    period: str = "yearly"  # monthly, yearly
    period_start: datetime
    period_end: datetime
    is_forecast: bool = False
    confidence_score: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserInflationPreferences(MongoBaseModel):
    """
    User specific settings for inflation tracking.
    """
    user_id: str
    preferred_source: InflationSource = InflationSource.RBI
    custom_rate: Optional[float] = None
    auto_update_enabled: bool = True
    notification_threshold: float = 1.0
    personalized_basket: Optional[Dict[str, float]] = None # {"food": 0.3}
    region_preference: Optional[str] = None
    last_notification_sent: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# --- API Response Models ---

class InflationRateResponse(BaseModel):
    rate: float
    source: str
    category: str
    period_end: datetime
    is_forecast: bool

class InflationImpactRequest(BaseModel):
    amount: float = Field(..., gt=0)
    years: int = Field(..., gt=0, le=50)
    inflation_rate: Optional[float] = None

class InflationImpactResponse(BaseModel):
    current_amount: float
    future_nominal_value: float
    purchasing_power_loss: float
    real_value_today: float
    inflation_rate: float
    years: int
