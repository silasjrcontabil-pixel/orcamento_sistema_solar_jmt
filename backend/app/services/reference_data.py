"""Carrega os dados de referência estáticos (municípios geo + irradiância) uma única vez e
mantém em memória. `load_reference_data()` é chamado explicitamente no lifespan do FastAPI
(app/main.py); `get_reference_data()` faz lazy-load caso ainda não tenha sido carregado (útil
em testes que não sobem o app inteiro).
"""
from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import numpy as np
from scipy.spatial import cKDTree

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
MUNICIPIOS_GEO_PATH = DATA_DIR / "municipios_geo.json"
IRRADIANCIA_CSV_PATH = DATA_DIR / "irradiancia.csv"


@dataclass
class ReferenceData:
    municipios: dict  # {cod_ibge: {nome, uf, lat, lon}}
    lat: np.ndarray
    lon: np.ndarray
    annual: np.ndarray
    tree: cKDTree

    def nearest_annual(self, lat: float, lon: float) -> float:
        """Retorna o valor ANNUAL (kWh/m²/ano) do ponto do grid de irradiância mais próximo."""
        _dist, idx = self.tree.query([lat, lon])
        return float(self.annual[idx])


_reference_data: Optional[ReferenceData] = None


def load_reference_data() -> ReferenceData:
    """Lê municipios_geo.json e irradiancia.csv do disco e monta o cKDTree. Custoso — chamar
    uma única vez (lifespan do FastAPI)."""
    global _reference_data

    with open(MUNICIPIOS_GEO_PATH, encoding="utf-8") as f:
        municipios = json.load(f)

    lats: list[float] = []
    lons: list[float] = []
    annuals: list[float] = []
    with open(IRRADIANCIA_CSV_PATH, encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            lats.append(float(row["LAT"]))
            lons.append(float(row["LON"]))
            annuals.append(float(row["ANNUAL"]))

    lat_arr = np.array(lats)
    lon_arr = np.array(lons)
    annual_arr = np.array(annuals)
    tree = cKDTree(np.column_stack([lat_arr, lon_arr]))

    _reference_data = ReferenceData(
        municipios=municipios, lat=lat_arr, lon=lon_arr, annual=annual_arr, tree=tree
    )
    return _reference_data


def get_reference_data() -> ReferenceData:
    if _reference_data is None:
        return load_reference_data()
    return _reference_data
