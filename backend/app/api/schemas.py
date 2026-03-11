from pydantic import BaseModel, Field, ConfigDict
from typing import Any


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


class UserFilterCreate(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "scheme_class": {"eq": "Equity"},
                "cagr_3y": {"gte": 15},
            }
        }
    )

    uid: str
    name: str | None = None
    description: str | None = None
    filters: dict[str, Any] = Field(
        default_factory=lambda: {
            "scheme_class": {"eq": "Equity"},
            "cagr_3y": {"gte": 15},
        }
    )
