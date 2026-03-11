from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from app.db.read import get_filtered_schemes, get_scheme_analytics
from app.db.write import upsert_user, add_watchlist_item, add_user_filters
from app.orchestrator.pipeline import run_workflow
from app.shared.logger import logger
from app.api.schemas import SchemeListRequest, UserFilterCreate

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


@router.post("/users", status_code=201)
def create_or_update_user(
    uid: str = Query(...),
    email: str | None = Query(None),
    phone_number: str | None = Query(None),
    name: str | None = Query(None),
    provider: str | None = Query(None),
):
    try:
        upsert_user(
            {
                "uid": uid,
                "email": email,
                "phone_number": phone_number,
                "name": name,
                "provider": provider,
            }
        )
        return {"status": "ok"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to upsert user: {exc}")


@router.post("/users/{uid}/watchlist", status_code=201)
def add_to_watchlist(
    uid: str,
    scheme_code: int = Query(...),
):
    try:
        add_watchlist_item(uid=uid, scheme_code=scheme_code)
        return {"status": "ok"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to add watchlist item: {exc}")


@router.post("/users/{uid}/filters", status_code=201)
def add_filters(uid: str, payload: UserFilterCreate):
    if payload.uid != uid:
        raise HTTPException(status_code=400, detail="Payload uid does not match path uid")
    try:
        add_user_filters(uid=uid, filters=payload.filters)
        return {"status": "ok"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to add user filters: {exc}")
