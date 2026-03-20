import uuid

PUBLIC_ID_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
PUBLIC_ID_LENGTH = 22


def generate_public_id() -> str:
    num = uuid.uuid4().int
    chars = []
    base = len(PUBLIC_ID_ALPHABET)

    while num > 0:
        num, rem = divmod(num, base)
        chars.append(PUBLIC_ID_ALPHABET[rem])

    return "".join(reversed(chars)).rjust(PUBLIC_ID_LENGTH, "0")
