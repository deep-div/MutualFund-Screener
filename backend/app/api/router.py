import json

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query

from app.db.read import get_filtered_schemes, get_scheme_analytics
from app.orchestrator.pipeline import run_pipeline
from app.shared.logger import logger


router = APIRouter()


def _run_workflow_background():
    try:
        run_pipeline()
    except Exception as exc:
        logger.error(f"Pipeline failed: {exc}", exc_info=True)


@router.post("/workflows/trigger", status_code=202)
def run_workflow_api(background_tasks: BackgroundTasks):
    try:
        background_tasks.add_task(_run_workflow_background)
        return {"status": "queued"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to queue workflow: {exc}")


@router.get("/schemes")
def list_schemes(
    filters: str | None = Query(
        default=None,
        description="JSON string of filters, e.g. {'scheme_class':'Equity','cagr_3y':{'gte':15}}",
    ),
    limit: int = Query(default=10, ge=1, le=1000),
):
    if filters is None:
        filters_dict = {}
    else:
        try:
            filters_dict = json.loads(filters)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="filters must be valid JSON")

        if not isinstance(filters_dict, dict):
            raise HTTPException(status_code=400, detail="filters must be a JSON object")

    return get_filtered_schemes(filters_dict, limit=limit)


@router.get("/schemes/{scheme_code}/analytics")
def scheme_analytics(scheme_code: int):
    data = get_scheme_analytics(scheme_code)
    if data is None:
        raise HTTPException(status_code=404, detail="Scheme analytics not found")
    return data
