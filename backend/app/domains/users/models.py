from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy import DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.db.base import Base

TABLE_NAME_4 = "users"
TABLE_NAME_6 = "user_filters"
TABLE_NAME_7 = "user_filter_schemes"

"""Stores user profile information"""
class UserORM(Base):
    __tablename__ = TABLE_NAME_4

    uid = Column(String, primary_key=True, index=True)
    email = Column(String, index=True, unique=True)
    phone = Column(String, index=True, unique=True)
    email_verified = Column(Boolean)
    name = Column(String)
    provider = Column(String)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())


"""Stores applied filter JSON per user"""
class UserFilterORM(Base):
    __tablename__ = TABLE_NAME_6

    id = Column(Integer, primary_key=True, index=True)
    uid = Column(
        String,
        ForeignKey(f"{TABLE_NAME_4}.uid", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    external_id = Column(String(32), index=True, nullable=False, unique=True)
    name = Column(String)
    description = Column(String)
    filters = Column(JSONB, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())


"""Stores selected mutual fund external IDs linked to a saved screen/filter"""
class UserFilterSchemeORM(Base):
    __tablename__ = TABLE_NAME_7
    __table_args__ = (
        UniqueConstraint("user_filter_id", "scheme_external_id", name="uq_user_filter_scheme_external_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_filter_id = Column(
        Integer,
        ForeignKey(f"{TABLE_NAME_6}.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    scheme_external_id = Column(String(32), index=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
