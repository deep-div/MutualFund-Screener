from sqlalchemy.dialects.postgresql import insert

from app.core.logging import logger
from app.db.session import get_session
from app.domains.users.models import UserORM, UserWatchlistORM, UserFilterORM


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


def add_watchlist_item(uid: str, scheme_code: int) -> None:
    """Add a watchlist item for a user."""
    with get_session() as session:
        try:
            stmt = insert(UserWatchlistORM).values(
                {"uid": uid, "scheme_code": scheme_code}
            )
            stmt = stmt.on_conflict_do_nothing(
                index_elements=["uid", "scheme_code"]
            )
            session.execute(stmt)
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to add watchlist item | Error: {str(e)}", exc_info=True)
            raise


def delete_watchlist_item(uid: str, scheme_code: int) -> int:
    """Delete a watchlist item for a user. Returns rows deleted."""
    with get_session() as session:
        try:
            deleted = (
                session.query(UserWatchlistORM)
                .filter(
                    UserWatchlistORM.uid == uid,
                    UserWatchlistORM.scheme_code == scheme_code,
                )
                .delete(synchronize_session=False)
            )
            session.commit()
            return deleted
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to delete watchlist item | Error: {str(e)}", exc_info=True)
            raise


def add_user_filters(
    uid: str,
    filters: dict,
    name: str | None = None,
    description: str | None = None,
    sort_field: str | None = "cagr_3y",
    sort_order: str | None = "desc",
) -> None:
    """Store applied filters for a user."""
    with get_session() as session:
        try:
            filters_payload = {
                "filters": filters,
                "sort_field": sort_field,
                "sort_order": sort_order,
            }
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


def update_user_filter(
    uid: str,
    filter_id: int,
    *,
    name: str | None = None,
    description: str | None = None,
    filters: dict | None = None,
    sort_field: str | None = None,
    sort_order: str | None = None,
) -> int:
    """Update a saved filter for a user. Returns rows updated."""
    with get_session() as session:
        try:
            update_payload: dict = {}

            if name is not None:
                update_payload["name"] = name
            if description is not None:
                update_payload["description"] = description

            if filters is not None or sort_field is not None or sort_order is not None:
                existing = (
                    session.query(UserFilterORM)
                    .filter(
                        UserFilterORM.uid == uid,
                        UserFilterORM.id == filter_id,
                    )
                    .first()
                )
                if existing is None:
                    session.rollback()
                    return 0

                current_filters = existing.filters or {}
                if isinstance(current_filters, dict) and "filters" in current_filters:
                    merged = dict(current_filters)
                else:
                    merged = {"filters": current_filters} if current_filters else {}

                if filters is not None:
                    merged["filters"] = filters
                if sort_field is not None:
                    merged["sort_field"] = sort_field
                if sort_order is not None:
                    merged["sort_order"] = sort_order

                update_payload["filters"] = merged

            if not update_payload:
                return 0

            updated = (
                session.query(UserFilterORM)
                .filter(
                    UserFilterORM.uid == uid,
                    UserFilterORM.id == filter_id,
                )
                .update(update_payload, synchronize_session=False)
            )
            session.commit()
            return updated
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to update user filter | Error: {str(e)}", exc_info=True)
            raise
