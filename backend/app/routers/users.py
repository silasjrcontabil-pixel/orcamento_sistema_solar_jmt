"""CRUD de usuários (vendedores). Sem sistema de papéis/roles — qualquer usuário logado pode
cadastrar novos vendedores. Trocar a senha de outro vendedor e ativar/desativar contas, porém,
é restrito ao Jheferson (ADMIN_USERNAME), a pedido do cliente."""
import unicodedata

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserOut, UserPasswordUpdate, UserStatusUpdate
from app.security import get_current_user, hash_password

router = APIRouter(prefix="/api/users", tags=["users"])

ADMIN_USERNAME = "jheferson"


def _is_admin(user: User) -> bool:
    return user.username.lower() == ADMIN_USERNAME


def _require_admin(current_user: User) -> None:
    if not _is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Somente Jheferson pode fazer isso.",
        )


def _get_user_or_404(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendedor não encontrado")
    return user


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


@router.put("/{user_id}/senha", status_code=status.HTTP_204_NO_CONTENT)
def update_user_password(
    user_id: int,
    payload: UserPasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    user = _get_user_or_404(db, user_id)
    user.password_hash = hash_password(payload.senha)
    db.commit()


@router.put("/{user_id}/status", response_model=UserOut)
def update_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    user = _get_user_or_404(db, user_id)
    if user.id == current_user.id and not payload.ativo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você não pode desativar sua própria conta.",
        )
    user.ativo = payload.ativo
    db.commit()
    db.refresh(user)
    return user
