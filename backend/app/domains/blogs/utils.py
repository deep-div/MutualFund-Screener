import math
import re
from collections.abc import Mapping, Sequence
from typing import Any

WORDS_PER_MINUTE = 200
IGNORED_BLOCK_TYPES = {"image"}


def _combine_content_values(content: Sequence[Mapping[str, Any]] | None) -> str:
    """Join all textual content block values into one string."""
    if not content:
        return ""

    values: list[str] = []
    for block in content:
        if not isinstance(block, Mapping):
            continue

        if block.get("type") in IGNORED_BLOCK_TYPES:
            continue

        value = block.get("value")
        if isinstance(value, str) and value.strip():
            values.append(value.strip())

    return " ".join(values)


def calculate_read_time(content: Sequence[Mapping[str, Any]] | None) -> int:
    """Estimate reading time in minutes from combined textual blog content."""
    combined_content = _combine_content_values(content)
    total_words = len(re.findall(r"\b\w+\b", combined_content))
    return max(1, math.ceil(total_words / WORDS_PER_MINUTE))

