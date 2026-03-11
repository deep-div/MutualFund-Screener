from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.db.base import Base

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"options": "-c timezone=Asia/Kolkata"},
)

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

def warm_up_db():
    """Initialize tables and open a first connection on startup."""
    init_db()
    with engine.connect():
        pass
