from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db import Base
from app.enums import OrcamentoStatus, TipoOrcamento


class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    numero_proposta: Mapped[int] = mapped_column(Integer, unique=True, nullable=False, index=True)

    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), nullable=False)
    vendedor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    tipo_orcamento: Mapped[TipoOrcamento] = mapped_column(
        Enum(TipoOrcamento, native_enum=False, length=30), nullable=False
    )
    status: Mapped[OrcamentoStatus] = mapped_column(
        Enum(OrcamentoStatus, native_enum=False, length=30),
        nullable=False,
        default=OrcamentoStatus.rascunho,
    )

    margem_lucro_pct: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False, default=40)
    validade_dias: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    observacoes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    client = relationship("Client", back_populates="budgets")
    vendedor = relationship("User", back_populates="budgets", foreign_keys=[vendedor_id])
    solar_config = relationship(
        "BudgetSolarConfig", back_populates="budget", uselist=False, cascade="all, delete-orphan"
    )
    itens = relationship("BudgetItem", back_populates="budget", cascade="all, delete-orphan")
    status_history = relationship(
        "BudgetStatusHistory",
        back_populates="budget",
        cascade="all, delete-orphan",
        order_by="BudgetStatusHistory.changed_at",
    )
