"""Schemas de produto — request validado por discriminated union sobre `tipo`.

Nenhum campo além de `tipo` é obrigatório no preenchimento (pedido explícito: cadastro
rápido sem bloquear no formulário) — `nome`/`status` recebem um valor resolvido pelo
router (`_resolve_nome`) quando vierem vazios, já que a coluna `nome` é NOT NULL no banco."""
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
    nome: Optional[str] = None
    modelo: Optional[str] = None
    marca: Optional[str] = None
    status: ProdutoStatus = ProdutoStatus.ativo
    composicao_estrutura: Optional[str] = None
    potencia_wp: Optional[float] = Field(default=None, gt=0)
    altura: Optional[float] = None
    largura: Optional[float] = None
    peso: Optional[float] = None

    def to_specs(self) -> dict:
        return {k: getattr(self, k) for k in _PAINEL_SPEC_FIELDS}


class InversorIn(BaseModel):
    tipo: Literal[ProdutoTipo.inversor]
    nome: Optional[str] = None
    modelo: Optional[str] = None
    marca: Optional[str] = None
    status: ProdutoStatus = ProdutoStatus.ativo
    quantidade_kw: Optional[float] = Field(default=None, gt=0)

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
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
