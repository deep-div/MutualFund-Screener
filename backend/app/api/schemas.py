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
                "name": "High Growth Equity",
                "description": "Equity funds with 3Y CAGR >= 15",
                "filters": {
                    "scheme_class": {"eq": "Equity"},
                    "cagr_3y": {"gte": 15},
                },
            }
        }
    )

    name: str | None = Field(
        default=None,
        examples=["High Growth Equity"],
    )
    description: str | None = Field(
        default=None,
        examples=["Equity funds with 3Y CAGR >= 15"],
    )
    filters: dict[str, Any] = Field(
        default_factory=lambda: {
            "scheme_class": {"eq": "Equity"},
            "cagr_3y": {"gte": 15},
        },
        examples=[
            {
                "scheme_class": {"eq": "Equity"},
                "cagr_3y": {"gte": 15},
            }
        ],
    )
