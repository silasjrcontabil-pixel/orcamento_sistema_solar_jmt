from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db import Base
from app.enums import TipoItem


class BudgetItem(Base):
    __tablename__ = "budget_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    budget_id: Mapped[int] = mapped_column(ForeignKey("budgets.id"), nullable=False)
    product_id: Mapped[Optional[int]] = mapped_column(ForeignKey("products.id"), nullable=True)

    tipo_item: Mapped[TipoItem] = mapped_column(Enum(TipoItem, native_enum=False, length=20), nullable=False)
    descricao: Mapped[str] = mapped_column(String(255), nullable=False)
    quantidade: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    custo_unitario: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    custo_total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    budget = relationship("Budget", back_populates="itens")
    product = relationship("Product")
