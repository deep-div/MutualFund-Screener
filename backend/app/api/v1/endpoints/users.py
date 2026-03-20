from fastapi import APIRouter, HTTPException, Query
import jwt
from jwt import PyJWTError

from app.api.v1.schemas import UserFilterCreate
from app.domains.users.repository.read import get_user_filters, get_user_watchlist
from app.domains.users.repository.write import (
    add_user_filters,
    add_watchlist_item,
    delete_user_filter,
    delete_watchlist_item,
    update_watchlist_name,
    upsert_user,
)

router = APIRouter()


@router.post("/users", status_code=201)
def create_or_update_user(
    firebase_token: str = Query(...),
):
    try:
        print("Received Firebase token:", firebase_token)  # Debug log
        claims = jwt.decode(firebase_token, options={"verify_signature": False})
        uid = claims.get("user_id") or claims.get("uid") or claims.get("sub")
        if not uid:
            raise HTTPException(status_code=400, detail="Invalid Firebase token: missing uid")

        provider = None
        firebase_claim = claims.get("firebase")
        if isinstance(firebase_claim, dict):
            provider = firebase_claim.get("sign_in_provider")

        upsert_user(
            {
                "uid": uid,
                "email": claims.get("email"),
                "phone": claims.get("phone_number"),
                "email_verified": claims.get("email_verified"),
                "name": claims.get("name") or claims.get("displayName"),
                "provider": provider,
            }
        )
        return {"status": "ok"}
    except HTTPException:
        raise
    except PyJWTError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid Firebase token: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to upsert user: {exc}")


@router.post("/users/{uid}/watchlist", status_code=201)
def add_to_watchlist(
    uid: str,
    scheme_id: str = Query(..., min_length=8, max_length=8),
    watchlist_name: str = Query("default"),
):
    try:
        add_watchlist_item(uid=uid, scheme_id=scheme_id, watchlist_name=watchlist_name)
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
    scheme_id: str = Query(..., min_length=8, max_length=8),
    watchlist_name: str = Query("default"),
):
    try:
        deleted = delete_watchlist_item(uid=uid, scheme_id=scheme_id, watchlist_name=watchlist_name)
        if not deleted:
            raise HTTPException(status_code=404, detail="Watchlist item not found")
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete watchlist item: {exc}")


@router.put("/users/{uid}/watchlist/rename", status_code=200)
def rename_watchlist(
    uid: str,
    old_name: str = Query(...),
    new_name: str = Query(...),
):
    try:
        updated = update_watchlist_name(uid=uid, old_name=old_name, new_name=new_name)
        if not updated:
            raise HTTPException(status_code=404, detail="Watchlist not found")
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to rename watchlist: {exc}")


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
