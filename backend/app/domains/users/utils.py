from uuid import uuid4


def generate_external_id() -> str:
    return uuid4().hex
