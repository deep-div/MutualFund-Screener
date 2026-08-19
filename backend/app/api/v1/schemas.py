from pydantic import AliasChoices, BaseModel, Field, ConfigDict
from typing import Any


class SchemeListRequest(BaseModel):
    screens: dict[str, dict[str, Any]] = Field(
        default_factory=lambda: {
            "scheme_class": {"eq": "Equity"},
            "cagr_3y": {"gte": 15},
        },
        validation_alias=AliasChoices("screens"),
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
    scheme_external_id: list[str] | None = Field(
        default=None,
        validation_alias=AliasChoices("scheme_external_id", "scheme_external_ids", "external_ids"),
        json_schema_extra={
            "example": ["Zl5IRYPK", "sf7obiu3"],
        },
    )


class UserScreenCreate(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "High Growth Equity",
                "description": "Equity funds with 3Y CAGR >= 15",
                "screens": {
                    "scheme_class": {"eq": "Equity"},
                    "cagr_3y": {"gte": 15},
                },
                "sort_field": "cagr_3y",
                "sort_order": "desc",
                "enabled_screens": ["scheme_class", "cagr_3y", "cagr_2y"],
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
    screens: dict[str, Any] = Field(
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
    enabled_screens: list[str] = Field(
        default_factory=list,
        examples=[["scheme_class", "cagr_3y", "cagr_2y"]],
    )
    external_ids: list[str] = Field(
        default_factory=list,
        examples=[["MFxjQnbK", "zOzN2Dil"]],
    )
