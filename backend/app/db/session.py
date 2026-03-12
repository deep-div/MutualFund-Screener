from contextlib import contextmanager
from pathlib import Path
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.core.logging import logger

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"options": "-c timezone=Asia/Kolkata"},
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

@contextmanager
def get_session():
    """Provide a database session and ensure it closes after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

"""Database initialization and Alembic migration handling. Runs: alembic upgrade head"""
def _alembic_config() -> Config:
    alembic_ini = Path("alembic.ini")
    config = Config(str(alembic_ini))
    # Ensure runtime env URL is used (and not a stale value from alembic.ini)
    config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
    return config

def run_migrations() -> None:
    """Run Alembic migrations to the latest revision."""
    command.upgrade(_alembic_config(), "head")

def init_db():
    """Optionally run DB migrations on startup (disabled by default)."""
    if not settings.RUN_DB_MIGRATIONS_ON_STARTUP:
        logger.info("DB migrations are disabled on startup.")
        return

    logger.info("Running DB migrations on startup.")
    run_migrations()

