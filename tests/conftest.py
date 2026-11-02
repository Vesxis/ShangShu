import asyncio
import re
import uuid

import pymysql
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

import database.database as db_module
import database.unit_of_work as uow_module
import models.models  # noqa: F401  - registers every table on Base.metadata
import services.ai.ai_service as ai_svc
import services.auth_service as auth_svc
import services.category_service as category_svc
import services.client_service as client_svc
import services.order_service as order_svc
import services.product_service as product_svc
import services.review_service as review_svc
from app.main import app
from core.config import settings
from database.database import Base

TEST_DB_NAME = f"{settings.DB_NAME}_test"

TEST_DB_URL = settings.database_url("asyncmy", TEST_DB_NAME)


def _connect(database: str | None = None, *, autocommit: bool = False):
    return pymysql.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        database=database,
        charset="utf8mb4",
        autocommit=autocommit,
    )

def _recreate_test_database() -> None:
    """Drop and create the test database, so every run starts empty."""
    if not re.fullmatch(r"[A-Za-z0-9_]+", TEST_DB_NAME):
        raise ValueError("测试数据库名称只能包含字母、数字和下划线")
    with _connect(autocommit=True) as conn, conn.cursor() as cur:
        cur.execute(f"DROP DATABASE IF EXISTS `{TEST_DB_NAME}`")
        cur.execute(
            f"CREATE DATABASE `{TEST_DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"
        )

async def _create_schema(engine) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

class RecordingTask:
    """Stands in for a Celery task: records the call instead of reaching a broker."""

    def __init__(self) -> None:
        self.calls: list[tuple] = []

    def delay(self, *args, **kwargs) -> None:
        self.calls.append((args, kwargs))

class FakeRedis:
    async def get(self, key): return None
    async def set(self, key, value, ex=None): pass
    async def delete(self, *keys): pass
    async def incr(self, key): return 1
    async def expire(self, key, seconds): pass

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    _recreate_test_database()
    engine = create_async_engine(TEST_DB_URL, poolclass=NullPool)
    asyncio.run(_create_schema(engine))
    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    orig = uow_module.async_session_maker
    orig_db = db_module.async_session_maker
    uow_module.async_session_maker = session_maker
    db_module.async_session_maker = session_maker

    fake = FakeRedis()
    client_svc.redis_client = fake
    product_svc.redis_client = fake
    order_svc.redis_client = fake
    auth_svc.redis_client = fake
    category_svc.redis_client = fake
    review_svc.redis_client = fake
    ai_svc.redis_client = fake

    import utils.cache as cache_module
    import utils.dependencies as deps_module
    deps_module.redis_client = fake
    cache_module.redis_client = fake

    order_svc.send_order_status_email = RecordingTask()
    order_svc.send_new_order_notification = RecordingTask()
    auth_svc.send_verification_email = RecordingTask()
    auth_svc.send_reset_password_email = RecordingTask()

    yield
    uow_module.async_session_maker = orig
    db_module.async_session_maker = orig_db
    asyncio.run(engine.dispose())

@pytest.fixture
def client():
    return TestClient(app)

def _db_execute(sql, params):
    with _connect(TEST_DB_NAME) as conn, conn.cursor() as cursor:
        cursor.execute(sql, params)
        conn.commit()

@pytest.fixture
def new_client(client):
    payload = {
        "name": "Bohdan",
        "email": f"user_{uuid.uuid4().hex[:8]}@gmail.com",
        "password": "pass1234",
        "age": 25,
    }
    client.post("/auth/register", json=payload)
    _db_execute("UPDATE clients SET is_verified=true WHERE email=%s", (payload["email"],))
    return payload

@pytest.fixture
def auth_headers(client, new_client):
    response = client.post("/auth/client_login", data={
        "username": new_client["email"],
        "password": new_client["password"],
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
