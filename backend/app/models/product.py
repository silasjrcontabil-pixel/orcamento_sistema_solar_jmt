from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, DateTime, Enum, Integer, String
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db import Base
from app.enums import ProdutoStatus, ProdutoTipo

JSONVariant = JSON().with_variant(postgresql.JSONB(astext_type=String()), "postgresql")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tipo: Mapped[ProdutoTipo] = mapped_column(Enum(ProdutoTipo, native_enum=False, length=20), nullable=False)
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    modelo: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    marca: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    status: Mapped[ProdutoStatus] = mapped_column(
        Enum(ProdutoStatus, native_enum=False, length=20), nullable=False, default=ProdutoStatus.ativo
    )
    # Campos variáveis por tipo:
    #   painel_solar -> {composicao_estrutura, potencia_wp, altura?, largura?, peso?}
    #   inversor     -> {quantidade_kw}
    #   outro        -> {ano_fabricacao?}
    specs: Mapped[dict] = mapped_column(JSONVariant, nullable=False, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
