"""Schemas de produto — request validado por discriminated union sobre `tipo`.

Cadastro rápido sem bloquear no formulário com campos secundários (marca, modelo,
dimensões, ano de fabricação) — mas `nome` e o campo usado pelo motor de dimensionamento do
orçamento (`potencia_wp` no painel, `quantidade_kw` no inversor) continuam obrigatórios:
sem eles, `_dimensionar` (routers/budgets.py) não tem como calcular e o orçamento quebra
com 422 na hora de gerar a proposta. Para `outro` (não entra no dimensionamento), tudo
opcional além de `tipo` — `_resolve_nome` no router cobre o fallback quando `nome` vier
vazio."""
from typing import Annotated, Literal, Optional, Union

from pydantic import BaseModel, Field

from app.enums import ProdutoStatus, ProdutoTipo
from app.schemas.common import UTCDateTime

# Campos que compõem `specs` (JSONB) por tipo de produto.
_PAINEL_SPEC_FIELDS = ("composicao_estrutura", "potencia_wp", "altura", "largura", "peso")
_INVERSOR_SPEC_FIELDS = ("quantidade_kw",)
_OUTRO_SPEC_FIELDS = ("ano_fabricacao",)


class PainelSolarIn(BaseModel):
    tipo: Literal[ProdutoTipo.painel_solar]
    nome: str = Field(min_length=1)
    modelo: Optional[str] = None
    marca: Optional[str] = None
    status: ProdutoStatus = ProdutoStatus.ativo
    composicao_estrutura: Optional[str] = None
    potencia_wp: float = Field(gt=0)
    altura: Optional[float] = None
    largura: Optional[float] = None
    peso: Optional[float] = None

    def to_specs(self) -> dict:
        return {k: getattr(self, k) for k in _PAINEL_SPEC_FIELDS}


class InversorIn(BaseModel):
    tipo: Literal[ProdutoTipo.inversor]
    nome: str = Field(min_length=1)
    modelo: Optional[str] = None
    marca: Optional[str] = None
    status: ProdutoStatus = ProdutoStatus.ativo
    quantidade_kw: float = Field(gt=0)

    def to_specs(self) -> dict:
        return {k: getattr(self, k) for k in _INVERSOR_SPEC_FIELDS}


class OutroIn(BaseModel):
    tipo: Literal[ProdutoTipo.outro]
    nome: Optional[str] = None
    marca: Optional[str] = None
    status: ProdutoStatus = ProdutoStatus.ativo
    modelo: Optional[str] = None
    ano_fabricacao: Optional[int] = None

    def to_specs(self) -> dict:
        return {k: getattr(self, k) for k in _OUTRO_SPEC_FIELDS}


ProductCreate = Annotated[Union[PainelSolarIn, InversorIn, OutroIn], Field(discriminator="tipo")]
ProductUpdate = ProductCreate


class ProductOut(BaseModel):
    id: int
    tipo: ProdutoTipo
    nome: str
    modelo: Optional[str]
    marca: Optional[str]
    status: ProdutoStatus
    specs: dict
    created_at: UTCDateTime
    updated_at: UTCDateTime

    model_config = {"from_attributes": True}
