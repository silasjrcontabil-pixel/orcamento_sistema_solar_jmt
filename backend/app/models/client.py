from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db import Base
from app.enums import TipoResidencia


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    ddd: Mapped[str] = mapped_column(String(3), nullable=False)
    telefone: Mapped[str] = mapped_column(String(20), nullable=False)
    cnpj_cpf: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    cep: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    municipio_cod_ibge: Mapped[str] = mapped_column(String(10), nullable=False)
    municipio_nome: Mapped[str] = mapped_column(String(120), nullable=False)
    estado_uf: Mapped[str] = mapped_column(String(2), nullable=False)
    endereco: Mapped[str] = mapped_column(String(255), nullable=False)
    tipo_residencia: Mapped[TipoResidencia] = mapped_column(
        Enum(TipoResidencia, native_enum=False, length=20), nullable=False
    )

    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    created_by_user = relationship("User", back_populates="clients_created")
    budgets = relationship("Budget", back_populates="client")
