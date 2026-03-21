from pydantic import BaseModel, field_validator
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal
from enum import Enum

class SchemeSubCategory(str, Enum):
    """SEBI mutual fund scheme category enum."""
    #  Equity 
    LARGE_CAP = "Large Cap Fund"
    MID_CAP = "Mid Cap Fund"
    SMALL_CAP = "Small Cap Fund"
    LARGE_MID_CAP = "Large & Mid Cap Fund"
    MULTI_CAP = "Multi Cap Fund"
    FLEXI_CAP = "Flexi Cap Fund"
    FOCUSED = "Focused Fund"
    ELSS = "ELSS Fund"
    VALUE = "Value Fund"
    CONTRA = "Contra Fund"
    DIVIDEND_YIELD = "Dividend Yield Fund"
    SECTORAL_THEMATIC = "Sectoral/Thematic Fund"
    INDEX = "Index Fund"

    #  Debt 
    OVERNIGHT = "Overnight Fund"
    LIQUID = "Liquid Fund"
    ULTRA_SHORT_DURATION = "Ultra Short Duration Fund"
    LOW_DURATION = "Low Duration Fund"
    MONEY_MARKET = "Money Market Fund"
    SHORT_DURATION = "Short Duration Fund"
    MEDIUM_DURATION = "Medium Duration Fund"
    MEDIUM_TO_LONG_DURATION = "Medium to Long Duration Fund"
    LONG_DURATION = "Long Duration Fund"
    DYNAMIC_BOND = "Dynamic Bond Fund"
    CORPORATE_BOND = "Corporate Bond Fund"
    BANKING_PSU = "Banking and PSU Fund"
    CREDIT_RISK = "Credit Risk Fund"
    FLOATER = "Floater Fund"
    GILT_FUND = "Gilt Fund"

    #  Hybrid 
    AGGRESSIVE_HYBRID = "Aggressive Hybrid Fund"
    BALANCED_HYBRID = "Balanced Hybrid Fund"
    CONSERVATIVE_HYBRID = "Conservative Hybrid Fund"
    DYNAMIC_ASSET_ALLOCATION = "Dynamic Asset Allocation Fund"
    EQUITY_SAVINGS = "Equity Savings Fund"
    MULTI_ASSET_ALLOCATION = "Multi Asset Allocation Fund"
    ARBITRAGE = "Arbitrage Fund"

    #  Others 
    RETIREMENT = "Solution Oriented - Retirement Fund"
    CHILDRENS = "Solution Oriented - Children's Fund"
    FOF_DOMESTIC = "FoFs (Domestic)"
    FOF_OVERSEAS = "FoFs (Overseas)"

class InstrumentType(str, Enum):
    """Financial instrument type enum."""
    MUTUAL_FUND = "Mutual Fund"
    STOCK = "Stock"
    ETF = "ETF"
    INDEX = "Index"

class SchemeClass(str, Enum):
    """Asset class enum."""
    EQUITY = "Equity"
    DEBT = "Debt"
    HYBRID = "Hybrid"
    OTHER = "Other"


class PlanType(str, Enum):
    """Plan type enum."""
    DIRECT = "Direct"
    REGULAR = "Regular"
    OTHER = "Other"

class OptionType(str, Enum):
    """Option type enum."""
    GROWTH = "Growth"
    IDCW = "IDCW"
    BONUS = "Bonus"
    OTHER = "Other"

class SchemeType(str, Enum):
    """Scheme structure type enum."""
    OPEN_ENDED = "Open Ended Schemes"
    CLOSE_ENDED = "Close Ended Schemes"
    INTERVAL = "Interval Fund"


class SchemeMeta(BaseModel):
    instrument_type: InstrumentType
    scheme_code: int
    fund_house: str
    scheme_name: str
    scheme_sub_name: str
    option_type: OptionType
    plan_type: PlanType
    scheme_category: str
    scheme_class: SchemeClass
    scheme_sub_category: SchemeSubCategory | str
    launch_date: date
    current_date: date
    current_nav: float
    nav_change_1d: Optional[float] = None
    time_since_inception_years: float
    total_active_days: int
    nav_record_count: int
    scheme_type: Optional[SchemeType] = None
    isin_growth: Optional[str] = None
    isin_div_reinvestment: Optional[str] = None


class NavPoint(BaseModel):
    """Single NAV datapoint for a given date."""
    date: date
    nav: Decimal

    @field_validator("date", mode="before")
    @classmethod
    def parse_date(cls, v):
        """Parse DD-MM-YYYY formatted date string."""
        if isinstance(v, str):
            for fmt in ("%d-%m-%Y", "%Y-%m-%d"):
                try:
                    return datetime.strptime(v, fmt).date()
                except ValueError:
                    continue
            raise ValueError(f"Unsupported date format: {v}")
        return v

    @field_validator("nav", mode="before")
    @classmethod
    def parse_nav(cls, v):
        """Convert NAV string to Decimal."""
        if isinstance(v, str):
            return Decimal(v)
        return v


class MutualFundNavResponse(BaseModel):
    """Complete mutual fund NAV ingestion response."""
    meta: SchemeMeta
    data: List[NavPoint]
    removed_weekend_dates: List[date] = []

    @field_validator("removed_weekend_dates", mode="before")
    @classmethod
    def parse_removed_weekend_dates(cls, v):
        """Parse removed weekend date strings in either DD-MM-YYYY or YYYY-MM-DD."""
        if not v:
            return []
        parsed = []
        for item in v:
            if isinstance(item, date):
                parsed.append(item)
                continue
            if isinstance(item, str):
                for fmt in ("%d-%m-%Y", "%Y-%m-%d"):
                    try:
                        parsed.append(datetime.strptime(item, fmt).date())
                        break
                    except ValueError:
                        continue
                else:
                    raise ValueError(f"Unsupported date format: {item}")
            else:
                parsed.append(item)
        return parsed
