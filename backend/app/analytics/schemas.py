from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal


class SchemeMeta(BaseModel):
    """Metadata describing a mutual fund scheme."""
    model_config = ConfigDict(extra="allow")

    scheme_code: int
    fund_house: str
    scheme_name: str
    scheme_type: Optional[str] = None
    scheme_category: Optional[str] = None
    total_nav_records: Optional[int] = None
    isin_growth: Optional[str] = None
    isin_div_reinvestment: Optional[str] = None

class NavPoint(BaseModel):
    """Single NAV datapoint for a given date."""
    model_config = ConfigDict(extra="allow")

    date: date
    nav: Decimal

    @field_validator("date", mode="before")
    @classmethod
    def parse_date(cls, v):
        """Parse DD-MM-YYYY formatted date string."""
        if isinstance(v, str):
            return datetime.strptime(v, "%d-%m-%Y").date()
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
    model_config = ConfigDict(extra="allow")

    meta: SchemeMeta
    data: List[NavPoint]