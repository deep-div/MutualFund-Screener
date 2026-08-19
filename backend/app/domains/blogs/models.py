from sqlalchemy import Boolean, Column, Date, DateTime, Integer, String, Time, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.db.base import Base

TABLE_NAME_BLOGS = "blogs"


class BlogORM(Base):
    __tablename__ = TABLE_NAME_BLOGS
    __table_args__ = (
        UniqueConstraint("published_date", "category", "slug", name="uq_blogs_date_category_slug"),
        UniqueConstraint("internal_id", name="uq_blogs_internal_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    internal_id = Column(String(36), nullable=False, unique=True, index=True)
    slug = Column(String(255), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String(500))
    category = Column(String(64), nullable=False, index=True)
    author_name = Column(String(120))
    author_url = Column(String(500))
    cover_image_url = Column(String(500), nullable=False)
    tags = Column(JSONB, nullable=False, server_default="[]")
    is_published = Column(Boolean, nullable=False, server_default="true", index=True)
    read_time = Column(Integer, nullable=False, server_default="1")
    published_date = Column(Date, nullable=False, index=True)
    published_time = Column(Time, nullable=False)
    content = Column(JSONB, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
