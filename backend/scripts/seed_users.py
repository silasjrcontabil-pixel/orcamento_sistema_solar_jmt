"""Cria/atualiza os 3 usuários sócios da JMT Solar com senha individual (padrão "Nome@1").

Uso:
    python scripts/seed_users.py

Cada sócio tem sua própria senha (campo "senha" abaixo) em vez de uma senha única compartilhada.
Se o usuário já existir, a senha é atualizada para o valor atual da lista SOCIOS — rodar de
novo depois de editar uma senha aqui aplica a troca no banco.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import Base, SessionLocal, engine  # noqa: E402
from app.models.user import User  # noqa: E402
from app.security import hash_password  # noqa: E402

SOCIOS = [
    {"nome": "Jheferson Luys", "username": "Jheferson Luys", "senha": "Jheferson@1"},
    {"nome": "Thiago Catalan", "username": "Thiago Catalan", "senha": "Thiago@1"},
    {"nome": "Matheus Carvalho", "username": "Matheus Carvalho", "senha": "Matheus@1"},
]


def main():
    Base.metadata.create_all(bind=engine)  # no-op se o alembic já rodou; garante tabela em dev
    db = SessionLocal()
    try:
        for socio in SOCIOS:
            existing = db.query(User).filter(User.username == socio["username"]).first()
            if existing:
                existing.password_hash = hash_password(socio["senha"])
                print(f"~ senha atualizada para {socio['username']} (id={existing.id})")
                continue
            user = User(
                nome=socio["nome"],
                username=socio["username"],
                password_hash=hash_password(socio["senha"]),
                ativo=True,
            )
            db.add(user)
            print(f"+ criado usuário {socio['username']}")
        db.commit()
    finally:
        db.close()

    print("\nSenhas aplicadas:")
    for socio in SOCIOS:
        print(f"  {socio['username']}: {socio['senha']}")


if __name__ == "__main__":
    main()
