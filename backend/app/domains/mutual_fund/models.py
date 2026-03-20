from sqlalchemy import Column, Integer, String, Float, Date, BigInteger, ForeignKey
from sqlalchemy import DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.db.base import Base

TABLE_NAME_1 = "mutual_fund_screener"
TABLE_NAME_2 = "mutual_fund_metrics"
TABLE_NAME_3 = "mutual_fund_pipelines"


"""Defines single mutual fund screener table"""
class SchemeMetaORM(Base):
    __tablename__ = TABLE_NAME_1

    id = Column(Integer, primary_key=True, index=True)
    scheme_id = Column(String(8), unique=True, index=True, nullable=False)

    # External IDs system should not rely on - used only for reference and debugging
    scheme_code = Column(BigInteger, unique=True, index=True, nullable=False)

    # Meta Information
    instrument_type = Column(String)
    fund_house = Column(String)
    scheme_name = Column(String)
    scheme_sub_name = Column(String)
    option_type = Column(String)
    plan_type = Column(String)
    scheme_category = Column(String)
    scheme_class = Column(String)
    scheme_sub_category = Column(String)
    scheme_type = Column(String)
    launch_date = Column(Date)
    current_date = Column(Date)
    current_nav = Column(Float)
    nav_change_1d = Column(Float)
    time_since_inception_years = Column(Float)
    total_active_days = Column(Integer)
    nav_record_count = Column(Integer)
    isin_growth = Column(String)
    isin_div_reinvestment = Column(String)

    # Absolute Returns (Short-Term)
    abs_1w = Column(Float)
    abs_1m = Column(Float)
    abs_3m = Column(Float)
    abs_6m = Column(Float)

    # CAGR
    cagr_1y = Column(Float)
    cagr_2y = Column(Float)
    cagr_3y = Column(Float)
    cagr_4y = Column(Float)
    cagr_5y = Column(Float)
    cagr_7y = Column(Float)
    cagr_10y = Column(Float)

    # Rolling CAGR (Average Only)
    rolling_avg_1y = Column(Float)
    rolling_avg_2y = Column(Float)
    rolling_avg_3y = Column(Float)
    rolling_avg_4y = Column(Float)
    rolling_avg_5y = Column(Float)
    rolling_avg_7y = Column(Float)
    rolling_avg_10y = Column(Float)

    # Rolling CAGR (Minimum)
    rolling_min_1y = Column(Float)
    rolling_min_2y = Column(Float)
    rolling_min_3y = Column(Float)
    rolling_min_4y = Column(Float)
    rolling_min_5y = Column(Float)
    rolling_min_7y = Column(Float)
    rolling_min_10y = Column(Float)

    # Rolling CAGR (Maximum)
    rolling_max_1y = Column(Float)
    rolling_max_2y = Column(Float)
    rolling_max_3y = Column(Float)
    rolling_max_4y = Column(Float)
    rolling_max_5y = Column(Float)
    rolling_max_7y = Column(Float)
    rolling_max_10y = Column(Float)

    # Risk Metrics (Max Window)
    volatility_max = Column(Float)
    downside_deviation_max = Column(Float)
    skewness_max = Column(Float)
    kurtosis_max = Column(Float)

    # Risk Adjusted Returns (Max Window)
    sharpe_max = Column(Float)
    sortino_max = Column(Float)
    calmar_max = Column(Float)
    pain_index_max = Column(Float)
    ulcer_index_max = Column(Float)

    # Drawdown
    current_drawdown_percent = Column(Float)
    mdd_max_drawdown_percent = Column(Float)
    mdd_one_year_pct = Column(Float)
    mdd_two_year_pct = Column(Float)
    mdd_three_year_pct = Column(Float)
    mdd_four_year_pct = Column(Float)
    mdd_five_year_pct = Column(Float)
    mdd_seven_year_pct = Column(Float)
    mdd_ten_year_pct = Column(Float)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())


"""Stores complete mutual fund output JSON"""
class SchemeAnalyticsORM(Base):
    __tablename__ = TABLE_NAME_2

    id = Column(Integer, primary_key=True, index=True)
    scheme_id = Column(
        Integer,
        ForeignKey(f"{TABLE_NAME_1}.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False
    )
    scheme_code = Column(BigInteger, index=True, nullable=False)
    full_data = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())


"""Stores pipeline execution status and summary"""
class PipelineRunORM(Base):
    __tablename__ = TABLE_NAME_3

    id = Column(Integer, primary_key=True, index=True)
    pipeline_name = Column(String, index=True, nullable=False)
    pipeline_status = Column(String, nullable=False)

    ingestion_status = Column(String)
    metrics_status = Column(String)
    db_status = Column(String)

    ingestion_records = Column(Integer)
    metrics_records = Column(Integer)
    db_records = Column(Integer)

    ingestion_error = Column(String)
    metrics_error = Column(String)
    db_error = Column(String)

    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
