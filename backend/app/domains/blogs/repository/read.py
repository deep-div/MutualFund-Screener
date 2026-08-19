from datetime import date

from app.db.session import get_session
from app.domains.blogs.models import BlogORM


def orm_to_dict(row):
    """Convert SQLAlchemy ORM row into dictionary."""
    return {c.name: getattr(row, c.name) for c in row.__table__.columns}


def get_blogs_paginated(
    published_date: date | None = None,
    category: str | None = None,
    limit: int = 10,
    offset: int = 0,
):
    """
    Fetch blogs with optional date/category filters.
    Sort order: most recent first (published_date desc, published_time desc, id desc).
    """
    with get_session() as db:
        query = db.query(BlogORM)

        if published_date is not None:
            query = query.filter(BlogORM.published_date == published_date)
        if category is not None:
            query = query.filter(BlogORM.category == category)

        total = query.count()
        rows = (
            query.order_by(
                BlogORM.published_date.desc(),
                BlogORM.published_time.desc(),
                BlogORM.id.desc(),
            )
            .offset(offset)
            .limit(limit)
            .all()
        )

        return {
            "limit": limit,
            "offset": offset,
            "total": total,
            "items": [orm_to_dict(row) for row in rows],
        }


def get_blog_by_slug(published_date: date, category: str, slug: str):
    """Fetch a single blog by date, category and slug. Returns None if not found."""
    with get_session() as db:
        row = (
            db.query(BlogORM)
            .filter(
                BlogORM.published_date == published_date,
                BlogORM.category == category,
                BlogORM.slug == slug,
            )
            .first()
        )
        if row is None:
            return None
        return orm_to_dict(row)
