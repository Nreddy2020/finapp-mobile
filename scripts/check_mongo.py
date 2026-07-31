import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

# Use the same default as config
MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB_NAME", "fintech_core")

async def check_db():
    print(f"Connecting to {MONGO_URL}...")
    try:
        client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=2000)
        await client.admin.command('ping')
        print("✅ MongoDB is reachable.")
        
        db = client[DB_NAME]
        collections = await db.list_collection_names()
        print(f"Collections in '{DB_NAME}': {collections}")
        
        for col in collections:
            count = await db[col].count_documents({})
            print(f" - {col}: {count} documents")
            
    except Exception as e:
        print(f"❌ Failed to connect or query MongoDB: {e}")

if __name__ == "__main__":
    asyncio.run(check_db())
