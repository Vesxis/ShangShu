import smtplib
from email.mime.text import MIMEText

from celery import Celery

from core.config import settings

celery = Celery("tasks", broker=settings.RABBITMQ_URL)

SMTP_TIMEOUT_SECONDS = 30

RETRY = {
    "autoretry_for": (smtplib.SMTPException, OSError),
    "retry_backoff": True,
    "retry_jitter": True,
    "max_retries": 3,
}


def _send(to_email: str, subject: str, body: str) -> None:
    message = MIMEText(body, "plain", "utf-8")
    message["Subject"] = subject
    message["From"] = settings.EMAIL_USER
    message["To"] = to_email
    with smtplib.SMTP("smtp.gmail.com", 587, timeout=SMTP_TIMEOUT_SECONDS) as server:
        server.starttls()
        server.login(settings.EMAIL_USER, settings.EMAIL_PASSWORD)
        server.sendmail(settings.EMAIL_USER, to_email, message.as_string())


@celery.task(**RETRY)
def send_verification_email(to_email: str, token: str) -> None:
    _send(
        to_email,
        "商枢：验证邮箱",
        f"请点击以下链接验证邮箱：\n{settings.FRONTEND_URL}/auth/verify/{token}",
    )


@celery.task(**RETRY)
def send_reset_password_email(to_email: str, token: str) -> None:
    _send(
        to_email,
        "商枢：重置密码",
        f"请点击以下链接重置密码：\n{settings.FRONTEND_URL}/reset-password?token={token}",
    )


@celery.task(**RETRY)
def send_order_status_email(to_email: str, order_id: int, status: str) -> None:
    status_name = {"create": "待付款", "completed": "已完成", "cancelled": "已取消"}.get(status, status)
    _send(
        to_email,
        "商枢：订单状态更新",
        f"你的订单 {order_id} 状态已更新为：{status_name}",
    )


@celery.task(**RETRY)
def send_new_order_notification(
    admin_email: str, order_id: int, client_email: str, amount: float
) -> None:
    _send(
        admin_email,
        "商枢：新订单通知",
        f"用户 {client_email} 已提交订单 {order_id}，金额为 {amount} 美元",
    )