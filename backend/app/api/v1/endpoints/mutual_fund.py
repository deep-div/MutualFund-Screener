from fastapi import APIRouter, BackgroundTasks, HTTPException, Path

from app.domains.mutual_fund.repository.read import (
    get_filtered_schemes,
    get_scheme_analytics_by_scheme_id,
    get_scheme_basic_details_by_scheme_id,
    search_schemes,
)
from app.orchestrator.pipeline import run_pipeline
from app.core.logging import logger
from app.api.v1.schemas import SchemeListRequest

router = APIRouter()


def _run_pipeline_background():
    try:
        run_pipeline()
    except Exception as exc:
        logger.error(f"Pipeline failed: {exc}", exc_info=True)


@router.post("/pipeline/trigger", status_code=202)
def run_pipeline_api(background_tasks: BackgroundTasks):
    try:
        background_tasks.add_task(_run_pipeline_background)
        return {"status": "queued"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to queue pipeline: {exc}")


@router.post("/schemes")
def list_schemes(
    payload: SchemeListRequest,
    limit: int = 10,
    offset: int = 0,
):
    return get_filtered_schemes(
        filters=payload.filters,
        limit=limit,
        offset=offset,
        sort_field=payload.sort_field,
        sort_order=payload.sort_order,
    )


@router.get("/schemes/search")
def scheme_search(
    query: str,
    limit: int = 10,
    offset: int = 0,
):
    return search_schemes(query=query, limit=limit, offset=offset)


@router.get("/schemes/{scheme_id}")
def scheme_basic_by_scheme_id(
    scheme_id: str = Path(..., min_length=8, max_length=8),
):
    data = get_scheme_basic_details_by_scheme_id(scheme_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Scheme not found")
    return data


@router.get("/schemes/{scheme_id}/analytics")
def scheme_analytics_by_scheme_id(
    scheme_id: str = Path(..., min_length=8, max_length=8),
):
    data = get_scheme_analytics_by_scheme_id(scheme_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Scheme analytics not found")
    return data
