from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from shared.database import db
from shared.config import settings
from models import User, UserCreate, UserInDB, Token
from passlib.context import CryptContext
from datetime import datetime, timedelta
import jwt

app = FastAPI(title="Auth Service")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@app.on_event("startup")
async def startup():
    await db.connect()

@app.on_event("shutdown")
async def shutdown():
    await db.close()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

@app.post("/register", response_model=User)
async def register(user_in: UserCreate):
    existing = await db.db.users.find_one({"email": user_in.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = UserInDB(
        **user_in.model_dump(exclude={"password"}),
        hashed_password=get_password_hash(user_in.password),
    )
    await db.db.users.insert_one(user.model_dump())
    return User(**user.model_dump())

@app.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user_doc = await db.db.users.find_one({"email": form_data.username})
    if not user_doc or not verify_password(form_data.password, user_doc["hashed_password"]):
         raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    user = UserInDB(**user_doc)
    access_token = create_access_token(data={"sub": user.id})
    return Token(access_token=access_token)
