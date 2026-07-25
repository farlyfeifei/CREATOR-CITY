from __future__ import annotations

import hashlib
import hmac
import uuid
from dataclasses import dataclass

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import Settings, get_settings
from .database import get_db
from .errors import APIError
from .models import AuthSession, User, utcnow
from .security import decode_access_token

bearer = HTTPBearer(auto_error=False)


@dataclass
class AuthContext:
    user: User
    session: AuthSession


def get_auth_context(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> AuthContext:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise APIError(401, "authentication_required", "请先登录。")
    try:
        claims = decode_access_token(credentials.credentials, settings)
        if claims.get("type") != "access":
            raise jwt.InvalidTokenError()
        user_id = uuid.UUID(claims["sub"])
        session_id = uuid.UUID(claims["sid"])
    except (jwt.PyJWTError, ValueError, KeyError) as exc:
        raise APIError(401, "invalid_access_token", "登录状态已失效，请重新登录。") from exc
    session = db.scalar(
        select(AuthSession).where(
            AuthSession.id == session_id,
            AuthSession.user_id == user_id,
        )
    )
    user = db.get(User, user_id)
    if (
        not session
        or session.revoked_at is not None
        or session.expires_at <= utcnow()
        or not user
        or user.status != "active"
    ):
        raise APIError(401, "invalid_access_token", "登录状态已失效，请重新登录。")
    return AuthContext(user=user, session=session)


def client_ip(request: Request, settings: Settings) -> str:
    remote = request.client.host if request.client else "unknown"
    trusted = {
        value.strip()
        for value in settings.trusted_proxy_ips.split(",")
        if value.strip()
    }
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded and remote in trusted:
        return forwarded.split(",", 1)[0].strip()[:64]
    return remote[:64]


def client_ip_bucket_key(request: Request, settings: Settings) -> str:
    return hmac.new(
        settings.refresh_token_pepper.encode(),
        client_ip(request, settings).encode(),
        hashlib.sha256,
    ).hexdigest()
