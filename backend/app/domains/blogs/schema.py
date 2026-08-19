from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BlogContentBlock(BaseModel):
    type: Literal["heading", "subheading", "paragraph", "body", "bullet", "bullets", "quote", "image"] = Field(
        ...,
        examples=["heading", "paragraph", "body"],
    )
    value: str | list[str] = Field(
        ...,
        examples=["Why Mid-Cap Funds Are Popular"],
    )

    @field_validator("value", mode="before")
    @classmethod
    def strip_value(cls, value: str | list):
        if isinstance(value, str):
            value = value.strip()
        elif isinstance(value, list):
            value = [v.strip() if isinstance(v, str) else v for v in value]
        return value


class BlogBase(BaseModel):
    title: str = Field(
        ...,
        min_length=5,
        max_length=255,
        examples=["How to Choose the Right Mutual Fund for Long-Term Growth"],
    )
    description: str = Field(
        ...,
        max_length=500,
        examples=["A beginner-friendly guide to picking mutual funds for long-term investing."],
    )
    category: Literal[
        "investment-basics",
        "mutual-funds",
        "sip-planning",
        "tax-saving",
        "retirement-planning",
        "market-insights",
        "risk-management",
        "fund-analysis",
        "stocks",
        "etfs",
        "index-funds",
        "debt-funds",
        "hybrid-funds",
        "small-cap-funds",
        "mid-cap-funds",
        "large-cap-funds",
        "international-funds",
        "gold-investments",
        "personal-finance",
        "portfolio-management",
        "asset-allocation",
        "financial-planning",
        "insurance",
        "budgeting",
        "technical-analysis",
        "fundamental-analysis",
        "tax-planning",
        "nps",
        "ppf",
        "market-trends",
        "investment-strategies",
        "beginners-guide",
    ] = Field(
        ...,
        examples=["mutual-funds"],
    )
    author_name: str = Field(
        ...,
        max_length=120,
        examples=["Admin"],
    )
    author_url: str | None = Field(
        default=None,
        max_length=500,
        examples=["https://example.com/authors/admin"],
    )
    tags: list[str] = Field(
        default_factory=list,
        examples=[["mutual-funds", "investing", "beginners"]],
    )
    cover_image_url: str = Field(
        ...,
        max_length=500,
        examples=["https://example.com/images/mutual-fund-guide.jpg"],
    )
    content: list[BlogContentBlock] = Field(
        ...,
        min_length=1,
        examples=[
            [
                {"type": "heading", "value": "Why Mid-Cap Funds Are Popular"},
                {
                    "type": "paragraph",
                    "value": "Mid-cap mutual funds invest in medium-sized companies that have strong growth potential.",
                },
            ]
        ],
    )

    @field_validator("title", "description", "content", "author_name", "author_url", "cover_image_url", mode="before")
    @classmethod
    def strip_string_values(cls, value: str | None):
        if isinstance(value, str):
            value = value.strip()
        return value

    @field_validator("tags", mode="before")
    @classmethod
    def normalize_tags(cls, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise ValueError("tags must be a list of strings")

        normalized_tags: list[str] = []
        for tag in value:
            if not isinstance(tag, str):
                raise ValueError("each tag must be a string")
            cleaned_tag = tag.strip()
            if cleaned_tag:
                normalized_tags.append(cleaned_tag)

        return normalized_tags


class BlogCreate(BlogBase):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "How to Choose the Right Mutual Fund for Long-Term Growth",
                "description": "A beginner-friendly guide to picking mutual funds for long-term investing.",
                "category": "mutual-funds",
                "author_name": "Admin",
                "author_url": "https://example.com/authors/admin",
                "tags": ["mutual-funds", "investing", "beginners"],
                "cover_image_url": "https://example.com/images/mutual-fund-guide.jpg",
                "content": [
                    {"type": "heading", "value": "Why Mid-Cap Funds Are Popular"},
                    {
                        "type": "paragraph",
                        "value": "Mid-cap mutual funds invest in medium-sized companies that have strong growth potential. These funds are often considered a balance between risk and return.",
                    },
                    {"type": "heading", "value": "Things to Check Before Investing"},
                    {
                        "type": "paragraph",
                        "value": "Look at past consistency, downside risk, expense ratio, and investment horizon before selecting a fund.",
                    },
                ],
            }
        }
    )


class BlogUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=5, max_length=255)
    slug: str | None = Field(default=None, min_length=3, max_length=255)
    description: str | None = Field(default=None, max_length=500)
    category: Literal[
        "investment-basics",
        "mutual-funds",
        "sip-planning",
        "tax-saving",
        "retirement-planning",
        "market-insights",
        "risk-management",
        "fund-analysis",
    ] | None = None
    author_name: str | None = Field(default=None, max_length=120)
    author_url: str | None = Field(default=None, max_length=500)
    tags: list[str] | None = Field(default=None)
    cover_image_url: str | None = Field(default=None, max_length=500)
    is_published: bool | None = None
    content: list[BlogContentBlock] | None = Field(default=None, min_length=1)

    @field_validator("title", "slug", "description", "content", "author_name", "author_url", "cover_image_url", mode="before")
    @classmethod
    def strip_optional_strings(cls, value: str | None):
        if isinstance(value, str):
            value = value.strip()
        return value

    @field_validator("tags", mode="before")
    @classmethod
    def normalize_optional_tags(cls, value):
        if value is None:
            return value
        if not isinstance(value, list):
            raise ValueError("tags must be a list of strings")

        normalized_tags: list[str] = []
        for tag in value:
            if not isinstance(tag, str):
                raise ValueError("each tag must be a string")
            cleaned_tag = tag.strip()
            if cleaned_tag:
                normalized_tags.append(cleaned_tag)

        return normalized_tags


class BlogResponse(BlogBase):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    read_time: int
