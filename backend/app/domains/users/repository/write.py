from sqlalchemy.dialects.postgresql import insert

from app.core.logging import logger
from app.db.session import get_session
from app.domains.users.models import (
    SCREEN_TYPE_SCREEN,
    SCREEN_TYPE_WATCHLIST,
    UserORM,
    UserScreenORM,
    UserWatchlistORM,
)
from app.domains.users.utils import generate_external_id


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


def add_user_screens(
    uid: str,
    screens: dict,
    name: str | None = None,
    description: str | None = None,
    sort_field: str | None = None,
    sort_order: str | None = None,
    enabled_screens: list[str] | None = None,
    external_ids: list[str] | None = None,
) -> str:
    """Store applied screens for a user as a new entry. Returns external_id."""
    with get_session() as session:
        try:
            screens_payload = {"screens": screens or {}}
            if sort_field:
                screens_payload["sort_field"] = sort_field
            if sort_order:
                screens_payload["sort_order"] = sort_order
            if enabled_screens:
                screens_payload["enabled_screens"] = enabled_screens
            external_id = None
            while external_id is None:
                candidate = generate_external_id()
                exists = (
                    session.query(UserScreenORM.id)
                    .filter(UserScreenORM.external_id == candidate)
                    .first()
                )
                if not exists:
                    external_id = candidate

            record = UserScreenORM(
                uid=uid,
                external_id=external_id,
                name=name,
                description=description,
                screens=screens_payload,
            )
            session.add(record)
            session.flush()

            scheme_external_ids = _normalize_external_ids(external_ids)
            if scheme_external_ids:
                session.add_all(
                    [
                        UserWatchlistORM(
                            user_screen_id=record.id,
                            scheme_external_id=scheme_external_id,
                        )
                        for scheme_external_id in scheme_external_ids
                    ]
                )
            record.screen_type = _derive_screen_type(scheme_external_ids)
            session.commit()
            return external_id
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to add user screens | Error: {str(e)}", exc_info=True)
            raise


def update_user_screens(
    uid: str,
    external_id: str,
    screens: dict,
    name: str | None = None,
    description: str | None = None,
    sort_field: str | None = None,
    sort_order: str | None = None,
    enabled_screens: list[str] | None = None,
    external_ids: list[str] | None = None,
) -> int:
    """Update a saved screen for a user by external_id. Returns rows updated."""
    with get_session() as session:
        try:
            screens_payload = {"screens": screens or {}}
            if sort_field:
                screens_payload["sort_field"] = sort_field
            if sort_order:
                screens_payload["sort_order"] = sort_order
            if enabled_screens:
                screens_payload["enabled_screens"] = enabled_screens

            target = (
                session.query(UserScreenORM)
                .filter(
                    UserScreenORM.uid == uid,
                    UserScreenORM.external_id == external_id,
                )
                .first()
            )
            if not target:
                session.commit()
                return 0

            target.name = name
            target.description = description
            target.screens = screens_payload

            if external_ids is not None:
                session.query(UserWatchlistORM).filter(
                    UserWatchlistORM.user_screen_id == target.id
                ).delete(synchronize_session=False)
                scheme_external_ids = _normalize_external_ids(external_ids)
                if scheme_external_ids:
                    session.add_all(
                        [
                            UserWatchlistORM(
                                user_screen_id=target.id,
                                scheme_external_id=scheme_external_id,
                            )
                            for scheme_external_id in scheme_external_ids
                        ]
                    )
                target.screen_type = _derive_screen_type(scheme_external_ids)
            session.commit()
            return 1
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to update user screens | Error: {str(e)}", exc_info=True)
            raise


def delete_user_screen(uid: str, external_id: str) -> int:
    """Delete a saved screen for a user by external_id. Returns rows deleted."""
    with get_session() as session:
        try:
            deleted = (
                session.query(UserScreenORM)
                .filter(
                    UserScreenORM.uid == uid,
                    UserScreenORM.external_id == external_id,
                )
                .delete(synchronize_session=False)
            )
            session.commit()
            return deleted
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to delete user screen | Error: {str(e)}", exc_info=True)
            raise


def delete_user_watchlist_scheme(uid: str, screen_external_id: str, scheme_external_id: str) -> int:
    """Delete one selected scheme from a user's saved watchlist by external IDs."""
    with get_session() as session:
        try:
            target_screen = (
                session.query(UserScreenORM.id)
                .filter(
                    UserScreenORM.uid == uid,
                    UserScreenORM.external_id == screen_external_id,
                )
                .first()
            )
            if not target_screen:
                session.commit()
                return 0

            deleted = (
                session.query(UserWatchlistORM)
                .filter(
                    UserWatchlistORM.user_screen_id == target_screen.id,
                    UserWatchlistORM.scheme_external_id == scheme_external_id,
                )
                .delete(synchronize_session=False)
            )
            if deleted:
                remaining = (
                    session.query(UserWatchlistORM.id)
                    .filter(UserWatchlistORM.user_screen_id == target_screen.id)
                    .count()
                )
                next_type = SCREEN_TYPE_WATCHLIST if remaining > 0 else SCREEN_TYPE_SCREEN
                (
                    session.query(UserScreenORM)
                    .filter(UserScreenORM.id == target_screen.id)
                    .update({"screen_type": next_type}, synchronize_session=False)
                )
            session.commit()
            return deleted
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to delete user watchlist scheme | Error: {str(e)}", exc_info=True)
            raise


def _normalize_external_ids(external_ids: list[str] | None) -> list[str]:
    if not external_ids:
        return []
    seen: set[str] = set()
    normalized: list[str] = []
    for external_id in external_ids:
        if external_id is None:
            continue
        value = str(external_id).strip()
        if not value or value in seen:
            continue
        seen.add(value)
        normalized.append(value)
    return normalized


def _derive_screen_type(scheme_external_ids: list[str]) -> str:
    return SCREEN_TYPE_WATCHLIST if scheme_external_ids else SCREEN_TYPE_SCREEN
