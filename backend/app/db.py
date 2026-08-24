"""Engine/Session SQLAlchemy. Funciona com MySQL/MariaDB (produção/HostGator), Postgres (legado/
Supabase) e SQLite (testes locais)."""
from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
elif settings.DATABASE_URL.startswith("mysql"):
    # utf8mb4 (não o "utf8" de 3 bytes do MySQL) pra suportar todo o unicode usado no app
    # (acentos, emoji) sem truncar/erro de encoding.
    connect_args = {"charset": "utf8mb4"}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)

if settings.DATABASE_URL.startswith("mysql"):
    @event.listens_for(engine, "connect")
    def _forcar_timezone_utc(dbapi_connection, connection_record):
        # MySQL não tem um tipo "with timezone" como o Postgres TIMESTAMPTZ — sem isso, a sessão
        # usaria o fuso do servidor MySQL, e os DateTime(timezone=True) do app (que assumem UTC,
        # ver app/schemas/common.py) gravariam a hora errada.
        with dbapi_connection.cursor() as cursor:
            cursor.execute("SET time_zone = '+00:00'")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
