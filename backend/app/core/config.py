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

    # Postgres connection parts (used to build DATABASE_URL)
    DB_HOST: str = ""
    DB_PORT: str = "5432"
    DB_NAME: str = "postgres"
    DB_USER: str = ""
    DB_PASSWORD: str = ""

    # Optional direct override — takes precedence if set
    DATABASE_URL: str = ""

    # App environment and logging
    ENVIRONMENT: str
    LOG_LEVEL: str

    # Plain API key used for pipeline trigger auth.
    PIPELINE_TRIGGER_API_KEY: str = ""

    @property
    def database_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return (
            f"postgresql+psycopg2://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            f"?sslmode=require"
        )

settings = Settings()
