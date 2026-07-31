from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.enums import ProdutoStatus, ProdutoTipo
from app.models.product import Product
from app.models.user import User
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate
from app.security import get_current_user

router = APIRouter(prefix="/api/products", tags=["products"])

_NOME_PADRAO_POR_TIPO = {
    ProdutoTipo.painel_solar: "Painel Solar",
    ProdutoTipo.inversor: "Inversor",
    ProdutoTipo.outro: "Produto",
}


def _resolve_nome(payload) -> str:
    """`nome` não é mais obrigatório no formulário — resolve um valor não-vazio para a
    coluna NOT NULL a partir do modelo/marca informados, ou do rótulo do tipo."""
    if payload.nome and payload.nome.strip():
        return payload.nome.strip()
    fallback = getattr(payload, "modelo", None) or getattr(payload, "marca", None)
    if fallback and fallback.strip():
        return fallback.strip()
    return _NOME_PADRAO_POR_TIPO[payload.tipo]


@router.get("", response_model=list[ProductOut])
def list_products(
    tipo: Optional[ProdutoTipo] = Query(default=None),
    status_: Optional[ProdutoStatus] = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Product)
    if tipo:
        stmt = stmt.where(Product.tipo == tipo)
    if status_:
        stmt = stmt.where(Product.status == status_)
    stmt = stmt.order_by(Product.nome)
    return db.scalars(stmt).all()


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    product = Product(
        tipo=payload.tipo,
        nome=_resolve_nome(payload),
        modelo=getattr(payload, "modelo", None),
        marca=getattr(payload, "marca", None),
        status=payload.status,
        specs=payload.to_specs(),
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado")
    return product


@router.put("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado")

    product.tipo = payload.tipo
    product.nome = _resolve_nome(payload)
    product.modelo = getattr(payload, "modelo", None)
    product.marca = getattr(payload, "marca", None)
    product.status = payload.status
    product.specs = payload.to_specs()

    db.commit()
    db.refresh(product)
    return product
