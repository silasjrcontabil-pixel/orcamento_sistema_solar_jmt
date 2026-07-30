import json
from functools import lru_cache
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.models.user import User
from app.security import get_current_user

router = APIRouter(prefix="/api/geo", tags=["geo"])

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Não temos dado de população no dataset (municipios_geo.json só tem nome/uf/lat/lon), então
# esta lista é uma aproximação por conhecimento geral (capital + principais cidades por
# população) só para priorizar o topo do select — evita ter que rolar até o fim da lista
# alfabética pra achar a capital (ex.: Goiânia em Goiás). O restante continua alfabético.
TOP_MUNICIPIOS_POR_UF: dict[str, list[str]] = {
    "AC": ["Rio Branco", "Cruzeiro do Sul"],
    "AL": ["Maceió", "Arapiraca", "Palmeira dos Índios"],
    "AP": ["Macapá", "Santana"],
    "AM": ["Manaus", "Parintins", "Itacoatiara"],
    "BA": ["Salvador", "Feira de Santana", "Vitória da Conquista", "Camaçari", "Itabuna"],
    "CE": ["Fortaleza", "Caucaia", "Juazeiro do Norte", "Maracanaú", "Sobral"],
    "DF": ["Brasília"],
    "ES": ["Vitória", "Vila Velha", "Serra", "Cariacica", "Cachoeiro de Itapemirim"],
    "GO": ["Goiânia", "Aparecida de Goiânia", "Anápolis", "Rio Verde", "Luziânia"],
    "MA": ["São Luís", "Imperatriz", "São José de Ribamar", "Timon", "Caxias"],
    "MT": ["Cuiabá", "Várzea Grande", "Rondonópolis", "Sinop"],
    "MS": ["Campo Grande", "Dourados", "Três Lagoas", "Corumbá"],
    "MG": ["Belo Horizonte", "Uberlândia", "Contagem", "Juiz de Fora", "Betim", "Montes Claros"],
    "PA": ["Belém", "Ananindeua", "Santarém", "Marabá", "Castanhal"],
    "PB": ["João Pessoa", "Campina Grande", "Santa Rita", "Patos"],
    "PR": ["Curitiba", "Londrina", "Maringá", "Ponta Grossa", "Cascavel", "São José dos Pinhais"],
    "PE": ["Recife", "Jaboatão dos Guararapes", "Olinda", "Caruaru", "Petrolina"],
    "PI": ["Teresina", "Parnaíba", "Picos"],
    "RJ": ["Rio de Janeiro", "São Gonçalo", "Duque de Caxias", "Nova Iguaçu", "Niterói", "Belford Roxo"],
    "RN": ["Natal", "Mossoró", "Parnamirim", "São Gonçalo do Amarante"],
    "RS": ["Porto Alegre", "Caxias do Sul", "Pelotas", "Canoas", "Santa Maria", "Gravataí"],
    "RO": ["Porto Velho", "Ji-Paraná", "Ariquemes", "Vilhena"],
    "RR": ["Boa Vista"],
    "SC": ["Joinville", "Florianópolis", "Blumenau", "São José", "Chapecó", "Itajaí"],
    "SP": [
        "São Paulo",
        "Guarulhos",
        "Campinas",
        "São Bernardo do Campo",
        "Santo André",
        "Osasco",
        "São José dos Campos",
        "Ribeirão Preto",
        "Sorocaba",
    ],
    "SE": ["Aracaju", "Nossa Senhora do Socorro", "Lagarto"],
    "TO": ["Palmas", "Araguaína", "Gurupi"],
}


@lru_cache
def _load_estados() -> dict:
    with open(DATA_DIR / "estados.json", encoding="utf-8") as f:
        return json.load(f)


@lru_cache
def _load_municipios_geo() -> dict:
    with open(DATA_DIR / "municipios_geo.json", encoding="utf-8") as f:
        return json.load(f)


@router.get("/estados")
def get_estados(current_user: User = Depends(get_current_user)) -> dict:
    """Espelha estados.json: {codigo: {sigla, nome}}."""
    return _load_estados()


@router.get("/municipios")
def get_municipios(
    uf: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    """Filtra municipios_geo.json por UF -> [{cod_ibge, nome}], com as cidades mais
    populosas do estado no topo (ver TOP_MUNICIPIOS_POR_UF) e o restante em ordem alfabética."""
    municipios = _load_municipios_geo()
    result = [
        {"cod_ibge": cod, "nome": info["nome"], "uf": info["uf"]}
        for cod, info in municipios.items()
        if uf is None or info["uf"] == uf
    ]

    def sort_key(m: dict):
        top_lista = TOP_MUNICIPIOS_POR_UF.get(m["uf"], [])
        try:
            prioridade = top_lista.index(m["nome"])
        except ValueError:
            prioridade = len(top_lista)
        return (m["uf"], prioridade, m["nome"])

    result.sort(key=sort_key)
    return [{"cod_ibge": m["cod_ibge"], "nome": m["nome"]} for m in result]
