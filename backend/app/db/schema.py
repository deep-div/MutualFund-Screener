from sqlalchemy import create_engine, Column, Integer, String, Float, Date, BigInteger
from app.db.utils import Base, SCHEMA_NAME_MF

"""Defines single mutual fund scheme table"""
class SchemeMetaORM(Base):
    __tablename__ = "mutual_funds"
    __table_args__ = {"schema": SCHEMA_NAME_MF}
    
    id = Column(Integer, primary_key=True, index=True)
    instrument_type = Column(String, nullable=False)
    scheme_code = Column(BigInteger, unique=True, nullable=False, index=True)
    fund_house = Column(String, nullable=False)
    scheme_name = Column(String, nullable=False)
    scheme_sub_name = Column(String, nullable=True)
    option_type = Column(String, nullable=False)
    plan_type = Column(String, nullable=False)
    scheme_category = Column(String, nullable=True)
    scheme_class = Column(String, nullable=False)
    scheme_sub_category = Column(String, nullable=True)
    launch_date = Column(Date, nullable=False)
    current_date = Column(Date, nullable=False)
    current_nav = Column(Float, nullable=False)
    time_since_inception_years = Column(Float, nullable=False)
    total_active_days = Column(Integer, nullable=False)
    nav_record_count = Column(Integer, nullable=False)
    scheme_type = Column(String, nullable=True)
    isin_growth = Column(String, nullable=True)
    isin_div_reinvestment = Column(String, nullable=True)