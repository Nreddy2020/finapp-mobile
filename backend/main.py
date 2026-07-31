"""
FastAPI Backend with Bank-Grade Security
"""

import os

from fastapi import FastAPI, Depends, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware # Security & Middleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from shared.security.rate_limit import limiter
from shared.security.auth_deps import get_current_user

# Security imports
from shared.security.rate_limit import rate_limit_handler, login_limit, transaction_limit
from audit.events import write_audit_event
from compliance.consent import enforce_consent
from core.idempotency import enforce_idempotency
from infra.secrets import validate_secrets
from infra.db.mongo import MongoDB

# Route imports
from modules.inflation.api.routes import router as inflation_router
from modules.auth.api.routes import router as auth_router
from modules.transactions.api.routes import router as transactions_router
from modules.intelligence.api.routes import router as intelligence_router

# Create app
app = FastAPI(title="FinTech API", version="1.0.0")

# Include routers
app.include_router(auth_router, prefix="/api/auth")
app.include_router(inflation_router, prefix="/api/inflation")
app.include_router(transactions_router, prefix="/api/transactions")
app.include_router(intelligence_router, prefix="/api/intelligence")

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:8081,http://localhost:19006"
    ).split(",")
    if origin.strip()
]

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    """Validate configuration on startup"""
    try:
        validate_secrets()
        await MongoDB.connect()
        print("✅ All required secrets validated & DB Connected")
    except Exception as e:
        print(f"❌ Startup failed: {e}")
        raise

@app.on_event("shutdown")
async def shutdown():
    await MongoDB.close()

@app.get("/")
async def root():
    return {"message": "FinTech API - Bank-Grade Security Enabled"}

@app.get("/health")
async def health():
    if MongoDB.client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        )
    await MongoDB.client.admin.command("ping")
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
