from fastapi import APIRouter, HTTPException, Query
import jwt
from jwt import PyJWTError

from app.api.v1.schemas import UserScreenCreate
from app.domains.users.repository.read import (
    count_user_screens,
    get_user_screens_paginated,
)
from app.domains.users.default_screens import DEFAULT_SCREEN_GROUPS, DEFAULT_SCREENS
from app.domains.users.repository.write import (
    add_user_screens,
    delete_user_screen,
    update_user_screens,
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
        # print("Received Firebase token:", token)  # Debug log
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


@router.post("/users/screens", status_code=201)
def add_screens(payload: UserScreenCreate, token: str = Query(...)):
    try:
        token_uid = _get_uid_from_token(token)
        external_id = add_user_screens(
            uid=token_uid,
            screens=payload.screens,
            name=payload.name,
            description=payload.description,
            sort_field=payload.sort_field,
            sort_order=payload.sort_order,
            enabled_screens=payload.enabled_screens,
            external_ids=payload.external_ids,
        )
        return {"status": "ok", "external_id": external_id}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to add user screens: {exc}")


@router.get("/users/screens")
def get_screens(
    token: str = Query(...),
    limit: int | None = Query(None, ge=1, le=200),
    offset: int = Query(0, ge=0),
    screen_type: str | None = Query(None, pattern="^(screen|watchlist)$"),
):
    try:
        token_uid = _get_uid_from_token(token)
        screens = get_user_screens_paginated(
            token_uid,
            limit=limit,
            offset=offset,
            screen_type=screen_type,
        )
        total = count_user_screens(token_uid, screen_type=screen_type)
        sanitized_screens = []
        for item in screens:
            cleaned = dict(item)
            cleaned.pop("uid", None)
            cleaned.pop("id", None)
            sanitized_screens.append(cleaned)
        return {
            "screens": sanitized_screens,
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch screens: {exc}")


@router.get("/users/screens/defaults")
def get_default_screens():
    try:
        return {
            "groups": DEFAULT_SCREEN_GROUPS,
            "group_count": len(DEFAULT_SCREEN_GROUPS),
            "total": len(DEFAULT_SCREENS),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch default screens: {exc}")



@router.put("/users/screens/{external_id}", status_code=200)
def update_screens(external_id: str, payload: UserScreenCreate, token: str = Query(...)):
    try:
        token_uid = _get_uid_from_token(token)
        updated = update_user_screens(
            uid=token_uid,
            external_id=external_id,
            screens=payload.screens,
            name=payload.name,
            description=payload.description,
            sort_field=payload.sort_field,
            sort_order=payload.sort_order,
            enabled_screens=payload.enabled_screens,
            external_ids=payload.external_ids,
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Screen not found")
        return {"status": "ok", "external_id": external_id}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to update user screens: {exc}")

@router.delete("/users/screens/{external_id}", status_code=200)
def delete_screen(external_id: str, token: str = Query(...)):
    try:
        token_uid = _get_uid_from_token(token)
        deleted = delete_user_screen(uid=token_uid, external_id=external_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Screen not found")
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete screen: {exc}")
