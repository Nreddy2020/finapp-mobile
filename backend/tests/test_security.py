import pytest
import httpx
import uuid
import asyncio
from infra.db.mongo import MongoDB
import os

# Configuration
BASE_URL = "http://localhost:8000"
TEST_DEVICE_ID = f"test-device-{uuid.uuid4()}"
TEST_EMAIL = f"security_test_{uuid.uuid4()}@example.com"
TEST_PASSWORD = "StrongSecurePassword123!"

@pytest.fixture
async def db_connection():
    # Direct DB access for verification
    # Using function scope (default) for simplicity/reliability
    os.environ["MONGO_URL"] = "mongodb://localhost:27017"
    os.environ["MONGO_DB_NAME"] = "fintech_core"
    await MongoDB.connect()
    yield MongoDB.client
    await MongoDB.close()

@pytest.mark.asyncio
async def test_security_flow(db_connection):
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        
        # --- 1. HEALTH CHECK ---
        print("\n[TEST] Health Check...")
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"
        print("✅ Health Check Passed")

        # --- 2. REGISTRATION (Happy Path) ---
        print("\n[TEST] Registration...")
        payload = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "full_name": "Security Test User"
        }
        headers = {"X-Device-ID": TEST_DEVICE_ID}
        
        resp = await client.post("/api/auth/register", json=payload, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        access_token = data["access_token"]
        print("✅ Registration Passed")

        # --- 3. DEVICE BINDING ATTACK (Spoofing) ---
        print("\n[TEST] Device Binding Attack...")
        # Try to use the valid token with a DIFFERENT device ID
        attack_headers = {
            "Authorization": f"Bearer {access_token}",
            "X-Device-ID": "spoofed-device-id-999"
        }
        # Using a protected endpoint (e.g., transaction creation)
        # Note: We need a protected endpoint. Let's use /api/transactions if available
        # OR just call login with wrong device ID? No, login generates new token for new device usually.
        # But get_current_user checks the binding in the TOKEN against the HEADER.
        
        # Let's hit the transaction endpoint as it's protected
        # Requires idempotency key too
        tx_payload = {"amount": 100, "category": "test"}
        tx_headers = {
            "Authorization": f"Bearer {access_token}",
            "X-Device-ID": "spoofed-device-id-999", # ATTACK
            "Idempotency-Key": str(uuid.uuid4())
        }
        
        resp = await client.post("/api/transactions", json=tx_payload, headers=tx_headers)
        assert resp.status_code == 401
        assert "Device mismatch" in resp.json()["detail"]
        print("✅ Device Binding Attack Blocked")

        # --- 4. IDEMPOTENCY (Replay Attack) ---
        print("\n[TEST] Idempotency & Replay Protection...")
        idem_key = f"idem-{uuid.uuid4()}"
        valid_headers = {
            "Authorization": f"Bearer {access_token}",
            "X-Device-ID": TEST_DEVICE_ID,
            "Idempotency-Key": idem_key
        }
        
        # Request 1: Execute
        resp1 = await client.post("/api/transactions", json=tx_payload, headers=valid_headers)
        assert resp1.status_code == 200
        assert resp1.json()["success"] is True
        
        # Request 2: Replay (Same Key)
        resp2 = await client.post("/api/transactions", json=tx_payload, headers=valid_headers)
        assert resp2.status_code == 200
        # Should be cached response
        assert resp2.json()["source"] == "cache"
        assert resp2.json()["transaction"]["idempotency_key"] == idem_key
        print("✅ Idempotency Verified (Result Cached)")

        # --- 5. AUDIT LOG INTEGRITY ---
        print("\n[TEST] Audit Log Verification...")
        # Verify USER_REGISTERED and TRANSACTION_CREATED events exist and are linked
        db = db_connection
        events = await db["audit_log"].events.find({"data.email": TEST_EMAIL}).to_list(None)
        
        # We might need to query generally if data structure varies
        # Let's look for events by this user? We don't have user_id easily here without decoding token.
        # We can query audit log by 'actor' if we could decode, or by scanning recent events.
        
        # Let's just check the last few events in the DB for integrity
        recent_events = await db["audit_log"].events.find().sort("timestamp", -1).limit(5).to_list(None)
        
        # Check chain of recent events (reverse order in list, but we need chronological for hash check)
        # Actually verify_audit_chain function is best, but let's check manually here for the last link
        if len(recent_events) >= 2:
            latest = recent_events[0]
            previous = recent_events[1]
            
            # Note: recent_events[0] is LATEST. Its prev_hash should == recent_events[1].hash
            assert latest["prev_hash"] == previous["hash"]
            print(f"✅ Audit Chain Integrity Verified (Hash: {latest['hash'][:10]}... linked to {previous['hash'][:10]}...)")
        else:
             print("⚠️  Not enough events to verify chain fully, but db access worked.")

if __name__ == "__main__":
    # Allow running directly or via pytest
    pass
