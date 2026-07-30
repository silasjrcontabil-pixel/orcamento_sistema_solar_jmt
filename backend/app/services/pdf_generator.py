"""Gera o PDF da proposta comercial (weasyprint + Jinja2).

Replica as 4 seções de `Dados_Marca_Empresa/Exemplo de Proposta.pdf`: capa; dados do
cliente + dimensionamento + equipamentos + investimento; análise de retorno (economia,
gráficos de barra/donut/linha em HTML/CSS puro); garantias/condições/projeção financeira/
observações. Tema escuro (#0a0a0a/#111) com destaque dourado (#EFA809), replicando
`Dados_Marca_Empresa/JMT_Solar_Framework_Site.docx`.

O import de `weasyprint` é feito dentro da função (lazy) para que o resto da aplicação suba
normalmente mesmo em ambientes onde as bibliotecas nativas do WeasyPrint (Pango/Cairo/GObject)
não estejam disponíveis (ex.: máquina de desenvolvimento sem o runtime GTK instalado) — só o
endpoint de PDF fica indisponível nesse caso.
"""
from __future__ import annotations

import base64
from datetime import datetime
from pathlib import Path
from typing import Optional

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.enums import TipoItem, TipoOrcamento
from app.models.budget import Budget

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

REAJUSTE_ENERGETICO_ANUAL = 0.08  # média histórica ANEEL, citada no PDF de referência
ANOS_PROJECAO_TABELA = [1, 2, 3, 5, 10, 15, 20, 25]
ANOS_HORIZONTE = 25

_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)


def _fmt_brl(value: float, decimals: int = 0) -> str:
    s = f"{value:,.{decimals}f}"
    s = s.replace(",", "X").replace(".", ",").replace("X", ".")
    return s


def _fmt_k(value: float) -> str:
    if abs(value) >= 1000:
        return f"{value / 1000:.0f}k"
    return f"{value:.0f}"


_env.filters["brl"] = _fmt_brl
_env.filters["k"] = _fmt_k


def _logo_data_uri() -> str:
    logo_path = STATIC_DIR / "logo.jpeg"
    data = base64.b64encode(logo_path.read_bytes()).decode("ascii")
    return f"data:image/jpeg;base64,{data}"


def _capa_bg_data_uri() -> str:
    bg_path = STATIC_DIR / "capa_cover_bg.jpg"
    data = base64.b64encode(bg_path.read_bytes()).decode("ascii")
    return f"data:image/jpeg;base64,{data}"


def _economia_ano(economia_anual_base: float, ano: int) -> float:
    return economia_anual_base * ((1 + REAJUSTE_ENERGETICO_ANUAL) ** (ano - 1))


def _economia_acumulada(economia_anual_base: float, ano: int) -> float:
    r = REAJUSTE_ENERGETICO_ANUAL
    return economia_anual_base * (((1 + r) ** ano - 1) / r)


def _build_financeiro(valor_conta: float, preco_final: float) -> dict:
    economia_mensal = valor_conta
    economia_anual_base = economia_mensal * 12

    projecao = []
    for ano in ANOS_PROJECAO_TABELA:
        projecao.append(
            {
                "ano": ano,
                "economia_anual": _economia_ano(economia_anual_base, ano),
                "economia_acumulada": _economia_acumulada(economia_anual_base, ano),
                "status": "Lucro" if ano == ANOS_PROJECAO_TABELA[-1] else "Pagando",
            }
        )

    retorno_25anos = _economia_acumulada(economia_anual_base, ANOS_HORIZONTE)
    payback_anos = preco_final / economia_anual_base if economia_anual_base else None
    roi_pct = ((retorno_25anos - preco_final) / preco_final * 100) if preco_final else 0

    bar_anos = [1, 5, 10, 15, 20, 25]
    bar_valores = [_economia_acumulada(economia_anual_base, a) for a in bar_anos]
    max_barra = max(bar_valores) if bar_valores else 1
    ALTURA_MAX_BARRA_PCT = 82  # deixa espaço acima da barra mais alta para o rótulo de valor
    bar_chart = [
        {
            "label": f"{a}º",
            "valor": v,
            "altura_pct": round((v / max_barra) * ALTURA_MAX_BARRA_PCT, 1) if max_barra else 0,
        }
        for a, v in zip(bar_anos, bar_valores)
    ]

    linha_anos = list(range(1, ANOS_HORIZONTE + 1))
    linha_valores = [_economia_ano(economia_anual_base, a) for a in linha_anos]
    v_min, v_max = min(linha_valores), max(linha_valores)
    span = (v_max - v_min) or 1
    pontos = [
        {
            "x_pct": round((i / (len(linha_anos) - 1)) * 100, 2) if len(linha_anos) > 1 else 0,
            "y_pct": round(100 - ((v - v_min) / span) * 100, 2),
        }
        for i, v in enumerate(linha_valores)
    ]
    poligono_area = "0% 100%, " + ", ".join(f"{p['x_pct']}% {p['y_pct']}%" for p in pontos) + ", 100% 100%"
    linha_labels_idx = [0, 6, 12, 18, 24]
    linha_labels = [f"{linha_anos[i]}º" for i in linha_labels_idx if i < len(linha_anos)]

    roi_pct_clamped = max(0, min(100, roi_pct))

    return {
        "economia_mensal": economia_mensal,
        "economia_anual": economia_anual_base,
        "retorno_25anos": retorno_25anos,
        "roi_pct": roi_pct,
        "roi_pct_clamped": roi_pct_clamped,
        "payback_anos": payback_anos,
        "sem_solar_25anos": economia_anual_base * ANOS_HORIZONTE,
        "com_solar": preco_final,
        "bar_chart": bar_chart,
        "linha_pontos": pontos,
        "linha_poligono_area": poligono_area,
        "linha_labels": linha_labels,
        "projecao": projecao,
    }


def _build_context(budget: Budget) -> dict:
    client = budget.client
    itens = list(budget.itens)
    itens_dicts = [{"quantidade": i.quantidade, "custo_unitario": i.custo_unitario} for i in itens]

    from app.services.solar_calc import calcular_totais

    custo_total, preco_final = calcular_totais(itens_dicts, budget.margem_lucro_pct)

    solar = None
    financeiro = None
    kit_eletrico_desc = "Cabos, conectores MC4, disjuntores CC/CA e placa de aviso conforme norma"

    parte_ca_item = next((i for i in itens if i.tipo_item == TipoItem.parte_ca), None)
    if parte_ca_item is not None:
        kit_eletrico_desc = parte_ca_item.descricao

    if budget.tipo_orcamento == TipoOrcamento.sistema_completo and budget.solar_config is not None:
        sc = budget.solar_config
        painel = sc.painel_product
        inversor = sc.inversor_product
        solar = {
            "consumo_mensal_kwh": sc.consumo_mensal_kwh,
            "valor_conta": sc.valor_conta,
            "tipo_telhado": sc.tipo_telhado.value,
            "orientacao": sc.orientacao.value,
            "distribuidora": sc.distribuidora,
            "area_disponivel_m2": sc.area_disponivel_m2,
            "potencia_sistema_kwp": sc.potencia_sistema_kwp,
            "qtd_paineis": sc.qtd_paineis,
            "qtd_inversores": sc.qtd_inversores,
            "geracao_estimada_kwh": sc.geracao_estimada_kwh,
            "potencia_wp_utilizada": sc.potencia_wp_utilizada,
            "quantidade_kw_inversor_utilizada": sc.quantidade_kw_inversor_utilizada,
            "painel": {
                "nome": painel.nome,
                "modelo": painel.modelo,
                "marca": painel.marca,
                "composicao_estrutura": painel.specs.get("composicao_estrutura"),
            },
            "inversor": {
                "nome": inversor.nome,
                "modelo": inversor.modelo,
                "marca": inversor.marca,
            },
        }
        financeiro = _build_financeiro(float(sc.valor_conta), preco_final)

    return {
        "budget": {
            "numero_proposta": f"{budget.numero_proposta:04d}",
            "tipo_orcamento": budget.tipo_orcamento.value,
            "status": budget.status.value,
            "observacoes": budget.observacoes,
            "validade_dias": budget.validade_dias,
            "margem_lucro_pct": float(budget.margem_lucro_pct),
            "created_at": budget.created_at,
        },
        "client": {
            "nome": client.nome,
            "telefone": f"{client.ddd}{client.telefone}",
            "email": client.email,
            "cnpj_cpf": client.cnpj_cpf,
            "endereco": client.endereco,
            "municipio_nome": client.municipio_nome,
            "estado_uf": client.estado_uf,
            "tipo_residencia": client.tipo_residencia.value,
        },
        "vendedor_nome": budget.vendedor.nome,
        "solar": solar,
        "financeiro": financeiro,
        "itens": itens,
        "custo_total": custo_total,
        "preco_final": preco_final,
        "kit_eletrico_desc": kit_eletrico_desc,
        "logo_data_uri": _logo_data_uri(),
        "capa_bg_data_uri": _capa_bg_data_uri(),
        "gerado_em": datetime.now(),
    }


def generate_budget_pdf(budget: Budget) -> bytes:
    """Renderiza o template `proposta.html` com os dados do orçamento e converte para PDF."""
    from weasyprint import HTML  # import tardio — ver docstring do módulo

    context = _build_context(budget)
    template = _env.get_template("proposta.html")
    html_content = template.render(**context)
    return HTML(string=html_content, base_url=str(TEMPLATES_DIR)).write_pdf()
