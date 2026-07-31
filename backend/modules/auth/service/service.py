from datetime import datetime
from fastapi import HTTPException, status
from modules.auth.domain.models import User, UserCreate, LoginRequest, Token
from infra.db.mongo import MongoDB
from shared.security.encryption import encrypt # Using simple encrypt for PII if needed, but for password we need HASHING
from shared.security.tokens import create_access_token, create_refresh_token, decode_token
from passlib.context import CryptContext
from audit.events import write_audit_event

# Password Hashing Config
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    """
    Application Service for Authentication.
    Handles strict business logic:
    - User uniqueness check
    - Password hashing
    - Token generation
    """

    @staticmethod
    def _verify_password(plain_password, hashed_password):
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def _get_password_hash(password):
        return pwd_context.hash(password)

    @staticmethod
    async def register(payload: UserCreate, device_id: str) -> Token:
        db = MongoDB.get_db()
        
        # 1. Check if user exists
        existing_user = await db.users.find_one({"email": payload.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # 2. Hash password
        hashed_pw = AuthService._get_password_hash(payload.password)
        
        # 3. Create User Document
        user_doc = payload.model_dump(exclude={"password"})
        user_doc["hashed_password"] = hashed_pw
        user_doc["created_at"] = datetime.utcnow()
        user_doc["updated_at"] = datetime.utcnow()
        
        # 4. Save to DB
        result = await db.users.insert_one(user_doc)
        user_id = str(result.inserted_id)
        
        # 5. Generate Tokens
        access = create_access_token(user_id, device_id)
        refresh = create_refresh_token(user_id, device_id)
        
        # 6. Audit Log
        await write_audit_event(
            event_type="USER_REGISTERED",
            actor=user_id,
            resource="user",
            data={"email": payload.email, "device_id": device_id}
        )
        
        return Token(
            access_token=access,
            refresh_token=refresh
        )

    @staticmethod
    async def login(payload: LoginRequest, device_id: str) -> Token:
        db = MongoDB.get_db()
        
        # 1. Find User
        user = await db.users.find_one({"email": payload.email})
        if not user:
             # Use generic message for security
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
            
        # 2. Verify Password
        if not AuthService._verify_password(payload.password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
            
        # 3. Generate Tokens
        user_id = str(user["_id"])
        access = create_access_token(user_id, device_id)
        refresh = create_refresh_token(user_id, device_id)
        
        # 4. Audit Log
        await write_audit_event(
            event_type="USER_LOGGED_IN",
            actor=user_id,
            resource="token",
            data={"device_id": device_id}
        )
        
        return Token(
            access_token=access,
            refresh_token=refresh
        )

    @staticmethod
    async def refresh(refresh_token: str, device_id: str) -> Token:
        """Validate incoming refresh token and issue new rotated tokens."""
        try:
            payload = decode_token(refresh_token)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

        # Ensure token is a refresh token
        if payload.get('type') != 'refresh':
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token type')

        # Ensure device binding
        if payload.get('device_id') != device_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Device mismatch')

        user_id = payload.get('sub')
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token payload')

        db = MongoDB.get_db()
        # Verify user exists
        from bson import ObjectId
        try:
            user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
        except Exception:
            user_doc = None

        if not user_doc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='User not found')

        # Issue new tokens (rotation)
        access = create_access_token(user_id, device_id)
        refresh = create_refresh_token(user_id, device_id)

        await write_audit_event(
            event_type="TOKEN_REFRESHED",
            actor=user_id,
            resource="token",
            data={"device_id": device_id, "old_jti": payload.get('jti')}
        )

        return Token(
            access_token=access,
            refresh_token=refresh
        )
