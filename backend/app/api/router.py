from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field

from app.db.read import get_filtered_schemes, get_scheme_analytics
from app.orchestrator.pipeline import run_workflow
from app.shared.logger import logger


router = APIRouter()

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


def _run_workflow_background():
    try:
        run_workflow()
    except Exception as exc:
        logger.error(f"Pipeline failed: {exc}", exc_info=True)


@router.post("/workflows/trigger", status_code=202)
def run_workflow_api(background_tasks: BackgroundTasks):
    try:
        background_tasks.add_task(_run_workflow_background)
        return {"status": "queued"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to queue workflow: {exc}")


@router.post("/schemes")
def list_schemes(
    payload: SchemeListRequest,
    limit: int = 10,
    offset: int = 0,
    sort_field: str | None = "cagr_3y",
    sort_order: str | None = "desc",
):
    return get_filtered_schemes(
        filters=payload.filters,
        limit=limit,
        offset=offset,
        sort_field=sort_field,
        sort_order=sort_order,
    )


@router.get("/schemes/{scheme_code}/analytics")
def scheme_analytics(scheme_code: int):
    data = get_scheme_analytics(scheme_code)
    if data is None:
        raise HTTPException(status_code=404, detail="Scheme analytics not found")
    return data
