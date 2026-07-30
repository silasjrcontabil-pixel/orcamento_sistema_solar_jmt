from typing import Optional

from pydantic import BaseModel


class DashboardSummaryOut(BaseModel):
    total_orcamentos: int
    valor_total: float
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
