from fastapi import APIRouter, Header, Depends, Body
from modules.auth.domain.models import UserCreate, LoginRequest, Token
from modules.auth.service.service import AuthService

router = APIRouter(tags=["Authentication"])

@router.post("/register", response_model=Token)
async def register(
    payload: UserCreate = Body(...),
    device_id: str = Header(..., alias="X-Device-ID", description="Unique Device Indicator")
):
    """
    Register a new user.
    Requires Device-ID header for binding.
    """
    return await AuthService.register(payload, device_id)

@router.post("/login", response_model=Token)
async def login(
    payload: LoginRequest = Body(...),
    device_id: str = Header(..., alias="X-Device-ID", description="Unique Device Indicator")
):
    """
    Login with Email/Password.
    Returns Access and Refresh tokens bound to Device-ID.
    """
    return await AuthService.login(payload, device_id)


@router.post("/refresh", response_model=Token)
async def refresh(
    payload: dict = Body(...),
    device_id: str = Header(..., alias="X-Device-ID", description="Unique Device Indicator")
):
    """
    Refresh access/refresh tokens using a valid refresh token.
    Body: { "refresh_token": "..." }
    """
    refresh_token = payload.get('refresh_token')
    if not refresh_token:
        raise HTTPException(status_code=400, detail='refresh_token required')
    return await AuthService.refresh(refresh_token, device_id)
