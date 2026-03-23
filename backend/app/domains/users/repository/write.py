from sqlalchemy.dialects.postgresql import insert

from app.core.logging import logger
from app.db.session import get_session
from app.domains.users.models import UserORM, UserWatchlistORM, UserFilterORM
from app.domains.mutual_fund.models import SchemeMetaORM


def upsert_user(user: dict) -> None:
    """Insert or update a user by uid."""
    with get_session() as session:
        try:
            stmt = insert(UserORM).values(user)
            update_columns = {
                c.name: getattr(stmt.excluded, c.name)
                for c in UserORM.__table__.columns
                if c.name not in ["created_at"]
            }
            stmt = stmt.on_conflict_do_update(
                index_elements=["uid"],
                set_=update_columns
            )
            session.execute(stmt)
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to upsert user | Error: {str(e)}", exc_info=True)
            raise


def add_watchlist_item(uid: str, scheme_id: str, watchlist_name: str) -> None:
    """Add a watchlist item for a user."""
    with get_session() as session:
        try:
            row = (
                session.query(SchemeMetaORM.id, SchemeMetaORM.scheme_code)
                .filter(SchemeMetaORM.scheme_id == scheme_id)
                .first()
            )
            if row is None:
                raise ValueError(f"Invalid scheme_id: {scheme_id}")

            stmt = insert(UserWatchlistORM).values(
                {
                    "uid": uid,
                    "mf_id": row.id,
                    "scheme_id": scheme_id,
                    "scheme_code": row.scheme_code,
                    "watchlist_name": watchlist_name,
                }
            )
            stmt = stmt.on_conflict_do_nothing(
                index_elements=["uid", "watchlist_name", "scheme_id"]
            )
            session.execute(stmt)
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to add watchlist item | Error: {str(e)}", exc_info=True)
            raise


def delete_watchlist_item(uid: str, scheme_id: str, watchlist_name: str) -> int:
    """Delete a watchlist item for a user. Returns rows deleted."""
    with get_session() as session:
        try:
            deleted = (
                session.query(UserWatchlistORM)
                .filter(
                    UserWatchlistORM.uid == uid,
                    UserWatchlistORM.watchlist_name == watchlist_name,
                    UserWatchlistORM.scheme_id == scheme_id,
                )
                .delete(synchronize_session=False)
            )
            session.commit()
            return deleted
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to delete watchlist item | Error: {str(e)}", exc_info=True)
            raise


def update_watchlist_name(uid: str, old_name: str, new_name: str) -> int:
    """Rename a watchlist for a user. Returns rows updated."""
    with get_session() as session:
        try:
            updated = (
                session.query(UserWatchlistORM)
                .filter(
                    UserWatchlistORM.uid == uid,
                    UserWatchlistORM.watchlist_name == old_name,
                )
                .update({"watchlist_name": new_name}, synchronize_session=False)
            )
            session.commit()
            return updated
        except Exception as e:
            session.rollback()
            logger.error(
                f"Failed to update watchlist name | Error: {str(e)}", exc_info=True
            )
            raise


def add_user_filters(
    uid: str,
    filters: dict,
    name: str | None = None,
    description: str | None = None,
    sort_field: str | None = "cagr_3y",
    sort_order: str | None = "desc",
) -> None:
    """Store applied filters for a user. Upsert by (uid, name) when name is provided."""
    with get_session() as session:
        try:
            filters_payload = {
                "filters": filters,
                "sort_field": sort_field,
                "sort_order": sort_order,
            }
            if name:
                existing = (
                    session.query(UserFilterORM)
                    .filter(
                        UserFilterORM.uid == uid,
                        UserFilterORM.name == name,
                    )
                    .first()
                )
                if existing:
                    existing.description = description
                    existing.filters = filters_payload
                    session.commit()
                    return

            record = UserFilterORM(
                uid=uid,
                name=name,
                description=description,
                filters=filters_payload,
            )
            session.add(record)
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to add user filters | Error: {str(e)}", exc_info=True)
            raise


def delete_user_filter(uid: str, filter_id: int) -> int:
    """Delete a saved filter for a user. Returns rows deleted."""
    with get_session() as session:
        try:
            deleted = (
                session.query(UserFilterORM)
                .filter(
                    UserFilterORM.uid == uid,
                    UserFilterORM.id == filter_id,
                )
                .delete(synchronize_session=False)
            )
            session.commit()
            return deleted
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to delete user filter | Error: {str(e)}", exc_info=True)
            raise
