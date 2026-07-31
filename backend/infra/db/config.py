from pydantic_settings import BaseSettings
from pydantic import Field

class DatabaseSettings(BaseSettings):
    """
    Strict configuration for MongoDB connection.
    Reads from environment variables or defaults to secure local settings.
    """
    MONGO_URL: str = Field(default="mongodb://localhost:27017", env="MONGO_URL")
    MONGO_DB_NAME: str = Field(default="fintech_core", env="MONGO_DB_NAME")
    
    # Connection Pooling & Timeouts (Critical for Production/RHEL)
    MIN_POOL_SIZE: int = Field(default=10, env="MONGO_MIN_POOL_SIZE")
    MAX_POOL_SIZE: int = Field(default=100, env="MONGO_MAX_POOL_SIZE")
    SERVER_SELECTION_TIMEOUT_MS: int = Field(default=5000, env="MONGO_TIMEOUT_MS")
    
    class Config:
        env_file = ".env"
        extra = "ignore"
        # Case sensitive to match standard Linux env var conventions if needed, 
        # but pydantic is case-insensitive by default for env lookups usually.
        # We keep it simple.

db_settings = DatabaseSettings()
