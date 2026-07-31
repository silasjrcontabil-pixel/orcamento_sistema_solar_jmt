from typing import Optional

from pydantic import BaseModel


class DashboardSummaryOut(BaseModel):
    total_orcamentos: int
    # Soma do preço final apenas dos orçamentos NÃO cancelados (pipeline ativo + confirmados)
    # — orçamento cancelado nunca representou venda, então não entra nesse total.
    valor_total: float
    orcamentos_realizados: int
    valor_realizado: float
    orcamentos_nao_realizados: int
    valor_nao_realizado: float
    por_status: dict[str, int]
    tempo_medio_resposta_dias: Optional[float]


class PorVendedorOut(BaseModel):
    vendedor_id: int
    vendedor_nome: str
    total_orcamentos: int
    confirmados: int
    taxa_conversao: float
    tempo_medio_resposta_dias: Optional[float]


class EvolucaoItemOut(BaseModel):
    mes: str
    total_orcamentos: int
    valor_total: float
