from __future__ import annotations

import hashlib
import hmac
from dataclasses import dataclass
from functools import lru_cache

import jwt
from jwt import PyJWKClient

from .config import Settings
from .errors import APIError


@dataclass(frozen=True)
class AppleIdentityClaims:
    subject: str
    email: str | None
    email_verified: bool
    is_private_email: bool


@lru_cache(maxsize=4)
def _jwk_client(url: str) -> PyJWKClient:
    return PyJWKClient(url, cache_keys=True, lifespan=3600, timeout=5)


def _claim_is_true(value: object) -> bool:
    return value is True or (isinstance(value, str) and value.lower() == "true")


def verify_apple_identity_token(
    identity_token: str,
    raw_nonce: str,
    settings: Settings,
) -> AppleIdentityClaims:
    """Verify an Apple identity token before Pixel creates its own app session."""
    try:
        signing_key = _jwk_client(settings.apple_jwks_url).get_signing_key_from_jwt(identity_token)
        claims = jwt.decode(
            identity_token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.apple_client_id,
            issuer=settings.apple_issuer,
            options={"require": ["iss", "aud", "exp", "iat", "sub", "nonce"]},
        )
    except jwt.PyJWTError as exc:
        raise APIError(401, "invalid_apple_credential", "Apple 登录凭证无效或已过期。") from exc
    except Exception as exc:
        raise APIError(503, "apple_keys_unavailable", "暂时无法验证 Apple 登录，请稍后重试。") from exc

    expected_nonce = hashlib.sha256(raw_nonce.encode("utf-8")).hexdigest()
    if not isinstance(claims.get("nonce"), str) or not hmac.compare_digest(
        claims["nonce"], expected_nonce
    ):
        raise APIError(401, "invalid_apple_nonce", "Apple 登录校验失败，请重新发起登录。")

    subject = claims.get("sub")
    if not isinstance(subject, str) or not subject:
        raise APIError(401, "invalid_apple_credential", "Apple 登录凭证缺少用户标识。")
    email = claims.get("email") if isinstance(claims.get("email"), str) else None
    email_verified = _claim_is_true(claims.get("email_verified"))
    if email and not email_verified:
        raise APIError(401, "unverified_apple_email", "Apple 尚未确认此账号的邮箱。")
    return AppleIdentityClaims(
        subject=subject,
        email=email,
        email_verified=email_verified,
        is_private_email=_claim_is_true(claims.get("is_private_email")),
    )
