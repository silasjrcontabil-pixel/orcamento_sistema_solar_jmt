"""Cria/atualiza os 3 usuários sócios da JMT Solar com senha individual (padrão "Nome@1").

Uso:
    python scripts/seed_users.py

Cada sócio tem sua própria senha (campo "senha" abaixo) em vez de uma senha única compartilhada.
Se o usuário já existir (casando por `nome`), a senha e o `username` são atualizados para os
valores atuais da lista SOCIOS — rodar de novo depois de editar algo aqui aplica a troca no
banco (inclusive renomeando o username, ex. ao trocar de "Jheferson Luys" para "jheferson").

Login: username é sempre o primeiro nome em minúsculas — a senha continua como está definida
abaixo.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import Base, SessionLocal, engine  # noqa: E402
from app.models.user import User  # noqa: E402
from app.security import hash_password  # noqa: E402

SOCIOS = [
    {"nome": "Jheferson Luys", "username": "jheferson", "senha": "Jheferson@1"},
    {"nome": "Thiago Catalan", "username": "thiago", "senha": "Thiago@1"},
    {"nome": "Matheus Carvalho", "username": "matheus", "senha": "Matheus@1"},
]


def main():
    Base.metadata.create_all(bind=engine)  # no-op se o alembic já rodou; garante tabela em dev
    db = SessionLocal()
    try:
        for socio in SOCIOS:
            existing = db.query(User).filter(User.nome == socio["nome"]).first()
            if existing:
                existing.username = socio["username"]
                existing.password_hash = hash_password(socio["senha"])
                print(f"~ atualizado {socio['nome']} -> username={socio['username']} (id={existing.id})")
                continue
            user = User(
                nome=socio["nome"],
                username=socio["username"],
                password_hash=hash_password(socio["senha"]),
                ativo=True,
            )
            db.add(user)
            print(f"+ criado usuário {socio['username']} ({socio['nome']})")
        db.commit()
    finally:
        db.close()

    print("\nLogins aplicados:")
    for socio in SOCIOS:
        print(f"  usuário: {socio['username']}  senha: {socio['senha']}")


if __name__ == "__main__":
    main()
