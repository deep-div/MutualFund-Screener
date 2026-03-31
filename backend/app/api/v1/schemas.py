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
    sort_field: str | None = Field(
        default="cagr_3y",
        examples=["cagr_3y", "cagr_1y"],
    )
    sort_order: str | None = Field(
        default="desc",
        examples=["desc", "asc"],
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
                "sort_field": "cagr_3y",
                "sort_order": "desc",
                "enabled_filters": ["scheme_class", "cagr_3y", "cagr_2y"],
                "external_ids": ["MFxjQnbK", "zOzN2Dil"],
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
        default_factory=dict,
        examples=[
            {
                "scheme_class": {"eq": "Equity"},
                "cagr_3y": {"gte": 15},
            }
        ],
    )
    sort_field: str | None = Field(
        default=None,
        examples=["cagr_3y", "expense_ratio", "aum"],
    )
    sort_order: str | None = Field(
        default=None,
        examples=["desc", "asc"],
    )
    enabled_filters: list[str] = Field(
        default_factory=list,
        examples=[["scheme_class", "cagr_3y", "cagr_2y"]],
    )
    external_ids: list[str] = Field(
        default_factory=list,
        examples=[["MFxjQnbK", "zOzN2Dil"]],
    )
