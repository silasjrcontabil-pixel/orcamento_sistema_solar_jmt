from typing import Optional

from pydantic import BaseModel, Field, model_validator

from app.enums import OrcamentoStatus, Orientacao, TipoItem, TipoOrcamento, TipoTelhado
from app.schemas.common import UTCDateTime


class BudgetItemIn(BaseModel):
    tipo_item: TipoItem
    product_id: Optional[int] = None
    descricao: str = Field(min_length=1)
    quantidade: float = Field(gt=0)
    custo_unitario: float = Field(ge=0)


class BudgetItemOut(BudgetItemIn):
    id: int
    custo_total: float

    model_config = {"from_attributes": True}


class SolarConfigIn(BaseModel):
    consumo_mensal_kwh: float = Field(gt=0)
    valor_conta: float = Field(gt=0)
    tipo_telhado: TipoTelhado
    orientacao: Orientacao
    distribuidora: str = Field(min_length=1)
    area_disponivel_m2: Optional[float] = None

    painel_product_id: int
    potencia_wp_override: Optional[float] = None
    qtd_paineis_override: Optional[int] = Field(default=None, gt=0)
    # Custo unitário informado pelo usuário no momento do orçamento (regra master do briefing:
    # painéis/inversores não têm preço cadastrado no produto — o custo é informado por orçamento).
    custo_unitario_painel: float = Field(ge=0)

    inversor_product_id: int
    qtd_inversores_override: Optional[int] = Field(default=None, gt=0)
    custo_unitario_inversor: float = Field(ge=0)


class SolarConfigOut(SolarConfigIn):
    potencia_wp_utilizada: float
    quantidade_kw_inversor_utilizada: float
    radiacao_media_regiao: float
    radiacao_ajustada: float
    qtd_paineis_sugerido: int
    qtd_paineis: int
    potencia_sistema_kwp: float
    qtd_inversores_sugerido: int
    qtd_inversores: int
    geracao_estimada_kwh: float
    municipio_fallback_usado: bool

    model_config = {"from_attributes": True}


class BudgetCreate(BaseModel):
    client_id: int
    tipo_orcamento: TipoOrcamento
    margem_lucro_pct: float = Field(default=40, ge=0)
    validade_dias: int = Field(default=7, gt=0)
    observacoes: Optional[str] = None
    solar_config: Optional[SolarConfigIn] = None
    itens: list[BudgetItemIn] = Field(default_factory=list)

    @model_validator(mode="after")
    def valida_shape_por_tipo(self):
        if self.tipo_orcamento == TipoOrcamento.sistema_completo and self.solar_config is None:
            raise ValueError("solar_config é obrigatório quando tipo_orcamento=sistema_completo")
        if self.tipo_orcamento == TipoOrcamento.itens_individuais:
            if self.solar_config is not None:
                raise ValueError("solar_config não deve ser enviado quando tipo_orcamento=itens_individuais")
            if not self.itens:
                raise ValueError("itens não pode ser vazio quando tipo_orcamento=itens_individuais")
        return self


class BudgetUpdate(BudgetCreate):
    pass


class CalcPreviewRequest(BaseModel):
    """`client_id` é necessário para resolver lat/lon do município do cliente já escolhido no
    wizard (não há coordenadas em solar_config) — usado para o lookup de irradiância."""

    client_id: int
    solar_config: SolarConfigIn


class CalcPreviewResponse(BaseModel):
    qtd_paineis: int
    qtd_paineis_sugerido: int
    potencia_sistema_kwp: float
    # Nulo quando o inversor ainda não foi selecionado no wizard — o dimensionamento de
    # painéis não depende do inversor, então o preview retorna o que já dá pra calcular
    # em vez de exigir os dois campos preenchidos de uma vez (ver _dimensionar).
    qtd_inversores: Optional[int]
    qtd_inversores_sugerido: Optional[int]
    geracao_estimada_kwh: float
    radiacao_media_regiao: float
    radiacao_ajustada: float
    municipio_fallback_usado: bool


class StatusUpdateRequest(BaseModel):
    status: OrcamentoStatus


class StatusHistoryOut(BaseModel):
    status_anterior: Optional[OrcamentoStatus]
    status_novo: OrcamentoStatus
    changed_by: int
    changed_by_nome: str
    changed_at: UTCDateTime

    model_config = {"from_attributes": True}


class EditHistoryOut(BaseModel):
    edited_by: int
    edited_by_nome: str
    edited_at: UTCDateTime

    model_config = {"from_attributes": True}


class BudgetListItemOut(BaseModel):
    id: int
    numero_proposta: int
    cliente_nome: str
    vendedor_nome: str
    status: OrcamentoStatus
    valor_final: float
    created_at: UTCDateTime


class ClientMiniOut(BaseModel):
    id: int
    nome: str
    telefone: str
    ddd: str
    email: Optional[str]
    endereco: str
    municipio_nome: str
    estado_uf: str

    model_config = {"from_attributes": True}


class VendedorMiniOut(BaseModel):
    id: int
    nome: str

    model_config = {"from_attributes": True}


class BudgetDetailOut(BaseModel):
    id: int
    numero_proposta: int
    client: ClientMiniOut
    vendedor: VendedorMiniOut
    tipo_orcamento: TipoOrcamento
    status: OrcamentoStatus
    margem_lucro_pct: float
    validade_dias: int
    observacoes: Optional[str]
    solar_config: Optional[SolarConfigOut]
    itens: list[BudgetItemOut]
    custo_total: float
    preco_final: float
    status_history: list[StatusHistoryOut]
    edit_history: list[EditHistoryOut]
    created_at: UTCDateTime
    updated_at: UTCDateTime
