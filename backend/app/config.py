"""Configurações da aplicação, lidas de variáveis de ambiente / .env."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(BASE_DIR / ".env"), extra="ignore")

    DATABASE_URL: str = "sqlite:///./dev.db"

    # Usada só pelo script de migração de dados (scripts/migrate_postgres_to_mysql.py) durante a
    # transição Postgres -> MySQL: aponta pro banco MySQL de destino enquanto DATABASE_URL ainda
    # aponta pro Postgres de origem. Não é usada pela aplicação em runtime — só depois que a
    # migração for validada, DATABASE_URL passa a apontar pro MySQL e essa variável some.
    MYSQL_DATABASE_URL: str | None = None

    JWT_SECRET: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440

    FRONTEND_ORIGIN: str = "http://localhost:5174"

    @property
    def FRONTEND_ORIGINS(self) -> list[str]:
        """FRONTEND_ORIGIN pode conter múltiplas origens separadas por vírgula."""
        return [origin.strip() for origin in self.FRONTEND_ORIGIN.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
