import secrets

EXTERNAL_ID_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
EXTERNAL_ID_LENGTH = 8


def generate_external_id() -> str:
    return "".join(secrets.choice(EXTERNAL_ID_ALPHABET) for _ in range(EXTERNAL_ID_LENGTH))
