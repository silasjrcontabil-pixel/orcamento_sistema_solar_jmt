from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, MeResponse, TokenResponse
from app.security import create_access_token, get_current_user, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    # Comparação case-insensitive: username é sempre armazenado em minúsculas (primeiro
    # nome), mas o login não deve depender de o usuário digitar exatamente em caixa baixa.
    username_normalizado = payload.username.strip().lower()
    user = db.scalar(select(User).where(func.lower(User.username) == username_normalizado))
    if user is None or not user.ativo or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário ou senha inválidos")

    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token)


@router.get("/me", response_model=MeResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user
