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


def _get_claims_from_token(token: str) -> dict:
    try:
        claims = jwt.decode(token, options={"verify_signature": False})
    except PyJWTError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid Firebase token: {exc}")
    return claims


def _get_uid_from_token(token: str) -> str:
    claims = _get_claims_from_token(token)
    uid = claims.get("user_id") or claims.get("uid") or claims.get("sub")
    if not uid:
        raise HTTPException(status_code=400, detail="Invalid Firebase token: missing uid")
    return uid


@router.post("/users", status_code=201)
def create_or_update_user(
    token: str = Query(...),
):
    try:
        print("Received Firebase token:", token)  # Debug log
        claims = _get_claims_from_token(token)
        uid = _get_uid_from_token(token)

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


@router.post("/users/watchlist", status_code=201)
def add_to_watchlist(
    token: str = Query(...),
    scheme_id: str = Query(..., min_length=8, max_length=8),
    watchlist_name: str = Query("default"),
):
    try:
        token_uid = _get_uid_from_token(token)
        add_watchlist_item(uid=token_uid, scheme_id=scheme_id, watchlist_name=watchlist_name)
        return {"status": "ok"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to add watchlist item: {exc}")


@router.get("/users/watchlist")
def get_watchlist(token: str = Query(...)):
    try:
        token_uid = _get_uid_from_token(token)
        return {
            "uid": token_uid,
            "watchlist": get_user_watchlist(token_uid),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch watchlist: {exc}")


@router.delete("/users/watchlist", status_code=200)
def delete_from_watchlist(
    token: str = Query(...),
    scheme_id: str = Query(..., min_length=8, max_length=8),
    watchlist_name: str = Query("default"),
):
    try:
        token_uid = _get_uid_from_token(token)
        deleted = delete_watchlist_item(
            uid=token_uid, scheme_id=scheme_id, watchlist_name=watchlist_name
        )
        if not deleted:
            raise HTTPException(status_code=404, detail="Watchlist item not found")
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete watchlist item: {exc}")


@router.put("/users/watchlist/rename", status_code=200)
def rename_watchlist(
    token: str = Query(...),
    old_name: str = Query(...),
    new_name: str = Query(...),
):
    try:
        token_uid = _get_uid_from_token(token)
        updated = update_watchlist_name(uid=token_uid, old_name=old_name, new_name=new_name)
        if not updated:
            raise HTTPException(status_code=404, detail="Watchlist not found")
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to rename watchlist: {exc}")


@router.post("/users/filters", status_code=201)
def add_filters(payload: UserFilterCreate, token: str = Query(...)):
    try:
        token_uid = _get_uid_from_token(token)
        external_id = add_user_filters(
            uid=token_uid,
            filters=payload.filters,
            name=payload.name,
            description=payload.description,
            sort_field=payload.sort_field,
            sort_order=payload.sort_order,
        )
        return {"status": "ok", "external_id": external_id}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to add user filters: {exc}")
    
@router.get("/users/filters")
def get_filters(token: str = Query(...)):
    try:
        token_uid = _get_uid_from_token(token)
        return {
            "uid": token_uid,
            "filters": get_user_filters(token_uid),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch filters: {exc}")


@router.delete("/users/filters/{filter_id}", status_code=200)
def delete_filter(filter_id: int, token: str = Query(...)):
    try:
        token_uid = _get_uid_from_token(token)
        deleted = delete_user_filter(uid=token_uid, filter_id=filter_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Filter not found")
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete filter: {exc}")
