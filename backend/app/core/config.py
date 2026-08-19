from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=False,
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
    )

    # Load ENV variables
    DATABASE_URL: str
    # Plain API key used for pipeline trigger auth.
    PIPELINE_TRIGGER_API_KEY: str = ""

settings = Settings()
