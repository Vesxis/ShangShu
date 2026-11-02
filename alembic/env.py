import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import create_engine, pool

sys.path.insert(0, str(Path(__file__).parent.parent))

import models.models  # noqa: E402, F401
from alembic import context  # noqa: E402
from core.config import settings  # noqa: E402
from database.database import Base  # noqa: E402

target_metadata = Base.metadata
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url("pymysql"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(settings.database_url("pymysql"), poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()
    connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

