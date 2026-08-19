import hmac

from fastapi import Header, HTTPException, status

from app.core.config import settings
from app.core.logging import logger


def verify_pipeline_trigger_api_key(
    api_key: str | None = Header(default=None, alias="API_KEY"),
    x_api_key_legacy: str | None = Header(
        default=None, alias="X-API-Key", include_in_schema=False
    ),
) -> None:
    expected_api_key = settings.PIPELINE_TRIGGER_API_KEY.strip()
    if not expected_api_key:
        logger.error("Pipeline trigger auth is enabled but no API key is configured.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Pipeline trigger auth is not configured",
        )

    provided_api_key = api_key or x_api_key_legacy
    if not provided_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API credentials",
        )

    if not hmac.compare_digest(provided_api_key, expected_api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API credentials",
        )
