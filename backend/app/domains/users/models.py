from sqlalchemy import Column, Integer, String, BigInteger, ForeignKey, UniqueConstraint, Boolean
from sqlalchemy import DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.db.base import Base

TABLE_NAME_4 = "users"
TABLE_NAME_5 = "user_watchlist"
TABLE_NAME_6 = "user_filters"
TABLE_NAME_1 = "mutual_fund_screener"

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


"""Stores watchlist items per user"""
class UserWatchlistORM(Base):
    __tablename__ = TABLE_NAME_5

    id = Column(Integer, primary_key=True, index=True)
    uid = Column(
        String,
        ForeignKey(f"{TABLE_NAME_4}.uid", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    scheme_code = Column(
        BigInteger,
        ForeignKey(f"{TABLE_NAME_1}.scheme_code", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    watchlist_name = Column(String, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    __table_args__ = (
        UniqueConstraint(
            "uid",
            "watchlist_name",
            "scheme_code",
        ),
    )


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
    name = Column(String)
    description = Column(String)
    filters = Column(JSONB, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("uid", "name", name="uq_user_filters_uid_name"),
    )
