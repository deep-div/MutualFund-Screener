from fastapi import APIRouter, HTTPException, Query

from app.api.v1.schemas import UserFilterCreate, UserFilterUpdate
from app.domains.users.repository.read import get_user_filters, get_user_watchlist
from app.domains.users.repository.write import (
    add_user_filters,
    add_watchlist_item,
    delete_user_filter,
    delete_watchlist_item,
    update_user_filter,
    upsert_user,
)

router = APIRouter()


@router.post("/users", status_code=201)
def create_or_update_user(
    uid: str = Query(...),
    email: str | None = Query(None),
    phone: str | None = Query(None),
    email_verified: bool | None = Query(None),
    name: str | None = Query(None),
    provider: str | None = Query(None),
):
    try:
        upsert_user(
            {
                "uid": uid,
                "email": email,
                "phone": phone,
                "email_verified": email_verified,
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
    watchlist_name: str = Query("default"),
):
    try:
        add_watchlist_item(uid=uid, scheme_code=scheme_code, watchlist_name=watchlist_name)
        return {"status": "ok"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to add watchlist item: {exc}")


@router.get("/users/{uid}/watchlist")
def get_watchlist(uid: str):
    try:
        return {
            "uid": uid,
            "watchlist": get_user_watchlist(uid),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch watchlist: {exc}")


@router.delete("/users/{uid}/watchlist", status_code=200)
def delete_from_watchlist(
    uid: str,
    scheme_code: int = Query(...),
    watchlist_name: str = Query("default"),
):
    try:
        deleted = delete_watchlist_item(uid=uid, scheme_code=scheme_code, watchlist_name=watchlist_name)
        if not deleted:
            raise HTTPException(status_code=404, detail="Watchlist item not found")
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete watchlist item: {exc}")


@router.post("/users/{uid}/filters", status_code=201)
def add_filters(uid: str, payload: UserFilterCreate):
    try:
        add_user_filters(
            uid=uid,
            filters=payload.filters,
            name=payload.name,
            description=payload.description,
            sort_field=payload.sort_field,
            sort_order=payload.sort_order,
        )
        return {"status": "ok"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to add user filters: {exc}")
    
@router.get("/users/{uid}/filters")
def get_filters(uid: str):
    try:
        return {
            "uid": uid,
            "filters": get_user_filters(uid),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch filters: {exc}")


@router.delete("/users/{uid}/filters/{filter_id}", status_code=200)
def delete_filter(uid: str, filter_id: int):
    try:
        deleted = delete_user_filter(uid=uid, filter_id=filter_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Filter not found")
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete filter: {exc}")


@router.put("/users/{uid}/filters/{filter_id}", status_code=200)
def update_filter(uid: str, filter_id: int, payload: UserFilterUpdate):
    try:
        updated = update_user_filter(
            uid=uid,
            filter_id=filter_id,
            name=payload.name,
            description=payload.description,
            filters=payload.filters,
            sort_field=payload.sort_field,
            sort_order=payload.sort_order,
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Filter not found")
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to update filter: {exc}")
