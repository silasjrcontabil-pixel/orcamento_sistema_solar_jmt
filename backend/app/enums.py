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
    ceramico_metalica = "Cerâmico (Francês) / Base Metálica"
    ceramico_madeira = "Cerâmico (Francês) / Base Madeira"
    fibrocimento_metalica = "Fibrocimento / Base Metálica"
    fibrocimento_madeira = "Fibrocimento / Base Madeira"
    mini_trilho_baixo = "Mini Trilho / Baixo"
    mini_trilho_alto = "Mini Trilho / Alto"
    fixacao_l_metalica = "Fixação em L / Base Metálica"
    solo = "Solo"
    laje = "Laje"


class Orientacao(str, enum.Enum):
    norte = "Norte"
    nordeste = "Nordeste"
    noroeste = "Noroeste"
    leste_oeste = "Leste/Oeste"


# --- Formulário público de captação de leads (página institucional) ---


class InteresseLead(str, enum.Enum):
    energia_solar = "Energia Solar"
    mobilidade_eletrica = "Mobilidade Elétrica"
    ambos = "Ambos"


class ConsumoMedioMensal(str, enum.Enum):
    ate_200 = "Até 200 kWh"
    de_201_a_500 = "De 201 a 500 kWh"
    de_501_a_700 = "De 501 a 700 kWh"
    de_701_a_1000 = "De 701 a 1000 kWh"
    acima_de_1000 = "Acima de 1000 kWh"


class QuandoPretendeInvestir(str, enum.Enum):
    agora = "Quero começar agora"
    proximos_3_meses = "Nos próximos 3 meses"
    proximos_6_meses_a_1_ano = "Nos próximos 6 meses a 1 ano"
    ainda_pesquisando = "Ainda estou pesquisando"


class FaixaParcelaMensal(str, enum.Enum):
    ate_300 = "Até R$ 300/mês"
    de_301_a_500 = "De R$ 301 a R$ 500/mês"
    em_torno_de_699 = "Em torno de R$ 699/mês"
    acima_de_700 = "Acima de R$ 700/mês"


class LeadStatus(str, enum.Enum):
    """Acompanhamento manual do vendedor sobre o que aconteceu com o pedido do site —
    não tenta adivinhar/casar automaticamente com um orçamento (nome/telefone podem não
    bater exatamente), o vendedor mesmo marca o andamento."""

    novo = "Novo"
    em_contato = "Em Contato"
    orcamento_enviado = "Orçamento Enviado"
    convertido = "Convertido"
    descartado = "Descartado"


# Transições de status permitidas para orçamentos (regra de negócio: nunca deletar, só cancelar).
ALLOWED_STATUS_TRANSITIONS: dict[OrcamentoStatus, set[OrcamentoStatus]] = {
    OrcamentoStatus.rascunho: {OrcamentoStatus.enviado, OrcamentoStatus.cancelado},
    OrcamentoStatus.enviado: {OrcamentoStatus.aguardando_resposta, OrcamentoStatus.cancelado},
    OrcamentoStatus.aguardando_resposta: {OrcamentoStatus.confirmado, OrcamentoStatus.cancelado},
    OrcamentoStatus.confirmado: {OrcamentoStatus.cancelado},
    OrcamentoStatus.cancelado: set(),
}
