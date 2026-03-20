import secrets

SCHEME_ID_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
SCHEME_ID_LENGTH = 8


def generate_scheme_id() -> str:
    return "".join(secrets.choice(SCHEME_ID_ALPHABET) for _ in range(SCHEME_ID_LENGTH))
