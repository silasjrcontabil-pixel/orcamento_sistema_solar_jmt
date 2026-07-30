"""Testes do motor de cálculo solar (app/services/solar_calc.py).

Caso de referência: PDF de exemplo (Dados_Marca_Empresa/Exemplo de Proposta.pdf), proposta
#0004 — consumo 500 kWh/mês, painel Canadian Solar CS6R-550MS (550 Wp), orientação Norte,
inversor Fronius Symo Advanced 5.0 (5 kW). Resultado no PDF: 9 painéis, sistema 5 kWp,
geração estimada 540 kWh/mês. Conferido manualmente: o município de São Bernardo do Campo/SP
(cod_ibge 3548708, distribuidora "Enel SP" — citada no PDF) tem ANNUAL=4548 no grid de
irradiância, o que reproduz exatamente esses números.
"""
import math

import pytest

from app.services import solar_calc
from app.services.reference_data import get_reference_data

SAO_BERNARDO_COD_IBGE = "3548708"


@pytest.fixture(scope="module")
def ref():
    return get_reference_data()


def test_reference_data_loads(ref):
    assert len(ref.municipios) > 5000
    assert SAO_BERNARDO_COD_IBGE in ref.municipios


def test_resolve_lat_lon_municipio_existente(ref):
    resolucao = solar_calc.resolve_lat_lon(SAO_BERNARDO_COD_IBGE, "SP", ref=ref)
    assert resolucao.fallback_usado is False
    assert resolucao.cod_ibge_resolvido == SAO_BERNARDO_COD_IBGE
    # São Bernardo do Campo: ~-23.69, -46.55
    assert -24 < resolucao.lat < -23
    assert -47 < resolucao.lon < -46


def test_resolve_lat_lon_fallback_municipio_ausente(ref):
    """Município inexistente no dict -> não deve quebrar; cai no centroide do estado."""
    resolucao = solar_calc.resolve_lat_lon("0000000", "SP", ref=ref)
    assert resolucao.fallback_usado is True
    assert resolucao.cod_ibge_resolvido is None
    # centroide de SP deve estar em coordenadas plausíveis do estado
    assert -26 < resolucao.lat < -19
    assert -54 < resolucao.lon < -43


def test_resolve_lat_lon_estado_sem_nenhum_municipio_levanta_erro(ref):
    with pytest.raises(solar_calc.MunicipioNaoEncontradoError):
        solar_calc.resolve_lat_lon("0000000", "ZZ", ref=ref)


def test_lookup_irradiancia_sao_bernardo(ref):
    resolucao = solar_calc.resolve_lat_lon(SAO_BERNARDO_COD_IBGE, "SP", ref=ref)
    annual = solar_calc.lookup_irradiancia_annual(resolucao.lat, resolucao.lon, ref=ref)
    assert 4500 <= annual <= 4600


def test_pdf_example_case_9_paineis_5kwp(ref):
    """O caso âncora: consumo 500 kWh/mês, painel 550 Wp, orientação Norte -> 9 painéis, ~5 kWp."""
    dimensionamento, resolucao = solar_calc.calcular_orcamento_solar(
        municipio_cod_ibge=SAO_BERNARDO_COD_IBGE,
        estado_uf="SP",
        orientacao="Norte",
        consumo_mensal_kwh=500,
        potencia_wp=550,
        quantidade_kw_inversor=5.0,
        ref=ref,
    )

    assert resolucao.fallback_usado is False
    assert dimensionamento.qtd_paineis == 9
    assert dimensionamento.qtd_paineis_sugerido == 9
    assert round(dimensionamento.potencia_sistema_kwp, 2) == 4.95
    assert 4.9 <= dimensionamento.potencia_sistema_kwp <= 5.1
    assert dimensionamento.qtd_inversores == 1
    # geração estimada no PDF: 540 kWh/mês
    assert 535 <= dimensionamento.geracao_estimada_kwh <= 545


def test_calcular_dimensionamento_puro_bate_com_pdf():
    """Mesma conta, mas via função pura (sem lookup geográfico) — annual fixo em 4548."""
    result = solar_calc.calcular_dimensionamento(
        consumo_mensal_kwh=500,
        potencia_wp=550,
        orientacao="Norte",
        annual_irradiancia=4548,
        quantidade_kw_inversor=5.0,
    )
    assert result.qtd_paineis == 9
    assert round(result.potencia_sistema_kwp, 2) == 4.95
    assert round(result.geracao_estimada_kwh) == 540


@pytest.mark.parametrize(
    "orientacao,fator",
    [("Norte", 1.00), ("Nordeste", 0.97), ("Noroeste", 0.97), ("Leste/Oeste", 0.90)],
)
def test_fator_orientacao(orientacao, fator):
    result = solar_calc.calcular_dimensionamento(
        consumo_mensal_kwh=500,
        potencia_wp=550,
        orientacao=orientacao,
        annual_irradiancia=4548,
        quantidade_kw_inversor=5.0,
    )
    assert result.fator_orientacao == fator


def test_orientacao_invalida_levanta_erro():
    with pytest.raises(ValueError):
        solar_calc.calcular_dimensionamento(
            consumo_mensal_kwh=500,
            potencia_wp=550,
            orientacao="Sul",
            annual_irradiancia=4548,
            quantidade_kw_inversor=5.0,
        )


def test_qtd_paineis_override_nao_recalcula_mas_mantem_sugerido():
    result = solar_calc.calcular_dimensionamento(
        consumo_mensal_kwh=500,
        potencia_wp=550,
        orientacao="Norte",
        annual_irradiancia=4548,
        quantidade_kw_inversor=5.0,
        qtd_paineis_override=12,
    )
    assert result.qtd_paineis == 12
    assert result.qtd_paineis_sugerido == 9
    assert round(result.potencia_sistema_kwp, 2) == 6.6  # 12 * 0.55


def test_qtd_inversores_minimo_1():
    result = solar_calc.calcular_dimensionamento(
        consumo_mensal_kwh=100,
        potencia_wp=550,
        orientacao="Norte",
        annual_irradiancia=4548,
        quantidade_kw_inversor=50.0,
    )
    assert result.qtd_inversores_sugerido == 1
    assert result.qtd_inversores == 1


def test_qtd_paineis_minimo_1():
    result = solar_calc.calcular_dimensionamento(
        consumo_mensal_kwh=1,
        potencia_wp=550,
        orientacao="Norte",
        annual_irradiancia=4548,
        quantidade_kw_inversor=5.0,
    )
    assert result.qtd_paineis_sugerido == 1


def test_calcular_totais():
    itens = [
        {"quantidade": 9, "custo_unitario": 900},
        {"quantidade": 1, "custo_unitario": 5000},
        {"quantidade": 1, "custo_unitario": 3000},
    ]
    custo_total, preco_final = solar_calc.calcular_totais(itens, margem_lucro_pct=40)
    assert custo_total == 9 * 900 + 5000 + 3000
    assert preco_final == pytest.approx(custo_total * 1.4)
