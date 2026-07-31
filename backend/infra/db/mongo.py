import logging
from motor.motor_asyncio import AsyncIOMotorClient
from infra.db.config import db_settings

# Configure logging
logger = logging.getLogger("fintech.infra.db")

class MongoDB:
    """
    Singleton wrapper for the AsyncIOMotorClient.
    Ensures connection pooling and unified configuration.
    """
    client: AsyncIOMotorClient = None
    db = None

    @classmethod
    async def connect(cls):
        """Initializes the MongoDB connection pool."""
        if cls.client is None:
            try:
                logger.info("Connecting to MongoDB...")
                cls.client = AsyncIOMotorClient(
                    db_settings.MONGO_URL,
                    minPoolSize=db_settings.MIN_POOL_SIZE,
                    maxPoolSize=db_settings.MAX_POOL_SIZE,
                    serverSelectionTimeoutMS=db_settings.SERVER_SELECTION_TIMEOUT_MS,
                    uuidRepresentation="standard"
                )
                cls.db = cls.client[db_settings.MONGO_DB_NAME]
                
                # Ping to verify connection
                await cls.client.admin.command('ping')
                logger.info(f"✅ Connected to MongoDB: {db_settings.MONGO_DB_NAME}")
            
            except Exception as e:
                logger.error(f"❌ Failed to connect to MongoDB: {e}")
                logger.error("Database connection is required; refusing to start.")
                cls.db = None
                cls.client = None
                raise

    @classmethod
    async def close(cls):
        """Closes the MongoDB connection pool."""
        if cls.client:
            logger.info("Closing MongoDB connection...")
            cls.client.close()
            cls.client = None
            logger.info("MongoDB connection closed.")

    @classmethod
    def get_db(cls):
        """Returns the database instance."""
        if cls.client is None:
            raise RuntimeError("Database not initialized. Call connect() first.")
        return cls.db

async def get_database():
    """Dependency for FastAPI routes to access the DB."""
    if MongoDB.client is None:
        await MongoDB.connect()
    return MongoDB.get_db()
