from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db import Base


class BudgetEditHistory(Base):
    """Registra cada edição geral do orçamento (PUT) — permite auditar quem alterou o
    orçamento de outro vendedor, já que qualquer usuário pode editar qualquer orçamento."""

    __tablename__ = "budget_edit_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    budget_id: Mapped[int] = mapped_column(ForeignKey("budgets.id"), nullable=False)
    edited_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    edited_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    budget = relationship("Budget", back_populates="edit_history")
    edited_by_user = relationship("User")
