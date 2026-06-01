import random
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.models import PasswordResetCode, User
from src.schemas import (
    ForgotPasswordIn,
    LoginIn,
    RegisterIn,
    ResetPasswordIn,
    TokenOut,
    UserOut,
    VerifyResetCodeIn,
    VerifyResetCodeOut,
)
from src.services.auth_service import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut, status_code=201)
async def register(payload: RegisterIn, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Bu e-posta zaten kayıtlı")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return TokenOut(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
async def login(payload: LoginIn, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(User.email == payload.email, User.is_active.is_(True))
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı")
    return TokenOut(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.post("/forgot-password", status_code=200)
async def forgot_password(payload: ForgotPasswordIn, db: AsyncSession = Depends(get_db)):
    code = str(random.randint(100000, 999999))
    expires = datetime.utcnow() + timedelta(minutes=15)
    db.add(PasswordResetCode(email=payload.email, code=code, expires_at=expires))
    await db.commit()
    # Gerçek projede burada e-posta gönderilir; şimdilik loga yazıyoruz
    import logging

    logging.getLogger(__name__).info("Reset code for %s: %s", payload.email, code)
    return {"message": "Sıfırlama kodu gönderildi", "dev_code": code}


@router.post("/verify-reset-code", response_model=VerifyResetCodeOut)
async def verify_reset_code(payload: VerifyResetCodeIn, db: AsyncSession = Depends(get_db)):
    now = datetime.utcnow()
    result = await db.execute(
        select(PasswordResetCode).where(
            PasswordResetCode.email == payload.email,
            PasswordResetCode.code == payload.code,
            PasswordResetCode.used.is_(False),
            PasswordResetCode.expires_at > now,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=400, detail="Kod hatalı veya süresi dolmuş")
    return VerifyResetCodeOut(valid=True, reset_token=f"{record.id}:{payload.code}")


@router.post("/reset-password", status_code=200)
async def reset_password(payload: ResetPasswordIn, db: AsyncSession = Depends(get_db)):
    try:
        record_id, code = payload.reset_token.split(":")
    except ValueError:
        raise HTTPException(status_code=400, detail="Geçersiz reset token")

    now = datetime.utcnow()
    result = await db.execute(
        select(PasswordResetCode).where(
            PasswordResetCode.id == int(record_id),
            PasswordResetCode.code == code,
            PasswordResetCode.used.is_(False),
            PasswordResetCode.expires_at > now,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş token")

    user_result = await db.execute(select(User).where(User.email == record.email))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    user.password_hash = hash_password(payload.new_password)
    record.used = True
    await db.commit()
    return {"message": "Şifre güncellendi"}
