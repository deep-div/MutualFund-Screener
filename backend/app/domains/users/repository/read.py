from app.db.session import get_session
from app.domains.users.models import UserFilterORM, UserFilterSchemeORM


"""Convert ORM row to dictionary"""
def orm_to_dict(row):
    """Convert SQLAlchemy ORM row into dictionary"""
    return {c.name: getattr(row, c.name) for c in row.__table__.columns}


def get_user_filters(uid: str):
    """Fetch filter records for a user."""
    with get_session() as db:
        rows = (
            db.query(UserFilterORM)
            .filter(UserFilterORM.uid == uid)
            .order_by(UserFilterORM.created_at.desc())
            .all()
        )
        return _attach_external_ids(db, rows)


def get_user_filters_paginated(uid: str, limit: int | None = None, offset: int = 0):
    """Fetch filter records for a user with optional pagination."""
    with get_session() as db:
        query = (
            db.query(UserFilterORM)
            .filter(UserFilterORM.uid == uid)
            .order_by(UserFilterORM.created_at.desc())
        )
        if offset > 0:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        rows = query.all()
        return _attach_external_ids(db, rows)


def count_user_filters(uid: str) -> int:
    """Count filter records for a user."""
    with get_session() as db:
        return db.query(UserFilterORM).filter(UserFilterORM.uid == uid).count()


def _attach_external_ids(db, rows: list[UserFilterORM]) -> list[dict]:
    if not rows:
        return []

    output = [orm_to_dict(row) for row in rows]
    filter_ids = [row["id"] for row in output]
    scheme_rows = (
        db.query(UserFilterSchemeORM.user_filter_id, UserFilterSchemeORM.scheme_external_id)
        .filter(UserFilterSchemeORM.user_filter_id.in_(filter_ids))
        .all()
    )

    external_ids_by_filter: dict[int, list[str]] = {filter_id: [] for filter_id in filter_ids}
    for user_filter_id, scheme_external_id in scheme_rows:
        external_ids_by_filter[user_filter_id].append(scheme_external_id)

    for row in output:
        row["external_ids"] = external_ids_by_filter.get(row["id"], [])
    return output
