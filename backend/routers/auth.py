import os
import secrets
import time
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import bcrypt

from database import get_db
from models.user import User
from schemas.user import (
    UserCreate, UserLogin, UserUpdate, UserResponse, TokenResponse,
    ForgotPasswordRequest, ResetPasswordRequest,
)
from utils.auth_utils import create_access_token, get_current_user

router = APIRouter()

# In-memory OTP store: email -> (otp_code, expiry_unix_timestamp)
_otp_store: dict[str, tuple[str, float]] = {}
OTP_TTL = 600  # 10 minutes


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _send_otp_email(to_email: str, otp: str, name: str) -> None:
    host     = os.getenv("EMAIL_HOST", "smtp.gmail.com")
    port     = int(os.getenv("EMAIL_PORT", "587"))
    username = os.getenv("EMAIL_USER", "")
    password = os.getenv("EMAIL_PASSWORD", "")

    if not username or not password:
        raise RuntimeError("SMTP not configured — set EMAIL_USER and EMAIL_PASSWORD in .env")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "ResearchHub AI — Password Reset OTP"
    msg["From"]    = f"ResearchHub AI <{username}>"
    msg["To"]      = to_email

    plain_body = (
        f"Hello {name},\n\n"
        f"Your password reset OTP is:\n\n"
        f"  {otp}\n\n"
        f"This code is valid for 10 minutes.\n"
        f"If you did not request a password reset, ignore this email.\n\n"
        f"— ResearchHub AI"
    )
    html_body = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#020617;color:#fff;padding:32px;border-radius:16px">
      <h2 style="color:#A855F7;margin-top:0">ResearchHub AI</h2>
      <p style="color:#94A3B8">Hello <strong style="color:#fff">{name}</strong>,</p>
      <p style="color:#94A3B8">Your password reset OTP is:</p>
      <div style="background:#0F172A;border:1px solid rgba(124,58,237,.4);border-radius:12px;text-align:center;padding:24px;margin:24px 0">
        <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#A855F7">{otp}</span>
      </div>
      <p style="color:#64748B;font-size:13px">Valid for <strong>10 minutes</strong>. Do not share this code.</p>
    </div>
    """
    msg.attach(MIMEText(plain_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(host, port) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.login(username, password)
        smtp.send_message(msg)


# ── endpoints ──────────────────────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=_hash_password(payload.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"message": "User registered successfully", "user_id": user.id}


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not _verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": user.email})
    return TokenResponse(access_token=token, role=user.role.value)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.name is not None:
        current_user.name = payload.name

    if payload.new_password is not None:
        if not payload.current_password:
            raise HTTPException(status_code=400, detail="current_password is required to set a new password")
        if not _verify_password(payload.current_password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        if len(payload.new_password) < 6:
            raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
        current_user.password_hash = _hash_password(payload.new_password)

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    # Always return 200 to prevent email-enumeration attacks
    if not user:
        return {"message": "If that email is registered, an OTP has been sent."}

    otp = str(secrets.randbelow(1_000_000)).zfill(6)
    _otp_store[payload.email] = (otp, time.time() + OTP_TTL)

    try:
        _send_otp_email(payload.email, otp, user.name)
    except Exception as exc:
        # Dev fallback: print OTP so developers can test without SMTP config
        print(f"[DEV] OTP for {payload.email}: {otp}  (email send failed: {exc})")

    return {"message": "If that email is registered, an OTP has been sent."}


@router.post("/verify-otp")
async def verify_otp(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    stored = _otp_store.get(payload.email)
    if not stored:
        raise HTTPException(status_code=400, detail="No OTP was requested for this email")

    otp_code, expiry = stored
    if time.time() > expiry:
        _otp_store.pop(payload.email, None)
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    if otp_code != payload.otp:
        raise HTTPException(status_code=400, detail="Incorrect OTP. Please try again.")

    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user.password_hash = _hash_password(payload.new_password)
    await db.commit()
    _otp_store.pop(payload.email, None)

    return {"message": "Password reset successfully. You can now log in."}
