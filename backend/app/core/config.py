from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed environment configuration with a safe local default."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    database_url: str = "sqlite:///./kanbitan.db"
    frontend_origin: str = "http://localhost:3000"
    app_name: str = "Kanbitan API"
    alegra_user: str = ""
    alegra_token: str = ""
    alegra_base_url: str = "https://api.alegra.com/api/v1"
    catalog_sync_secret: str = ""
    catalog_ttl_minutes: int = 15
    catalog_sync_stale_minutes: int = 30

    @property
    def alegra_configured(self) -> bool:
        return bool(self.alegra_user.strip() and self.alegra_token.strip())

    @property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url.startswith("postgres://"):
            return self.database_url.replace("postgres://", "postgresql+psycopg://", 1)
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+psycopg://", 1)
        return self.database_url

    @property
    def is_development(self) -> bool:
        return self.environment.lower() == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
