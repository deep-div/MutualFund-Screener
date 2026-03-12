from app.db.session import get_session
from app.domains.users.models import UserWatchlistORM, UserFilterORM


"""Convert ORM row to dictionary"""
def orm_to_dict(row):
    """Convert SQLAlchemy ORM row into dictionary"""
    return {c.name: getattr(row, c.name) for c in row.__table__.columns}


def get_user_watchlist(uid: str):
    """Fetch watchlist items for a user."""
    with get_session() as db:
        rows = (
            db.query(UserWatchlistORM)
            .filter(UserWatchlistORM.uid == uid)
            .order_by(UserWatchlistORM.created_at.desc())
            .all()
        )
        return [orm_to_dict(row) for row in rows]


def get_user_filters(uid: str):
    """Fetch filter records for a user."""
    with get_session() as db:
        rows = (
            db.query(UserFilterORM)
            .filter(UserFilterORM.uid == uid)
            .order_by(UserFilterORM.created_at.desc())
            .all()
        )
        return [orm_to_dict(row) for row in rows]
