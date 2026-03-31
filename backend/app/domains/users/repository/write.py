from sqlalchemy.dialects.postgresql import insert

from app.core.logging import logger
from app.db.session import get_session
from app.domains.users.models import UserORM, UserFilterORM, UserFilterSchemeORM
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


def add_user_filters(
    uid: str,
    filters: dict,
    name: str | None = None,
    description: str | None = None,
    sort_field: str | None = None,
    sort_order: str | None = None,
    enabled_filters: list[str] | None = None,
    external_ids: list[str] | None = None,
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
            session.flush()

            scheme_external_ids = _normalize_external_ids(external_ids)
            if scheme_external_ids:
                session.add_all(
                    [
                        UserFilterSchemeORM(
                            user_filter_id=record.id,
                            scheme_external_id=scheme_external_id,
                        )
                        for scheme_external_id in scheme_external_ids
                    ]
                )
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
    external_ids: list[str] | None = None,
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

            target = (
                session.query(UserFilterORM)
                .filter(
                    UserFilterORM.uid == uid,
                    UserFilterORM.external_id == external_id,
                )
                .first()
            )
            if not target:
                session.commit()
                return 0

            target.name = name
            target.description = description
            target.filters = filters_payload

            if external_ids is not None:
                session.query(UserFilterSchemeORM).filter(
                    UserFilterSchemeORM.user_filter_id == target.id
                ).delete(synchronize_session=False)
                scheme_external_ids = _normalize_external_ids(external_ids)
                if scheme_external_ids:
                    session.add_all(
                        [
                            UserFilterSchemeORM(
                                user_filter_id=target.id,
                                scheme_external_id=scheme_external_id,
                            )
                            for scheme_external_id in scheme_external_ids
                        ]
                    )
            session.commit()
            return 1
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


def delete_user_filter_scheme(uid: str, filter_external_id: str, scheme_external_id: str) -> int:
    """Delete one selected scheme from a user's saved filter by external IDs."""
    with get_session() as session:
        try:
            target_filter = (
                session.query(UserFilterORM.id)
                .filter(
                    UserFilterORM.uid == uid,
                    UserFilterORM.external_id == filter_external_id,
                )
                .first()
            )
            if not target_filter:
                session.commit()
                return 0

            deleted = (
                session.query(UserFilterSchemeORM)
                .filter(
                    UserFilterSchemeORM.user_filter_id == target_filter.id,
                    UserFilterSchemeORM.scheme_external_id == scheme_external_id,
                )
                .delete(synchronize_session=False)
            )
            session.commit()
            return deleted
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to delete user filter scheme | Error: {str(e)}", exc_info=True)
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
