import os


def _parse_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes")


# When True: fetches enriched data (AUM, expense ratio, Morningstar rating, etc.)
# from mfdata.in with rate limiting (~1 hour). When False: fast run, no enrichment (~few minutes).
MF_ENRICHMENT_ENABLED: bool = _parse_bool(os.getenv("MF_ENRICHMENT_ENABLED"), default=False)
