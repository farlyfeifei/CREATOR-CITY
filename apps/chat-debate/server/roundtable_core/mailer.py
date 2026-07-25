from __future__ import annotations

from collections import defaultdict
from email.message import EmailMessage

import aiosmtplib

from .config import Settings
from .errors import APIError

memory_outbox: dict[tuple[str, str], list[str]] = defaultdict(list)


async def send_code(*, email: str, purpose: str, code: str, settings: Settings) -> None:
    if settings.email_delivery_mode == "memory":
        memory_outbox[(email, purpose)].append(code)
        return
    if not settings.smtp_configured:
        raise APIError(
            503,
            "email_service_unavailable",
            "邮件服务尚未配置，请稍后再试。",
        )

    subject = "ClipClash Pixel 邮箱验证码" if purpose == "register" else "ClipClash Pixel 密码重置码"
    purpose_text = "完成邮箱验证" if purpose == "register" else "重置账号密码"
    expiry_minutes = (
        settings.verification_code_minutes
        if purpose == "register"
        else settings.password_reset_code_minutes
    )
    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = email
    message["Subject"] = subject
    message.set_content(
        f"你正在{purpose_text}。\n\n验证码：{code}\n\n"
        f"验证码将在 {expiry_minutes} 分钟后失效。"
        "若非本人操作，请忽略本邮件。"
    )
    await aiosmtplib.send(
        message,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_username,
        password=settings.smtp_password,
        start_tls=settings.smtp_use_tls,
        timeout=15,
    )
