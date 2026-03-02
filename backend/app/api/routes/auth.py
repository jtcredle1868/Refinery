"""Authentication routes — signup, login, profile."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from app.core.database import get_db
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.models.user import User, UserTier

router = APIRouter(prefix="/auth", tags=["auth"])


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str | None
    tier: str
    is_active: bool
    org_id: int | None = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UpgradeTierRequest(BaseModel):
    tier: UserTier


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(request: SignupRequest, db: AsyncSession = Depends(get_db)):
    # Check if email exists
    result = await db.execute(select(User).where(User.email == request.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=request.email,
        hashed_password=get_password_hash(request.password),
        full_name=request.full_name,
        tier=UserTier.FREE,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.patch("/me/upgrade")
async def upgrade_tier(
    request: UpgradeTierRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.tier = request.tier
    db.add(current_user)
    return {"message": f"Upgraded to {request.tier.value}", "tier": request.tier.value}
