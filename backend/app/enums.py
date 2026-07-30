"""Enums compartilhados entre models (SQLAlchemy) e schemas (Pydantic).

Os valores (strings) são exatamente os definidos em API_CONTRACT.md — usados como estão em
requests/responses JSON e persistidos como texto no banco.
"""
import enum


class ProdutoTipo(str, enum.Enum):
    painel_solar = "painel_solar"
    inversor = "inversor"
    outro = "outro"


class ProdutoStatus(str, enum.Enum):
    ativo = "ativo"
    desativado = "desativado"


class TipoResidencia(str, enum.Enum):
    Residencial = "Residencial"
    Comercial = "Comercial"
    Industrial = "Industrial"
    Rural = "Rural"


class TipoOrcamento(str, enum.Enum):
    sistema_completo = "sistema_completo"
    itens_individuais = "itens_individuais"


class OrcamentoStatus(str, enum.Enum):
    rascunho = "rascunho"
    enviado = "enviado"
    aguardando_resposta = "aguardando_resposta"
    confirmado = "confirmado"
    cancelado = "cancelado"


class TipoItem(str, enum.Enum):
    painel = "painel"
    inversor = "inversor"
    parte_ca = "parte_ca"
    mao_obra = "mao_obra"
    homologacao = "homologacao"
    outro = "outro"


class TipoTelhado(str, enum.Enum):
    ceramico = "Cerâmico (Francês)"
    fibrocimento = "Fibrocimento"
    metalico = "Metálico"
    laje = "Laje"
    solo = "Solo"


class Orientacao(str, enum.Enum):
    norte = "Norte"
    nordeste = "Nordeste"
    noroeste = "Noroeste"
    leste_oeste = "Leste/Oeste"


# Transições de status permitidas para orçamentos (regra de negócio: nunca deletar, só cancelar).
ALLOWED_STATUS_TRANSITIONS: dict[OrcamentoStatus, set[OrcamentoStatus]] = {
    OrcamentoStatus.rascunho: {OrcamentoStatus.enviado, OrcamentoStatus.cancelado},
    OrcamentoStatus.enviado: {OrcamentoStatus.aguardando_resposta, OrcamentoStatus.cancelado},
    OrcamentoStatus.aguardando_resposta: {OrcamentoStatus.confirmado, OrcamentoStatus.cancelado},
    OrcamentoStatus.confirmado: {OrcamentoStatus.cancelado},
    OrcamentoStatus.cancelado: set(),
}
