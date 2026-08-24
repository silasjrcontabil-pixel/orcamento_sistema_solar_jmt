from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db import Base
from app.enums import (
    ConsumoMedioMensal,
    FaixaParcelaMensal,
    InteresseLead,
    LeadStatus,
    QuandoPretendeInvestir,
    TipoResidencia,
)


class PublicLead(Base):
    """Solicitação enviada pelo formulário público da página institucional (sem autenticação).
    Gerenciado pelo vendedor na aba "Pedidos do Site" (ver routers/leads.py) — o `status` é
    atualizado manualmente lá."""

    __tablename__ = "public_leads"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    cidade: Mapped[str] = mapped_column(String(100), nullable=False)
    telefone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    interesse: Mapped[InteresseLead] = mapped_column(Enum(InteresseLead, native_enum=False, length=30), nullable=False)
    consumo_medio_mensal: Mapped[Optional[ConsumoMedioMensal]] = mapped_column(
        Enum(ConsumoMedioMensal, native_enum=False, length=30), nullable=True
    )
    tipo_projeto: Mapped[Optional[TipoResidencia]] = mapped_column(
        Enum(TipoResidencia, native_enum=False, length=20), nullable=True
    )
    quando_pretende_investir: Mapped[Optional[QuandoPretendeInvestir]] = mapped_column(
        Enum(QuandoPretendeInvestir, native_enum=False, length=40), nullable=True
    )
    faixa_parcela_mensal: Mapped[Optional[FaixaParcelaMensal]] = mapped_column(
        Enum(FaixaParcelaMensal, native_enum=False, length=30), nullable=True
    )
    mensagem: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[LeadStatus] = mapped_column(
        Enum(LeadStatus, native_enum=False, length=20), nullable=False, default=LeadStatus.novo
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
