"""Cria os 3 usuários sócios da JMT Solar (idempotente — não duplica se username já existir).

Uso:
    python scripts/seed_users.py

A senha inicial de todos vem de SEED_DEFAULT_PASSWORD (.env); troque após o primeiro login.
IMPORTANTE: edite a lista SOCIOS abaixo com os nomes/usuários reais dos 3 sócios antes de
rodar em produção — os valores abaixo são placeholders genéricos, não nomes reais.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.models.user import User  # noqa: E402
from app.security import hash_password  # noqa: E402

SOCIOS = [
    {"nome": "Jheferson Luys", "username": "jheferson_luys"},
    {"nome": "Thiago Catalan", "username": "thiago_catalan"},
    {"nome": "Matheus Carvalho", "username": "matheus_carvalho"},
]


def main():
    Base.metadata.create_all(bind=engine)  # no-op se o alembic já rodou; garante tabela em dev
    db = SessionLocal()
    try:
        for socio in SOCIOS:
            existing = db.query(User).filter(User.username == socio["username"]).first()
            if existing:
                print(f"- {socio['username']} já existe (id={existing.id}), pulando.")
                continue
            user = User(
                nome=socio["nome"],
                username=socio["username"],
                password_hash=hash_password(settings.SEED_DEFAULT_PASSWORD),
                ativo=True,
            )
            db.add(user)
            print(f"+ criado usuário {socio['username']}")
        db.commit()
    finally:
        db.close()

    print("\nSenha padrão (SEED_DEFAULT_PASSWORD):", settings.SEED_DEFAULT_PASSWORD)
    print("Troque a senha de cada sócio assim que possível.")


if __name__ == "__main__":
    main()
