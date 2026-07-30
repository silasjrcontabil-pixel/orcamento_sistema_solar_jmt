"""Motor de cálculo solar — API_CONTRACT.md, seção "Motor de cálculo solar".

Passos (dado municipio_cod_ibge -> lat/lon, orientação, consumo_mensal_kwh, potencia_wp):
  1. annual = nearest neighbor lookup em irradiancia.csv por (lat, lon) — coluna ANNUAL (kWh/m²/ano)
  2. hsp = annual / 1000
  3. radiacao_media_regiao = hsp * 30 * 0.80          (kWh/kWp/mês, perdas de 20%)
  4. fator_orientacao: Norte=1.00, Nordeste=0.97, Noroeste=0.97, "Leste/Oeste"=0.90
  5. radiacao_ajustada = radiacao_media_regiao * fator_orientacao
  6. qtd_paineis = ceil(consumo_mensal_kwh / (radiacao_ajustada * potencia_wp / 1000))  (mínimo 1)
     — se qtd_paineis_override informado, usa-se o valor informado sem recalcular, mas o
     sugerido continua sendo retornado para referência.
  7. potencia_sistema_kwp = qtd_paineis * potencia_wp / 1000
  8. qtd_inversores = ceil(potencia_sistema_kwp / quantidade_kw_inversor)  (mínimo 1, editável)
  9. geracao_estimada_kwh = qtd_paineis * (potencia_wp / 1000) * radiacao_ajustada

Fallback de município ausente em municipios_geo.json (cobertura ~98.5%): usa-se a média
(centroide) de lat/lon de todos os municípios já catalogados do mesmo estado_uf — não há como
calcular o "município geograficamente mais próximo" real para um município cujas próprias
coordenadas são desconhecidas, então a aproximação adotada é o centroide do estado (decisão de
design não 100% especificada no contrato; documentada no README).
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional

from app.services.reference_data import ReferenceData, get_reference_data

FATOR_ORIENTACAO: dict[str, float] = {
    "Norte": 1.00,
    "Nordeste": 0.97,
    "Noroeste": 0.97,
    "Leste/Oeste": 0.90,
}

PERDAS_SISTEMA = 0.80
DIAS_MES = 30


class MunicipioNaoEncontradoError(Exception):
    """Município sem coordenadas e sem nenhum outro município do mesmo estado como fallback."""


@dataclass
class LatLonResolution:
    lat: float
    lon: float
    fallback_usado: bool
    cod_ibge_resolvido: Optional[str]


@dataclass
class DimensionamentoResult:
    annual_irradiancia: float
    hsp: float
    radiacao_media_regiao: float
    fator_orientacao: float
    radiacao_ajustada: float
    qtd_paineis_sugerido: int
    qtd_paineis: int
    potencia_sistema_kwp: float
    qtd_inversores_sugerido: int
    qtd_inversores: int
    geracao_estimada_kwh: float


def resolve_lat_lon(
    municipio_cod_ibge: str,
    estado_uf: str,
    ref: Optional[ReferenceData] = None,
) -> LatLonResolution:
    """Resolve lat/lon de um município. Se ausente em municipios_geo.json, usa o centroide dos
    municípios já conhecidos do mesmo estado_uf como fallback."""
    ref = ref or get_reference_data()

    info = ref.municipios.get(str(municipio_cod_ibge))
    if info is not None:
        return LatLonResolution(
            lat=info["lat"], lon=info["lon"], fallback_usado=False, cod_ibge_resolvido=str(municipio_cod_ibge)
        )

    mesmo_estado = [m for m in ref.municipios.values() if m["uf"] == estado_uf]
    if not mesmo_estado:
        raise MunicipioNaoEncontradoError(
            f"Município {municipio_cod_ibge} não encontrado e nenhum município do estado "
            f"{estado_uf} disponível para fallback."
        )

    lat_media = sum(m["lat"] for m in mesmo_estado) / len(mesmo_estado)
    lon_media = sum(m["lon"] for m in mesmo_estado) / len(mesmo_estado)
    return LatLonResolution(lat=lat_media, lon=lon_media, fallback_usado=True, cod_ibge_resolvido=None)


def lookup_irradiancia_annual(lat: float, lon: float, ref: Optional[ReferenceData] = None) -> float:
    ref = ref or get_reference_data()
    return ref.nearest_annual(lat, lon)


def calcular_dimensionamento(
    consumo_mensal_kwh: float,
    potencia_wp: float,
    orientacao: str,
    annual_irradiancia: float,
    quantidade_kw_inversor: float,
    qtd_paineis_override: Optional[int] = None,
    qtd_inversores_override: Optional[int] = None,
) -> DimensionamentoResult:
    """Implementa os passos 2-9 do motor de cálculo, dado o ANNUAL já resolvido via lookup."""
    if orientacao not in FATOR_ORIENTACAO:
        raise ValueError(f"Orientação inválida: {orientacao!r}")

    fator_orientacao = FATOR_ORIENTACAO[orientacao]
    hsp = annual_irradiancia / 1000
    radiacao_media_regiao = hsp * DIAS_MES * PERDAS_SISTEMA
    radiacao_ajustada = radiacao_media_regiao * fator_orientacao

    geracao_por_painel_mes = radiacao_ajustada * potencia_wp / 1000
    qtd_paineis_sugerido = max(1, math.ceil(consumo_mensal_kwh / geracao_por_painel_mes))
    qtd_paineis = qtd_paineis_override if qtd_paineis_override else qtd_paineis_sugerido

    potencia_sistema_kwp = qtd_paineis * potencia_wp / 1000

    qtd_inversores_sugerido = max(1, math.ceil(potencia_sistema_kwp / quantidade_kw_inversor))
    qtd_inversores = qtd_inversores_override if qtd_inversores_override else qtd_inversores_sugerido

    geracao_estimada_kwh = qtd_paineis * (potencia_wp / 1000) * radiacao_ajustada

    return DimensionamentoResult(
        annual_irradiancia=annual_irradiancia,
        hsp=hsp,
        radiacao_media_regiao=radiacao_media_regiao,
        fator_orientacao=fator_orientacao,
        radiacao_ajustada=radiacao_ajustada,
        qtd_paineis_sugerido=qtd_paineis_sugerido,
        qtd_paineis=qtd_paineis,
        potencia_sistema_kwp=potencia_sistema_kwp,
        qtd_inversores_sugerido=qtd_inversores_sugerido,
        qtd_inversores=qtd_inversores,
        geracao_estimada_kwh=geracao_estimada_kwh,
    )


def calcular_orcamento_solar(
    municipio_cod_ibge: str,
    estado_uf: str,
    orientacao: str,
    consumo_mensal_kwh: float,
    potencia_wp: float,
    quantidade_kw_inversor: float,
    qtd_paineis_override: Optional[int] = None,
    qtd_inversores_override: Optional[int] = None,
    ref: Optional[ReferenceData] = None,
) -> tuple[DimensionamentoResult, LatLonResolution]:
    """Pipeline completo: resolve lat/lon do município (com fallback) -> lookup irradiância ->
    dimensionamento. Usado pelos routers (calc-preview e criação/edição de orçamento)."""
    ref = ref or get_reference_data()
    resolucao = resolve_lat_lon(municipio_cod_ibge, estado_uf, ref=ref)
    annual = lookup_irradiancia_annual(resolucao.lat, resolucao.lon, ref=ref)
    dimensionamento = calcular_dimensionamento(
        consumo_mensal_kwh=consumo_mensal_kwh,
        potencia_wp=potencia_wp,
        orientacao=orientacao,
        annual_irradiancia=annual,
        quantidade_kw_inversor=quantidade_kw_inversor,
        qtd_paineis_override=qtd_paineis_override,
        qtd_inversores_override=qtd_inversores_override,
    )
    return dimensionamento, resolucao


def calcular_totais(itens: list[dict], margem_lucro_pct: float) -> tuple[float, float]:
    """custo_total = soma(quantidade*custo_unitario); preco_final = custo_total*(1+margem/100)."""
    custo_total = sum(float(item["quantidade"]) * float(item["custo_unitario"]) for item in itens)
    preco_final = custo_total * (1 + float(margem_lucro_pct) / 100)
    return custo_total, preco_final
