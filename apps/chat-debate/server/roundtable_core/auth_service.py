from __future__ import annotations

import uuid
from datetime import timedelta

import jwt
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from .apple_auth import AppleIdentityClaims
from .config import Settings
from .errors import APIError
from .mailer import send_code
from .models import (
    AuthSession,
    CreditLedger,
    CreditWallet,
    EmailVerificationCode,
    PasswordResetCode,
    User,
    utcnow,
)
from .schemas import TokenResponse, UserResponse
from .security import (
    constant_time_equal,
    create_access_token,
    create_verification_token,
    decode_verification_token,
    generate_numeric_code,
    generate_refresh_token,
    hash_password,
    hash_secret,
    normalize_email,
    verify_password,
)

GENERIC_LOGIN_ERROR = APIError(401, "invalid_credentials", "邮箱或密码不正确。")


def _wallet_balance(db: Session, user_id: uuid.UUID) -> int:
    wallet = db.get(CreditWallet, user_id)
    return wallet.balance if wallet else 0


def _new_session(
    db: Session,
    *,
    user: User,
    settings: Settings,
    device_name: str,
    app_version: str,
    family_id: uuid.UUID | None = None,
    parent_session_id: uuid.UUID | None = None,
) -> tuple[AuthSession, str]:
    refresh_token = generate_refresh_token()
    session = AuthSession(
        user_id=user.id,
        refresh_token_hash=hash_secret(refresh_token, settings.refresh_token_pepper),
        token_family_id=family_id or uuid.uuid4(),
        parent_session_id=parent_session_id,
        device_name=device_name,
        app_version=app_version,
        expires_at=utcnow() + timedelta(days=settings.refresh_token_days),
        last_used_at=utcnow(),
    )
    db.add(session)
    db.flush()
    return session, refresh_token


def token_response(
    db: Session,
    *,
    user: User,
    session: AuthSession,
    refresh_token: str,
    settings: Settings,
) -> TokenResponse:
    access_token, expires_in = create_access_token(
        user_id=str(user.id),
        session_id=str(session.id),
        settings=settings,
    )
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        user=UserResponse.model_validate(user),
        balance=_wallet_balance(db, user.id),
    )


async def request_email_code(db: Session, *, email: str, purpose: str, settings: Settings) -> None:
    normalized = normalize_email(email)
    if purpose == "register":
        existing = db.scalar(select(User).where(User.email == normalized, User.status != "deleted"))
        if existing:
            # Keep the send-code response generic and let registration reject duplicates.
            return
    elif purpose == "reset":
        user = db.scalar(select(User).where(User.email == normalized, User.status == "active"))
        if not user:
            return
    else:
        raise APIError(400, "invalid_code_purpose", "不支持的验证码用途。")

    code = generate_numeric_code()
    record = EmailVerificationCode(
        email=normalized,
        purpose=purpose,
        code_hash=hash_secret(code, settings.refresh_token_pepper),
        expires_at=utcnow()
        + timedelta(
            minutes=(
                settings.verification_code_minutes
                if purpose == "register"
                else settings.password_reset_code_minutes
            )
        ),
    )
    db.add(record)
    try:
        await send_code(email=normalized, purpose=purpose, code=code, settings=settings)
    except Exception:
        db.rollback()
        raise
    db.commit()


def verify_email_code(
    db: Session,
    *,
    email: str,
    purpose: str,
    code: str,
    settings: Settings,
) -> str:
    normalized = normalize_email(email)
    record = db.scalar(
        select(EmailVerificationCode)
        .where(
            EmailVerificationCode.email == normalized,
            EmailVerificationCode.purpose == purpose,
            EmailVerificationCode.consumed_at.is_(None),
        )
        .order_by(EmailVerificationCode.created_at.desc())
        .limit(1)
        .with_for_update()
    )
    if not record or record.expires_at <= utcnow() or record.attempts >= 5:
        raise APIError(400, "invalid_verification_code", "验证码无效或已过期。")
    record.attempts += 1
    if not constant_time_equal(
        record.code_hash,
        hash_secret(code, settings.refresh_token_pepper),
    ):
        db.commit()
        raise APIError(400, "invalid_verification_code", "验证码无效或已过期。")
    record.consumed_at = utcnow()
    db.commit()
    return create_verification_token(email=normalized, purpose=purpose, settings=settings)


def register_user(
    db: Session,
    *,
    email: str,
    password: str,
    nickname: str,
    verification_token: str,
    device_name: str,
    app_version: str,
    settings: Settings,
) -> TokenResponse:
    normalized = normalize_email(email)
    if db.scalar(select(User.id).where(User.email == normalized)):
        raise APIError(409, "email_already_registered", "该邮箱已注册。")
    try:
        claims = decode_verification_token(verification_token, settings)
    except jwt.PyJWTError as exc:
        raise APIError(400, "invalid_verification_token", "邮箱验证凭证无效或已过期。") from exc
    if (
        claims.get("type") != "email_verification"
        or claims.get("purpose") != "register"
        or claims.get("sub") != normalized
    ):
        raise APIError(400, "invalid_verification_token", "邮箱验证凭证与当前邮箱不匹配。")
    user = User(
        email=normalized,
        password_hash=hash_password(password),
        nickname=nickname.strip(),
        avatar_seed=uuid.uuid4().hex[:12],
        status="active",
        email_verified_at=utcnow(),
    )
    db.add(user)
    db.flush()
    wallet = CreditWallet(user_id=user.id, balance=10, version=1)
    db.add(wallet)
    db.add(
        CreditLedger(
            user_id=user.id,
            delta=10,
            balance_after=10,
            reason="welcome_grant",
            action_type="account_registration",
            request_id=f"welcome-{user.id}",
            details={"grant": 10},
        )
    )
    session, refresh_token = _new_session(
        db,
        user=user,
        settings=settings,
        device_name=device_name,
        app_version=app_version,
    )
    db.commit()
    return token_response(
        db,
        user=user,
        session=session,
        refresh_token=refresh_token,
        settings=settings,
    )


def login_with_apple(
    db: Session,
    *,
    claims: AppleIdentityClaims,
    full_name: str | None,
    device_name: str,
    app_version: str,
    settings: Settings,
) -> TokenResponse:
    user = db.scalar(
        select(User).where(User.apple_subject == claims.subject, User.status == "active")
    )
    normalized_email = normalize_email(claims.email) if claims.email else None

    if user is None and normalized_email:
        email_owner = db.scalar(
            select(User).where(User.email == normalized_email, User.status == "active")
        )
        if email_owner:
            if email_owner.apple_subject and email_owner.apple_subject != claims.subject:
                raise APIError(409, "apple_account_conflict", "此邮箱已绑定另一个 Apple 账号。")
            user = email_owner
            user.apple_subject = claims.subject
            user.auth_provider = "apple"
            if claims.email_verified:
                user.email_verified_at = user.email_verified_at or utcnow()

    if user is None:
        fallback_email = (
            "apple+"
            + hash_secret(claims.subject, settings.refresh_token_pepper)[:32]
            + "@private.pixel.classby.cn"
        )
        user = User(
            email=normalized_email or fallback_email,
            password_hash=hash_password(uuid.uuid4().hex + uuid.uuid4().hex),
            auth_provider="apple",
            apple_subject=claims.subject,
            nickname=(full_name or "圆桌来客").strip()[:40] or "圆桌来客",
            avatar_seed=uuid.uuid4().hex[:12],
            status="active",
            email_verified_at=utcnow() if claims.email_verified else None,
        )
        db.add(user)
        db.flush()
        db.add(CreditWallet(user_id=user.id, balance=10, version=1))
        db.add(
            CreditLedger(
                user_id=user.id,
                delta=10,
                balance_after=10,
                reason="welcome_grant",
                action_type="apple_account_registration",
                request_id=f"welcome-{user.id}",
                details={"grant": 10, "provider": "apple"},
            )
        )

    session, refresh_token = _new_session(
        db,
        user=user,
        settings=settings,
        device_name=device_name,
        app_version=app_version,
    )
    db.commit()
    return token_response(
        db,
        user=user,
        session=session,
        refresh_token=refresh_token,
        settings=settings,
    )


def login_user(
    db: Session,
    *,
    email: str,
    password: str,
    device_name: str,
    app_version: str,
    settings: Settings,
) -> TokenResponse:
    normalized = normalize_email(email)
    user = db.scalar(select(User).where(User.email == normalized, User.status == "active"))
    if not user or not verify_password(user.password_hash, password):
        raise GENERIC_LOGIN_ERROR
    session, refresh_token = _new_session(
        db,
        user=user,
        settings=settings,
        device_name=device_name,
        app_version=app_version,
    )
    db.commit()
    return token_response(
        db,
        user=user,
        session=session,
        refresh_token=refresh_token,
        settings=settings,
    )


def login_test_user(
    db: Session,
    *,
    device_name: str,
    app_version: str,
    settings: Settings,
) -> TokenResponse:
    normalized = normalize_email(settings.test_login_email)
    user = db.scalar(select(User).where(User.email == normalized))
    if user is None:
        user = User(
            email=normalized,
            password_hash=hash_password(uuid.uuid4().hex + uuid.uuid4().hex),
            auth_provider="email",
            nickname=settings.test_login_nickname,
            avatar_seed="pixel-test-account",
            status="active",
            email_verified_at=utcnow(),
        )
        db.add(user)
        db.flush()
    else:
        user.status = "active"
        user.nickname = settings.test_login_nickname
        user.email_verified_at = user.email_verified_at or utcnow()

    wallet = db.get(CreditWallet, user.id)
    if wallet is None:
        wallet = CreditWallet(user_id=user.id, balance=settings.test_login_balance, version=1)
        db.add(wallet)
    elif wallet.balance < settings.test_login_balance:
        wallet.balance = settings.test_login_balance
        wallet.version += 1

    session, refresh_token = _new_session(
        db,
        user=user,
        settings=settings,
        device_name=device_name,
        app_version=app_version,
    )
    db.commit()
    return token_response(
        db,
        user=user,
        session=session,
        refresh_token=refresh_token,
        settings=settings,
    )


def refresh_session(
    db: Session,
    *,
    refresh_token: str,
    device_name: str,
    app_version: str,
    settings: Settings,
) -> TokenResponse:
    token_hash = hash_secret(refresh_token, settings.refresh_token_pepper)
    existing = db.scalar(
        select(AuthSession).where(AuthSession.refresh_token_hash == token_hash).with_for_update()
    )
    if not existing:
        raise APIError(401, "invalid_refresh_token", "登录状态已失效，请重新登录。")
    if existing.revoked_at is not None:
        if existing.revoke_reason == "rotated":
            db.execute(
                update(AuthSession)
                .where(
                    AuthSession.token_family_id == existing.token_family_id,
                    AuthSession.revoked_at.is_(None),
                )
                .values(revoked_at=utcnow(), revoke_reason="refresh_reuse")
            )
            db.commit()
            raise APIError(401, "refresh_token_reuse", "检测到登录凭证重复使用，请重新登录。")
        raise APIError(401, "invalid_refresh_token", "登录状态已失效，请重新登录。")
    if existing.expires_at <= utcnow():
        existing.revoked_at = utcnow()
        existing.revoke_reason = "expired"
        db.commit()
        raise APIError(401, "refresh_token_expired", "登录状态已过期，请重新登录。")

    user = db.get(User, existing.user_id)
    if not user or user.status != "active":
        raise APIError(401, "account_unavailable", "账号不可用。")
    replacement, new_refresh_token = _new_session(
        db,
        user=user,
        settings=settings,
        device_name=device_name,
        app_version=app_version,
        family_id=existing.token_family_id,
        parent_session_id=existing.id,
    )
    existing.revoked_at = utcnow()
    existing.revoke_reason = "rotated"
    existing.replaced_by_session_id = replacement.id
    existing.last_used_at = utcnow()
    db.commit()
    return token_response(
        db,
        user=user,
        session=replacement,
        refresh_token=new_refresh_token,
        settings=settings,
    )


def revoke_refresh_token(db: Session, *, refresh_token: str, settings: Settings) -> None:
    token_hash = hash_secret(refresh_token, settings.refresh_token_pepper)
    session = db.scalar(select(AuthSession).where(AuthSession.refresh_token_hash == token_hash))
    if session and session.revoked_at is None:
        session.revoked_at = utcnow()
        session.revoke_reason = "logout"
        db.commit()


def revoke_all_sessions(db: Session, *, user_id: uuid.UUID, reason: str) -> None:
    db.execute(
        update(AuthSession)
        .where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None))
        .values(revoked_at=utcnow(), revoke_reason=reason)
    )
    db.commit()


async def forgot_password(db: Session, *, email: str, settings: Settings) -> None:
    normalized = normalize_email(email)
    user = db.scalar(select(User).where(User.email == normalized, User.status == "active"))
    if not user:
        return
    code = generate_numeric_code()
    record = PasswordResetCode(
        user_id=user.id,
        code_hash=hash_secret(code, settings.refresh_token_pepper),
        expires_at=utcnow() + timedelta(minutes=settings.password_reset_code_minutes),
    )
    db.add(record)
    try:
        await send_code(email=normalized, purpose="reset", code=code, settings=settings)
    except Exception:
        db.rollback()
        raise
    db.commit()


def reset_password(
    db: Session,
    *,
    email: str,
    code: str,
    new_password: str,
    settings: Settings,
) -> None:
    normalized = normalize_email(email)
    user = db.scalar(select(User).where(User.email == normalized, User.status == "active"))
    if not user:
        raise APIError(400, "invalid_reset_code", "重置码无效或已过期。")
    record = db.scalar(
        select(PasswordResetCode)
        .where(
            PasswordResetCode.user_id == user.id,
            PasswordResetCode.consumed_at.is_(None),
        )
        .order_by(PasswordResetCode.created_at.desc())
        .limit(1)
        .with_for_update()
    )
    if not record or record.expires_at <= utcnow() or record.attempts >= 5:
        raise APIError(400, "invalid_reset_code", "重置码无效或已过期。")
    record.attempts += 1
    if not constant_time_equal(
        record.code_hash,
        hash_secret(code, settings.refresh_token_pepper),
    ):
        db.commit()
        raise APIError(400, "invalid_reset_code", "重置码无效或已过期。")
    record.consumed_at = utcnow()
    user.password_hash = hash_password(new_password)
    db.execute(
        update(AuthSession)
        .where(AuthSession.user_id == user.id, AuthSession.revoked_at.is_(None))
        .values(revoked_at=utcnow(), revoke_reason="password_reset")
    )
    db.commit()
