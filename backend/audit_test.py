import asyncio
from audit.events import write_audit_event, verify_audit_chain
from infra.db.mongo import MongoDB
import os

async def test_audit_log():
    try:
        print("1. DB Connection...")
        os.environ["MONGO_URL"] = "mongodb://localhost:27017" # Force local
        os.environ["MONGO_DB_NAME"] = "fintech_core" # Only needed for main DB init
        await MongoDB.connect()
        
        print("2. Writing Events...")
        hash1 = await write_audit_event("TEST_EVENT", "user_1", "system", {"action": "boot"})
        print(f"   Event 1 Hash: {hash1}")
        
        hash2 = await write_audit_event("TEST_EVENT", "user_2", "transaction", {"amount": 500})
        print(f"   Event 2 Hash: {hash2}")
        
        print("3. Verifying Chain...")
        is_valid = await verify_audit_chain()
        if is_valid:
            print("✅ Chain Verified: Integrity Intact")
        else:
            print("❌ Chain Verification Failed!")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await MongoDB.close()

if __name__ == "__main__":
    asyncio.run(test_audit_log())
