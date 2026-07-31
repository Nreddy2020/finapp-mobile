from pydantic import BaseModel, EmailStr, Field, BeforeValidator
from typing import Annotated, Optional
from datetime import datetime

# MongoDB Object ID Helper for Pydantic V2
PyObjectId = Annotated[str, BeforeValidator(str)]

class User(BaseModel):
    """
    User Domain Entity
    Stored in MongoDB 'users' collection.
    """
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    email: EmailStr
    hashed_password: str # Never expose this in API responses if possible
    full_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda dt: dt.isoformat()}

class UserCreate(BaseModel):
    """Payload for Registration"""
    email: EmailStr
    password: str = Field(min_length=8, description="Strong password required")
    full_name: str = Field(min_length=2)

class LoginRequest(BaseModel):
    """Payload for Login"""
    email: EmailStr
    password: str

class Token(BaseModel):
    """Token Response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 900 # 15 minutes
