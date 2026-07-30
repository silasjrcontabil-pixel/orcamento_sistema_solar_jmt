from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.client import Client
from app.models.user import User
from app.schemas.client import ClientCreate, ClientOut, ClientUpdate
from app.security import get_current_user
from app.services.reference_data import get_reference_data

router = APIRouter(prefix="/api/clients", tags=["clients"])


def _resolve_municipio_nome(municipio_cod_ibge: str, estado_uf: str) -> str:
    ref = get_reference_data()
    info = ref.municipios.get(str(municipio_cod_ibge))
    if info is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"municipio_cod_ibge {municipio_cod_ibge!r} desconhecido",
        )
    if info["uf"] != estado_uf:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"municipio_cod_ibge {municipio_cod_ibge!r} não pertence ao estado {estado_uf!r}",
        )
    return info["nome"]


@router.get("", response_model=list[ClientOut])
def list_clients(
    search: Optional[str] = Query(default=None),
    municipio: Optional[str] = Query(default=None),
    estado: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Client)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            or_(Client.nome.ilike(like), Client.telefone.ilike(like), Client.cnpj_cpf.ilike(like))
        )
    if municipio:
        stmt = stmt.where(Client.municipio_cod_ibge == municipio)
    if estado:
        stmt = stmt.where(Client.estado_uf == estado)
    stmt = stmt.order_by(Client.nome)
    return db.scalars(stmt).all()


@router.post("", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: ClientCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    municipio_nome = _resolve_municipio_nome(payload.municipio_cod_ibge, payload.estado_uf)
    client = Client(
        **payload.model_dump(),
        municipio_nome=municipio_nome,
        created_by=current_user.id,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.get("/{client_id}", response_model=ClientOut)
def get_client(client_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado")
    return client


@router.put("/{client_id}", response_model=ClientOut)
def update_client(
    client_id: int,
    payload: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado")

    municipio_nome = _resolve_municipio_nome(payload.municipio_cod_ibge, payload.estado_uf)
    for field, value in payload.model_dump().items():
        setattr(client, field, value)
    client.municipio_nome = municipio_nome

    db.commit()
    db.refresh(client)
    return client
