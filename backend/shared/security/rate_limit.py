"""
Rate Limiting (Abuse Prevention)
- Per-endpoint limits
- IP-based tracking
"""

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, Response
from fastapi.responses import JSONResponse

# Create limiter instance
limiter = Limiter(key_func=get_remote_address)

# Rate limit error handler
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "message": "Too many requests. Please try again later.",
            "retry_after": exc.detail
        }
    )

# Common rate limit decorators
def login_limit():
    """5 login attempts per minute"""
    return limiter.limit("5/minute")

def api_limit():
    """100 requests per minute for general API"""
    return limiter.limit("100/minute")

def transaction_limit():
    """10 transactions per minute"""
    return limiter.limit("10/minute")

def strict_limit():
    """1 request per minute for sensitive operations"""
    return limiter.limit("1/minute")
