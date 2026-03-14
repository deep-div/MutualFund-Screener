from __future__ import annotations

import os
import re
from logging.config import fileConfig

from alembic import context
from alembic.operations import ops as alembic_ops
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import engine_from_config, pool

from app.core.config import settings
from app.db.base import Base

# Alembic Config object provides access to values within alembic.ini
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Provide metadata for 'autogenerate' support
target_metadata = Base.metadata

ALLOW_DESTRUCTIVE_MIGRATIONS = True

def _get_database_url() -> str:
    return settings.DATABASE_URL


def _is_destructive_op(op) -> bool:
    destructive = (
        alembic_ops.DropTableOp,
        alembic_ops.DropIndexOp,
        alembic_ops.DropConstraintOp,
        alembic_ops.DropColumnOp,
)
    return isinstance(op, destructive)


def _collect_destructive_ops(migrate_op) -> list:
    found = []
    if hasattr(migrate_op, "ops"):
        for op in migrate_op.ops:
            if _is_destructive_op(op):
                found.append(op)
            found.extend(_collect_destructive_ops(op))
    return found


def _block_destructive_autogenerate(revision, context, directives) -> None:
    if not directives:
        return
    script = directives[0]
    destructive = _collect_destructive_ops(script.upgrade_ops)
    if destructive:
        names = ", ".join(type(op).__name__ for op in destructive)
        raise RuntimeError(
            "Destructive operations detected during autogenerate. "
            "Please handle drops manually in a dedicated migration. "
            f"Found: {names}"
        )


def _guard_destructive_migrations(connection) -> None:
    allow = ALLOW_DESTRUCTIVE_MIGRATIONS
    if allow:
        return

    script = ScriptDirectory.from_config(context.config)
    mc = MigrationContext.configure(connection)
    current_rev = mc.get_current_revision()
    target_rev = "head"

    destructive_revisions = []
    for rev in script.iterate_revisions(target_rev, current_rev):
        if not rev.path:
            continue
        with open(rev.path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        if re.search(r"\bop\.drop_", content):
            destructive_revisions.append(rev.revision)

    if destructive_revisions:
        raise RuntimeError(
            "Destructive migrations are blocked. "
            "Set ALLOW_DESTRUCTIVE_MIGRATIONS=true to proceed. "
            f"Blocked revisions: {', '.join(destructive_revisions)}"
        )


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = _get_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
        process_revision_directives=_block_destructive_autogenerate,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = _get_database_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        _guard_destructive_migrations(connection)
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            process_revision_directives=_block_destructive_autogenerate,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
