from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.db.base import Base

engine = create_engine(settings.DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

def get_session():
    """Returns a plain database session (non-generator)"""
    return SessionLocal()

def init_db():
    """Create tables if they don't exist."""
    # Ensure model metadata is registered before create_all
    Base.metadata.create_all(bind=engine)
