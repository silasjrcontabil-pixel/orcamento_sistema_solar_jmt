from typing import Optional

from sqlalchemy import Enum, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.enums import Orientacao, TipoTelhado


class BudgetSolarConfig(Base):
    """Configuração 1:1 com Budget quando tipo_orcamento = sistema_completo."""

    __tablename__ = "budget_solar_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    budget_id: Mapped[int] = mapped_column(ForeignKey("budgets.id"), unique=True, nullable=False)

    consumo_mensal_kwh: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    valor_conta: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    tipo_telhado: Mapped[TipoTelhado] = mapped_column(Enum(TipoTelhado, native_enum=False, length=30), nullable=False)
    orientacao: Mapped[Orientacao] = mapped_column(Enum(Orientacao, native_enum=False, length=20), nullable=False)
    distribuidora: Mapped[str] = mapped_column(String(60), nullable=False)
    area_disponivel_m2: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)

    painel_product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    potencia_wp_override: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    qtd_paineis_override: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    inversor_product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    qtd_inversores_override: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Resultados calculados pelo motor de cálculo (services/solar_calc.py) — persistidos para
    # não precisar recalcular ao exibir o orçamento/gerar o PDF; recalculados a cada PUT.
    potencia_wp_utilizada: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    quantidade_kw_inversor_utilizada: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    radiacao_media_regiao: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False)
    radiacao_ajustada: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False)
    qtd_paineis_sugerido: Mapped[int] = mapped_column(Integer, nullable=False)
    qtd_paineis: Mapped[int] = mapped_column(Integer, nullable=False)
    potencia_sistema_kwp: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False)
    qtd_inversores_sugerido: Mapped[int] = mapped_column(Integer, nullable=False)
    qtd_inversores: Mapped[int] = mapped_column(Integer, nullable=False)
    geracao_estimada_kwh: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    municipio_fallback_usado: Mapped[bool] = mapped_column(nullable=False, default=False)

    budget = relationship("Budget", back_populates="solar_config")
    painel_product = relationship("Product", foreign_keys=[painel_product_id])
    inversor_product = relationship("Product", foreign_keys=[inversor_product_id])
