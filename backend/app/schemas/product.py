"""Schemas de produto — request validado por discriminated union sobre `tipo`, conforme
API_CONTRACT.md (obrigatórios variam por tipo)."""
from datetime import datetime
from typing import Annotated, Literal, Optional, Union

from pydantic import BaseModel, Field

from app.enums import ProdutoStatus, ProdutoTipo

# Campos que compõem `specs` (JSONB) por tipo de produto.
_PAINEL_SPEC_FIELDS = ("composicao_estrutura", "potencia_wp", "altura", "largura", "peso")
_INVERSOR_SPEC_FIELDS = ("quantidade_kw",)
_OUTRO_SPEC_FIELDS = ("ano_fabricacao",)


class PainelSolarIn(BaseModel):
    tipo: Literal[ProdutoTipo.painel_solar]
    nome: str = Field(min_length=1)
    modelo: str = Field(min_length=1)
    marca: Optional[str] = None
    status: ProdutoStatus
    composicao_estrutura: str = Field(min_length=1)
    potencia_wp: float = Field(gt=0)
    altura: Optional[float] = None
    largura: Optional[float] = None
    peso: Optional[float] = None

    def to_specs(self) -> dict:
        return {k: getattr(self, k) for k in _PAINEL_SPEC_FIELDS}


class InversorIn(BaseModel):
    tipo: Literal[ProdutoTipo.inversor]
    nome: str = Field(min_length=1)
    modelo: str = Field(min_length=1)
    marca: Optional[str] = None
    status: ProdutoStatus
    quantidade_kw: float = Field(gt=0)

    def to_specs(self) -> dict:
        return {k: getattr(self, k) for k in _INVERSOR_SPEC_FIELDS}


class OutroIn(BaseModel):
    tipo: Literal[ProdutoTipo.outro]
    nome: str = Field(min_length=1)
    marca: str = Field(min_length=1)
    status: ProdutoStatus
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
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
