from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Path

from app.domains.mutual_fund.repository.read import (
    get_filtered_schemes,
    get_leaderboards,
    get_scheme_analytics_by_external_id,
    search_schemes,
)
from app.orchestrator.pipeline import run_pipeline
from app.core.logging import logger
from app.core.security import verify_pipeline_trigger_api_key
from app.api.v1.schemas import SchemeListRequest

router = APIRouter()


def _run_pipeline_background():
    try:
        run_pipeline()
    except Exception as exc:
        logger.error(f"Pipeline failed: {exc}", exc_info=True)


@router.post("/pipeline/trigger", status_code=202)
def run_pipeline_api(
    background_tasks: BackgroundTasks,
    _auth: None = Depends(verify_pipeline_trigger_api_key),
):
    try:
        background_tasks.add_task(_run_pipeline_background)
        logger.info("Pipeline queued via API")
        return {"status": "queued"}
    except Exception as exc:
        logger.error(f"Failed to queue pipeline job: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to queue pipeline job")


@router.post("/schemes")
def list_schemes(
    payload: SchemeListRequest,
    limit: int = 10,
    offset: int = 0,
):
    return get_filtered_schemes(
        screens=payload.screens,
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

@router.get("/schemes/leaderboards")
def scheme_leaderboards():
    return get_leaderboards()

@router.get("/schemes/{external_id}/analytics")
def scheme_analytics_by_external_id(
    external_id: str = Path(..., min_length=8, max_length=8),
):
    data = get_scheme_analytics_by_external_id(external_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Scheme analytics not found")
    return data
