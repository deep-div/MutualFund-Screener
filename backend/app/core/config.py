from pydantic_settings import BaseSettings, SettingsConfigDict
import dotenv

dotenv.load_dotenv()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=False)

    # Load ENV variables
    DATABASE_URL: str
    # Production default: migrations are run explicitly in deploys, not on app startup
    RUN_DB_MIGRATIONS_ON_STARTUP: bool = True

settings = Settings()
