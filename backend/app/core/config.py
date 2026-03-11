from pydantic_settings import BaseSettings, SettingsConfigDict
import dotenv

dotenv.load_dotenv()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=False)

    # Load ENV variables
    DATABASE_URL: str

settings = Settings()
