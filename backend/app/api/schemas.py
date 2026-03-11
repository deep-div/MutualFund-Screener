from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Any, Optional
from datetime import datetime


class SchemeListRequest(BaseModel):
    filters: dict[str, dict[str, Any]] = Field(
        default_factory=lambda: {
            "scheme_class": {"eq": "Equity"},
            "cagr_3y": {"gte": 15},
        },
        json_schema_extra={
            "example": {
                "scheme_class": {"eq": "Equity"},
                "cagr_3y": {"gte": 15},
            }
        },
    )


class UserBase(BaseModel):
    uid: str
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    name: Optional[str] = None
    provider: Optional[str] = None


class UserCreate(UserBase):
    pass


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)
    created_at: datetime
    updated_at: datetime


class WatchlistBase(BaseModel):
    uid: str
    scheme_code: int


class WatchlistCreate(WatchlistBase):
    pass


class WatchlistRead(WatchlistBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


class UserFilterBase(BaseModel):
    uid: str
    filters: dict[str, Any]


class UserFilterCreate(UserFilterBase):
    pass


class UserFilterRead(UserFilterBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
