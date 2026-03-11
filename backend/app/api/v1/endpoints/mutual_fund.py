from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.domains.mutual_funds.repository.read import get_filtered_schemes, get_scheme_analytics
from app.orchestrator.workflow import run_workflow
from app.core.logging import logger
from backend.app.api.v1.schemas import SchemeListRequest

router = APIRouter()


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
):
    return get_filtered_schemes(
        filters=payload.filters,
        limit=limit,
        offset=offset,
        sort_field=payload.sort_field,
        sort_order=payload.sort_order,
    )


@router.get("/schemes/{scheme_code}/analytics")
def scheme_analytics(scheme_code: int):
    data = get_scheme_analytics(scheme_code)
    if data is None:
        raise HTTPException(status_code=404, detail="Scheme analytics not found")
    return data
