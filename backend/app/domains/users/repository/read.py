from app.db.session import get_session
from app.domains.users.models import UserScreenORM, UserWatchlistORM


"""Convert ORM row to dictionary"""
def orm_to_dict(row):
    """Convert SQLAlchemy ORM row into dictionary"""
    return {c.name: getattr(row, c.name) for c in row.__table__.columns}


def get_user_screens(uid: str, screen_type: str | None = None):
    """Fetch screen records for a user."""
    with get_session() as db:
        rows = (
            db.query(UserScreenORM)
            .filter(UserScreenORM.uid == uid)
            .order_by(UserScreenORM.created_at.desc())
        )
        if screen_type:
            rows = rows.filter(UserScreenORM.screen_type == screen_type)
        rows = rows.all()
        return _attach_external_ids(db, rows)


def get_user_screens_paginated(
    uid: str,
    limit: int | None = None,
    offset: int = 0,
    screen_type: str | None = None,
):
    """Fetch screen records for a user with optional pagination."""
    with get_session() as db:
        query = (
            db.query(UserScreenORM)
            .filter(UserScreenORM.uid == uid)
            .order_by(UserScreenORM.created_at.desc())
        )
        if screen_type:
            query = query.filter(UserScreenORM.screen_type == screen_type)
        if offset > 0:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        rows = query.all()
        return _attach_external_ids(db, rows)


def count_user_screens(uid: str, screen_type: str | None = None) -> int:
    """Count screen records for a user."""
    with get_session() as db:
        query = db.query(UserScreenORM).filter(UserScreenORM.uid == uid)
        if screen_type:
            query = query.filter(UserScreenORM.screen_type == screen_type)
        return query.count()


def _attach_external_ids(db, rows: list[UserScreenORM]) -> list[dict]:
    if not rows:
        return []

    output = [orm_to_dict(row) for row in rows]
    screen_ids = [row["id"] for row in output]
    scheme_rows = (
        db.query(UserWatchlistORM.user_screen_id, UserWatchlistORM.scheme_external_id)
        .filter(UserWatchlistORM.user_screen_id.in_(screen_ids))
        .all()
    )

    external_ids_by_screen: dict[int, list[str]] = {screen_id: [] for screen_id in screen_ids}
    for user_screen_id, scheme_external_id in scheme_rows:
        external_ids_by_screen[user_screen_id].append(scheme_external_id)

    for row in output:
        row["external_ids"] = external_ids_by_screen.get(row["id"], [])
    return output
