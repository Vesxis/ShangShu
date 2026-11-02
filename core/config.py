from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    DB_USER: str
    DB_PASSWORD: str
    DB_ROOT_PASSWORD: str = ""
    DB_HOST: str = "db"
    DB_PORT: int = 3306
    DB_NAME: str

    REDIS_URL: str = "redis://redis:6379"
    RABBITMQ_URL: str = ""
    RABBITMQ_USER: str = ""
    RABBITMQ_PASSWORD: str = ""

    EMAIL_USER: str = ""
    EMAIL_PASSWORD: str = ""

    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # Which vendor answers the /ai endpoints: "groq" or "gemini".
    # LLM_MODEL is empty on purpose - each provider then picks a model it is
    # known to work with. Set it only to override that, and remember it has to
    # match the provider.
    LLM_PROVIDER: str = "groq"
    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    LLM_MODEL: str = ""
    LLM_TIMEOUT_SECONDS: float = 20.0
    LLM_MAX_OUTPUT_TOKENS: int = 512
    LLM_CACHE_TTL_SECONDS: int = 3600

    DEBUG: bool = False
    HTTP_PORT: int = 8080
    API_ROOT_PATH: str = ""
    BASE_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"




    @computed_field
    @property
    def DATABASE_URL(self) -> str:
        return self.database_url("asyncmy")

    def database_url(self, driver: str, database: str | None = None) -> str:
        return URL.create(
            f"mysql+{driver}",
            username=self.DB_USER,
            password=self.DB_PASSWORD,
            host=self.DB_HOST,
            port=self.DB_PORT,
            database=database if database is not None else self.DB_NAME,
            query={"charset": "utf8mb4"},
        ).render_as_string(hide_password=False)

settings = Settings()
