from __future__ import annotations

from functools import lru_cache
from urllib.parse import urlparse

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_MIMO_BASE_URL = "https://api.xiaomimimo.com/v1"
DEFAULT_MIMO_MODEL = "mimo-v2.5-pro"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_env: str = "development"
    app_name: str = "ClipClash Pixel API"
    database_url: str = "sqlite:///./pixel-roundtable.sqlite3"
    public_base_url: str = "http://localhost:8810"

    jwt_secret: str = "development-jwt-secret-change-before-production"
    jwt_issuer: str = "pixel.classby.cn"
    jwt_audience: str = "clipclash-pixel-ios"
    access_token_minutes: int = 15
    refresh_token_days: int = 30
    refresh_token_pepper: str = "development-refresh-pepper-change-before-production"
    verification_token_minutes: int = 20

    test_login_enabled: bool = False
    test_login_token: str | None = None
    test_login_email: str = "test-login@pixel.classby.cn"
    test_login_nickname: str = "像素测试账号"
    test_login_balance: int = 1_000_000

    apple_client_id: str = "com.clipclash.pixel"
    apple_issuer: str = "https://appleid.apple.com"
    apple_jwks_url: str = "https://appleid.apple.com/auth/keys"

    email_delivery_mode: str = "disabled"
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None
    smtp_use_tls: bool = True
    verification_code_minutes: int = 10
    password_reset_code_minutes: int = 10

    # Provider credentials are runtime-only deployment secrets.
    ai_chat_provider: str = "mimo"
    opencode_go_api_key: str | None = None
    opencode_go_chat_url: str = "https://api.openai.com/v1"
    opencode_go_chat_model: str = "gpt-4.1-mini"

    # Legacy OpenAI-compatible gateway kept as an operational rollback path.
    grok2api_key: str | None = None
    grok2api_base_url: str = "http://host.docker.internal:8000/v1"
    grok2api_chat_model: str = "grok-4.5"

    mimo_api_key: str | None = None
    mimo_base_url: str = DEFAULT_MIMO_BASE_URL
    mimo_chat_model: str = DEFAULT_MIMO_MODEL
    mimo_tts_model: str = "mimo-v2.5-tts"
    mimo_asr_model: str = "mimo-v2.5-asr"
    prompt_version: str = "pixel-2026-07-16-v1"

    max_audio_bytes: int = 7 * 1024 * 1024
    max_audio_seconds: int = 180
    max_audio_segments: int = 12
    global_ai_concurrency: int = 3
    per_user_ai_concurrency: int = 1
    ai_request_timeout_seconds: int = 120
    stale_reservation_minutes: int = 15
    recovery_loop_seconds: int = 60
    rate_limit_retention_hours: int = 24
    auth_code_retention_hours: int = 24
    revoked_session_retention_days: int = 30
    ai_operational_retention_days: int = 90
    deleted_account_retention_days: int = 365
    public_source_cache_days: int = 7
    public_source_allowed_hosts: str = (
        "douyin.com,iesdouyin.com,douyinvod.com,tiktok.com,tiktokcdn.com"
    )
    rate_limit_user_per_minute: int = 20
    rate_limit_ip_per_minute: int = 60
    rate_limit_auth_email_per_minute: int = 3
    rate_limit_auth_ip_per_minute: int = 10
    rate_limit_login_email_per_minute: int = 10
    rate_limit_login_ip_per_minute: int = 30

    allowed_hosts: str = "*"
    trusted_proxy_ips: str = "127.0.0.1"
    log_level: str = "INFO"

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def test_login_available(self) -> bool:
        return bool(
            self.test_login_enabled
            and not self.is_production
            and self.test_login_token
            and len(self.test_login_token) >= 32
        )

    def is_unlimited_test_user(self, email: str) -> bool:
        return self.test_login_available and email.strip().lower() == self.test_login_email.strip().lower()

    @property
    def smtp_configured(self) -> bool:
        return self.email_delivery_mode == "smtp" and all(
            [self.smtp_host, self.smtp_username, self.smtp_password, self.smtp_from]
        )

    @property
    def ai_configured(self) -> bool:
        return bool(self.active_chat_api_key)

    @property
    def asr_configured(self) -> bool:
        return bool(self.mimo_api_key and self.mimo_api_key.strip())

    @property
    def active_chat_provider(self) -> str:
        return self.ai_chat_provider.strip().lower()

    @property
    def active_chat_api_key(self) -> str | None:
        if self.active_chat_provider == "opencode_go":
            return self.opencode_go_api_key.strip() if self.opencode_go_api_key else None
        if self.active_chat_provider == "grok2api":
            return self.grok2api_key.strip() if self.grok2api_key else None
        return self.mimo_api_key.strip() if self.mimo_api_key else None

    @property
    def active_chat_base_url(self) -> str:
        if self.active_chat_provider == "opencode_go":
            return self.opencode_go_chat_url
        if self.active_chat_provider == "grok2api":
            return self.grok2api_base_url
        return self.mimo_base_url

    @property
    def active_chat_model(self) -> str:
        if self.active_chat_provider == "opencode_go":
            return self.opencode_go_chat_model
        if self.active_chat_provider == "grok2api":
            return self.grok2api_chat_model
        return self.mimo_chat_model

    @model_validator(mode="after")
    def validate_production_secrets(self) -> Settings:
        if self.active_chat_provider not in {"mimo", "grok2api", "opencode_go"}:
            raise ValueError("ai_chat_provider must be mimo, grok2api, or opencode_go")
        if self.test_login_enabled:
            if self.is_production:
                raise ValueError("test login must never be enabled in production")
            if not self.test_login_token or len(self.test_login_token) < 32:
                raise ValueError("test login token must contain at least 32 characters")
            if self.test_login_balance < 1:
                raise ValueError("test login balance must be positive")
        if not self.is_production:
            return self
        weak_values = {
            "development-jwt-secret-change-before-production",
            "development-refresh-pepper-change-before-production",
        }
        if self.jwt_secret in weak_values or self.refresh_token_pepper in weak_values:
            raise ValueError("production secrets must be generated outside the repository")
        if len(self.jwt_secret) < 32 or len(self.refresh_token_pepper) < 32:
            raise ValueError("production JWT secret and refresh pepper must be at least 32 characters")
        if not self.public_base_url.startswith("https://"):
            raise ValueError("production public_base_url must use HTTPS")
        chat_url = urlparse(self.active_chat_base_url)
        allowed_private_hosts = {"127.0.0.1", "localhost", "host.docker.internal"}
        if (
            chat_url.scheme != "https"
            and chat_url.hostname not in allowed_private_hosts
        ):
            raise ValueError("production AI chat endpoint must use HTTPS or a private local host")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
