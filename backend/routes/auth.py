from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from db import users_collection
from datetime import datetime, timedelta
import hashlib
import jwt
import os

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()

SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
ALGORITHM = "HS256"


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(days=7),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/register")
def register(data: RegisterRequest):
    if users_collection.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    user = {
        "name": data.name,
        "email": data.email,
        "password": hash_password(data.password),
        "created_at": datetime.utcnow(),
        "role": "user",
    }
    result = users_collection.insert_one(user)
    token = create_token(str(result.inserted_id), data.email)
    return {"token": token, "name": data.name, "email": data.email}


@router.post("/login")
def login(data: LoginRequest):
    user = users_collection.find_one({"email": data.email})
    if not user or user["password"] != hash_password(data.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(str(user["_id"]), data.email)
    return {"token": token, "name": user["name"], "email": data.email}
