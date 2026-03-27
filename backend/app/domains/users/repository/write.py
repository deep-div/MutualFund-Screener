from sqlalchemy.dialects.postgresql import insert

from app.core.logging import logger
from app.db.session import get_session
from app.domains.users.models import UserORM, UserWatchlistORM, UserFilterORM
from app.domains.users.utils import generate_external_id
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


def add_watchlist_item(uid: str, scheme_external_id: str, watchlist_name: str) -> None:
    """Add a watchlist item for a user."""
    with get_session() as session:
        try:
            row = (
                session.query(SchemeMetaORM.id, SchemeMetaORM.scheme_code)
                .filter(SchemeMetaORM.external_id == scheme_external_id)
                .first()
            )
            if row is None:
                raise ValueError(f"Invalid external_id: {scheme_external_id}")

            watchlist_external_id = None
            while watchlist_external_id is None:
                candidate = generate_external_id()
                exists = (
                    session.query(UserWatchlistORM.id)
                    .filter(UserWatchlistORM.external_id == candidate)
                    .first()
                )
                if not exists:
                    watchlist_external_id = candidate

            stmt = insert(UserWatchlistORM).values(
                {
                    "uid": uid,
                    "scheme_id": row.id,
                    "external_id": watchlist_external_id,
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


def delete_watchlist_item(uid: str, scheme_external_id: str, watchlist_name: str) -> int:
    """Delete a watchlist item for a user. Returns rows deleted."""
    with get_session() as session:
        try:
            row = (
                session.query(SchemeMetaORM.id)
                .filter(SchemeMetaORM.external_id == scheme_external_id)
                .first()
            )
            if row is None:
                return 0
            deleted = (
                session.query(UserWatchlistORM)
                .filter(
                    UserWatchlistORM.uid == uid,
                    UserWatchlistORM.watchlist_name == watchlist_name,
                    UserWatchlistORM.scheme_id == row.id,
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
    sort_field: str | None = None,
    sort_order: str | None = None,
    enabled_filters: list[str] | None = None,
) -> str:
    """Store applied filters for a user as a new entry. Returns external_id."""
    with get_session() as session:
        try:
            filters_payload = {"filters": filters or {}}
            if sort_field:
                filters_payload["sort_field"] = sort_field
            if sort_order:
                filters_payload["sort_order"] = sort_order
            if enabled_filters:
                filters_payload["enabled_filters"] = enabled_filters
            external_id = None
            while external_id is None:
                candidate = generate_external_id()
                exists = (
                    session.query(UserFilterORM.id)
                    .filter(UserFilterORM.external_id == candidate)
                    .first()
                )
                if not exists:
                    external_id = candidate

            record = UserFilterORM(
                uid=uid,
                external_id=external_id,
                name=name,
                description=description,
                filters=filters_payload,
            )
            session.add(record)
            session.commit()
            return external_id
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to add user filters | Error: {str(e)}", exc_info=True)
            raise


def update_user_filters(
    uid: str,
    external_id: str,
    filters: dict,
    name: str | None = None,
    description: str | None = None,
    sort_field: str | None = None,
    sort_order: str | None = None,
    enabled_filters: list[str] | None = None,
) -> int:
    """Update a saved filter for a user by external_id. Returns rows updated."""
    with get_session() as session:
        try:
            filters_payload = {"filters": filters or {}}
            if sort_field:
                filters_payload["sort_field"] = sort_field
            if sort_order:
                filters_payload["sort_order"] = sort_order
            if enabled_filters:
                filters_payload["enabled_filters"] = enabled_filters

            updated = (
                session.query(UserFilterORM)
                .filter(
                    UserFilterORM.uid == uid,
                    UserFilterORM.external_id == external_id,
                )
                .update(
                    {
                        "name": name,
                        "description": description,
                        "filters": filters_payload,
                    },
                    synchronize_session=False,
                )
            )
            session.commit()
            return updated
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to update user filters | Error: {str(e)}", exc_info=True)
            raise


def delete_user_filter(uid: str, external_id: str) -> int:
    """Delete a saved filter for a user by external_id. Returns rows deleted."""
    with get_session() as session:
        try:
            deleted = (
                session.query(UserFilterORM)
                .filter(
                    UserFilterORM.uid == uid,
                    UserFilterORM.external_id == external_id,
                )
                .delete(synchronize_session=False)
            )
            session.commit()
            return deleted
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to delete user filter | Error: {str(e)}", exc_info=True)
            raise
