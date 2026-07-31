"""CRUD de usuários (vendedores). Sem distinção de papel/role — qualquer usuário logado tem
as mesmas permissões (mesmo modelo de acesso já usado no resto do sistema), então qualquer
sócio pode cadastrar um novo vendedor por aqui."""
import unicodedata

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserOut
from app.security import get_current_user, hash_password

router = APIRouter(prefix="/api/users", tags=["users"])


def _slugify_username(base: str) -> str:
    normalized = unicodedata.normalize("NFKD", base).encode("ascii", "ignore").decode("ascii")
    return normalized.strip().lower()


def _gerar_username_unico(db: Session, base: str) -> str:
    base = base or "usuario"
    username = base
    sufixo = 2
    while db.scalar(select(User).where(User.username == username)) is not None:
        username = f"{base}{sufixo}"
        sufixo += 1
    return username


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.scalars(select(User).order_by(User.nome)).all()


@router.post("", response_model=UserOut, status_code=201)
def create_user(payload: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    nome = payload.nome.strip()
    primeiro_nome = nome.split()[0] if nome else "usuario"
    base_username = _slugify_username(payload.username or primeiro_nome)
    username = _gerar_username_unico(db, base_username)

    user = User(nome=nome, username=username, password_hash=hash_password(payload.senha), ativo=True)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
