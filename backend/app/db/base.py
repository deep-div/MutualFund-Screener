from sqlalchemy.orm import declarative_base

Base = declarative_base()

"""Important: The Base class must be imported in Alembic's env.py for autogenerate support. Do not remove this import."""
# Import all ORM models so Alembic can discover them via Base.metadata.
# These imports have side effects (model registration) and are intentionally unused.
from app.domains.mutual_fund import models as _mutual_fund_models  # noqa: F401
from app.domains.users import models as _user_models  # noqa: F401
