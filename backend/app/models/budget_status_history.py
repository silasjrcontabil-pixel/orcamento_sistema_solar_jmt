from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db import Base
from app.enums import OrcamentoStatus


class BudgetStatusHistory(Base):
    """Registra toda mudança de status — alimenta o dashboard de tempo de resposta por vendedor."""

    __tablename__ = "budget_status_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    budget_id: Mapped[int] = mapped_column(ForeignKey("budgets.id"), nullable=False)
    status_anterior: Mapped[Optional[OrcamentoStatus]] = mapped_column(
        Enum(OrcamentoStatus, native_enum=False, length=30), nullable=True
    )
    status_novo: Mapped[OrcamentoStatus] = mapped_column(
        Enum(OrcamentoStatus, native_enum=False, length=30), nullable=False
    )
    changed_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    budget = relationship("Budget", back_populates="status_history")
    changed_by_user = relationship("User")
