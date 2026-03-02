from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserTier
from app.utils.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    get_current_user,
)
from app.utils.response import api_response

router = APIRouter(prefix="/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    tier: str = "indie_free"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/register", status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        tier = UserTier(req.tier)
    except ValueError:
        tier = UserTier.INDIE_FREE

    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        full_name=req.full_name,
        tier=tier,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})

    return api_response(data={
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "tier": user.tier.value,
        },
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    })


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})

    return api_response(data={
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "tier": user.tier.value,
        },
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    })


@router.post("/refresh")
def refresh(req: RefreshRequest, db: Session = Depends(get_db)):
    from jose import JWTError, jwt
    from app.config import settings

    try:
        payload = jwt.decode(req.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        token_type = payload.get("type")
        if user_id is None or token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    access_token = create_access_token({"sub": user.id})
    return api_response(data={
        "access_token": access_token,
        "token_type": "bearer",
    })


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return api_response(data={
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "tier": current_user.tier.value,
        "organization": current_user.organization,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
    })
