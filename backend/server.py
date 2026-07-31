from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext
import jwt


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB connection
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# Auth settings
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Create the main app without a prefix
app = FastAPI(title="FinTrack API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ---------- Auth Models ----------
class UserBase(BaseModel):
  email: EmailStr
  full_name: Optional[str] = None


class UserCreate(UserBase):
  password: str


class User(UserBase):
  id: str = Field(default_factory=lambda: str(uuid.uuid4()))
  created_at: datetime = Field(default_factory=datetime.utcnow)


class UserInDB(User):
  hashed_password: str


class Token(BaseModel):
  access_token: str
  token_type: str = "bearer"


class TokenData(BaseModel):
  user_id: Optional[str] = None
  email: Optional[EmailStr] = None


# ---------- Core Models ----------
class StatusCheck(BaseModel):
  id: str = Field(default_factory=lambda: str(uuid.uuid4()))
  client_name: str
  timestamp: datetime = Field(default_factory=datetime.utcnow)


class StatusCheckCreate(BaseModel):
  client_name: str


class AccountBase(BaseModel):
  name: str
  type: Literal["bank", "cash", "wallet", "other"] = "bank"
  currency: str = "INR"
  opening_balance: float = 0.0


class AccountCreate(AccountBase):
  pass


class Account(AccountBase):
  id: str = Field(default_factory=lambda: str(uuid.uuid4()))
  created_at: datetime = Field(default_factory=datetime.utcnow)


class TransactionBase(BaseModel):
  account_id: str
  type: Literal["income", "expense", "transfer"]
  category: str
  amount: float
  date: datetime
  description: Optional[str] = None


class TransactionCreate(TransactionBase):
  pass


class Transaction(TransactionBase):
  id: str = Field(default_factory=lambda: str(uuid.uuid4()))
  created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------- Auth Helper Functions ----------
def verify_password(plain_password: str, hashed_password: str) -> bool:
  return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
  return pwd_context.hash(password)


async def get_user_by_email(email: str) -> Optional[UserInDB]:
  doc = await db.users.find_one({"email": email})
  if not doc:
    return None
  return UserInDB(**doc)


async def authenticate_user(email: str, password: str) -> Optional[UserInDB]:
  user = await get_user_by_email(email)
  if not user:
    return None
  if not verify_password(password, user.hashed_password):
    return None
  return user


def create_access_token(*, data: dict, expires_delta: Optional[timedelta] = None) -> str:
  to_encode = data.copy()
  expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
  to_encode.update({"exp": expire})
  encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
  return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
  credentials_exception = HTTPException(status_code=401, detail="Could not validate credentials")
  try:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    user_id: str = payload.get("sub")
    if user_id is None:
      raise credentials_exception
  except Exception as exc:  # noqa: BLE001
    raise credentials_exception from exc

  doc = await db.users.find_one({"id": user_id})
  if not doc:
    raise credentials_exception
  return UserInDB(**doc)


# ---------- Routes ----------
@api_router.get("/")
async def root():
  return {"message": "FinTrack API"}


# Auth routes
@api_router.post("/auth/register", response_model=User)
async def register(user_in: UserCreate):
  existing = await db.users.find_one({"email": user_in.email})
  if existing:
    raise HTTPException(status_code=400, detail="Email already registered")

  user = UserInDB(
    **user_in.model_dump(exclude={"password"}),
    hashed_password=get_password_hash(user_in.password),
  )
  await db.users.insert_one(user.model_dump())
  return User(**user.model_dump())


@api_router.post("/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
  user = await authenticate_user(form_data.username, form_data.password)
  if not user:
    raise HTTPException(status_code=400, detail="Incorrect email or password")

  access_token = create_access_token(data={"sub": user.id})
  return Token(access_token=access_token)


@api_router.get("/auth/me", response_model=User)
async def read_me(current_user: UserInDB = Depends(get_current_user)):
  return User(**current_user.model_dump())


# Health / status checks used by mobile dashboard
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
  status_dict = input.model_dump()
  status_obj = StatusCheck(**status_dict)
  _ = await db.status_checks.insert_one(status_obj.model_dump())
  return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
  status_checks = await db.status_checks.find().sort("timestamp", -1).to_list(1000)
  return [StatusCheck(**status_check) for status_check in status_checks]


# Accounts CRUD (core financial entities)
@api_router.post("/accounts", response_model=Account)
async def create_account(account_in: AccountCreate, current_user: UserInDB = Depends(get_current_user)):
  account = Account(**account_in.model_dump())
  await db.accounts.insert_one(account.model_dump())
  return account


@api_router.get("/accounts", response_model=List[Account])
async def list_accounts(current_user: UserInDB = Depends(get_current_user)):
  accounts = await db.accounts.find().sort("created_at", -1).to_list(1000)
  return [Account(**account) for account in accounts]


@api_router.get("/accounts/{account_id}", response_model=Account)
async def get_account(account_id: str, current_user: UserInDB = Depends(get_current_user)):
  doc = await db.accounts.find_one({"id": account_id})
  if not doc:
    raise HTTPException(status_code=404, detail="Account not found")
  return Account(**doc)


# Transactions (income / expenses)
@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(tx_in: TransactionCreate, current_user: UserInDB = Depends(get_current_user)):
  # Basic referential integrity: ensure account exists
  account = await db.accounts.find_one({"id": tx_in.account_id})
  if not account:
    raise HTTPException(status_code=400, detail="Invalid account_id")

  tx = Transaction(**tx_in.model_dump())
  await db.transactions.insert_one(tx.model_dump())
  return tx


@api_router.get("/transactions", response_model=List[Transaction])
async def list_transactions(account_id: Optional[str] = None, current_user: UserInDB = Depends(get_current_user)):
  query = {}
  if account_id:
    query["account_id"] = account_id

  transactions = await db.transactions.find(query).sort("date", -1).to_list(1000)
  return [Transaction(**tx) for tx in transactions]


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
  CORSMiddleware,
  allow_credentials=True,
  allow_origins=["*"],
  allow_methods=["*"],
  allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
  level=logging.INFO,
  format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
  client.close()
