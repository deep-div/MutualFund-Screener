from datetime import date, datetime
import re
from typing import Any
import unicodedata
from uuid import uuid4
from zoneinfo import ZoneInfo

from sqlalchemy.exc import IntegrityError

from app.core.logging import logger
from app.db.session import engine, get_session
from app.domains.blogs.models import BlogORM
from app.domains.blogs.schema import BlogCreate
from app.domains.blogs.utils import calculate_read_time


class BlogSlugConflictError(Exception):
    """Raised when date/category/slug combination already exists."""


def ensure_blog_table() -> None:
    """Create blogs table if it does not exist."""
    BlogORM.__table__.create(bind=engine, checkfirst=True)


def create_blog(payload: BlogCreate) -> dict[str, Any]:
    """Insert one blog record and return the saved row as a dictionary."""
    ensure_blog_table()

    with get_session() as session:
        try:
            internal_id = _generate_unique_internal_id(session)
            now_ist = datetime.now(ZoneInfo("Asia/Kolkata"))
            published_date = now_ist.date()
            published_time = now_ist.time().replace(microsecond=0)
            slug = _generate_slug_from_title(payload.title)
            _ensure_slug_available_for_date_category(
                session=session,
                published_date=published_date,
                category=payload.category,
                slug=slug,
            )

            content_dicts = [block.model_dump(mode="json") for block in payload.content]
            read_time = calculate_read_time(content_dicts)

            record = BlogORM(
                internal_id=internal_id,
                title=payload.title,
                slug=slug,
                description=payload.description,
                category=payload.category,
                author_name=payload.author_name,
                author_url=payload.author_url,
                cover_image_url=payload.cover_image_url,
                tags=payload.tags,
                content=content_dicts,
                published_date=published_date,
                published_time=published_time,
                is_published=True,
                read_time=read_time,
            )
            session.add(record)
            session.commit()
            session.refresh(record)
            return _orm_to_dict(record)
        except BlogSlugConflictError:
            session.rollback()
            raise
        except IntegrityError as e:
            session.rollback()
            if "uq_blogs_date_category_slug" in str(e):
                raise BlogSlugConflictError(
                    f"A blog with the same generated slug already exists for category '{payload.category}' on {published_date.isoformat()}. Please update the title."
                )
            logger.error(f"Failed to create blog | Error: {str(e)}", exc_info=True)
            raise
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to create blog | Error: {str(e)}", exc_info=True)
            raise


def _generate_unique_internal_id(session) -> str:
    while True:
        candidate = str(uuid4())
        exists = (
            session.query(BlogORM.id)
            .filter(BlogORM.internal_id == candidate)
            .first()
        )
        if not exists:
            return candidate


def _orm_to_dict(row: BlogORM) -> dict[str, Any]:
    return {c.name: getattr(row, c.name) for c in row.__table__.columns}


def _ensure_slug_available_for_date_category(
    session,
    published_date: date,
    category: str,
    slug: str,
) -> None:
    exists = (
        session.query(BlogORM.id)
        .filter(
            BlogORM.published_date == published_date,
            BlogORM.category == category,
            BlogORM.slug == slug,
        )
        .first()
    )
    if exists:
        raise BlogSlugConflictError(
            f"A blog with the same generated slug already exists for category '{category}' on {published_date.isoformat()}. Please update the title."
        )


def _generate_slug_from_title(title: str) -> str:
    normalized = unicodedata.normalize("NFKD", title)
    ascii_title = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_title.lower()).strip("-")
    return slug or "blog"
