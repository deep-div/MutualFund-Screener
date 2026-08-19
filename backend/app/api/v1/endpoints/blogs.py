from datetime import date

from fastapi import APIRouter, HTTPException, Query

from app.domains.blogs.repository.read import get_blog_by_slug, get_blogs_paginated
from app.domains.blogs.repository.write import BlogSlugConflictError, create_blog
from app.domains.blogs.schema import BlogCreate

router = APIRouter()


@router.post(
    "/blogs",
    status_code=201,
    summary="Create Blog Api",
    description=(
        "Mandatory fields: `title`, `category`, `content`, "
        "`description`, `author_name`, `cover_image_url`.\n\n"
        "Optional fields: `author_url`, `tags`."
    ),
)
def create_blog_api(payload: BlogCreate):
    try:
        data = create_blog(payload)
        return {"status": "ok", "blog": data}
    except BlogSlugConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create blog: {exc}")


@router.get(
    "/blogs",
    summary="Get Blogs Api",
    description=(
        "Fetch blogs by optional filters.\n\n"
        "Use `date` + `category` to fetch blogs for that date/category.\n"
        "Use only `date` to fetch all blogs for that date.\n"
        "Use no filters to fetch most recent blogs."
    ),
)
def get_blogs_api(
    date: date | None = Query(None, description="Format: YYYY-MM-DD"),
    category: str | None = Query(None),
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
):
    try:
        return get_blogs_paginated(
            published_date=date,
            category=category,
            limit=limit,
            offset=offset,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch blogs: {exc}")


@router.get(
    "/blogs/{published_date}/{category}/{slug}",
    summary="Get Blog by Date, Category and Slug",
    description="Fetch a single blog by its published date, category and slug.",
)
def get_blog_by_slug_api(published_date: date, category: str, slug: str):
    try:
        blog = get_blog_by_slug(published_date, category, slug)
        if blog is None:
            raise HTTPException(status_code=404, detail="Blog not found")
        return blog
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch blog: {exc}")
