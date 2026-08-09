"""Preenchimento automático do formulário de cliente a partir de APIs públicas:
publica.cnpj.ws (dados cadastrais do CNPJ) e viacep.com.br (endereço do CEP).
Passa pelo backend (em vez do frontend chamar direto) para não depender de CORS
liberado nesses serviços de terceiros e para centralizar o mapeamento dos campos.
"""
import re
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from app.models.user import User
from app.schemas.client_lookup import CepLookupResult, CnpjLookupResult
from app.security import get_current_user

router = APIRouter(prefix="/api/clients/lookup", tags=["clients"])

_HTTP_TIMEOUT = 8.0


def _only_digits(value: str) -> str:
    return re.sub(r"\D", "", value)


def _join_nonempty(parts: list[Optional[str]], sep: str = ", ") -> Optional[str]:
    filtered = [p for p in parts if p]
    return sep.join(filtered) if filtered else None


@router.get("/cnpj/{cnpj}", response_model=CnpjLookupResult)
def lookup_cnpj(cnpj: str, current_user: User = Depends(get_current_user)):
    digits = _only_digits(cnpj)
    if len(digits) != 14:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="CNPJ deve ter 14 dígitos"
        )

    try:
        resp = httpx.get(f"https://publica.cnpj.ws/cnpj/{digits}", timeout=_HTTP_TIMEOUT)
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="Não foi possível consultar o CNPJ agora"
        )

    if resp.status_code == 404:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CNPJ não encontrado")
    if resp.status_code == 429:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Limite de consultas de CNPJ excedido. Tente novamente em instantes.",
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="Não foi possível consultar o CNPJ agora"
        )

    data = resp.json()
    estabelecimento = data.get("estabelecimento") or {}
    cidade = estabelecimento.get("cidade") or {}
    estado = estabelecimento.get("estado") or {}

    endereco = _join_nonempty(
        [
            _join_nonempty(
                [estabelecimento.get("tipo_logradouro"), estabelecimento.get("logradouro")], sep=" "
            ),
            estabelecimento.get("numero"),
            estabelecimento.get("complemento"),
            estabelecimento.get("bairro"),
        ]
    )

    return CnpjLookupResult(
        nome=data.get("razao_social") or estabelecimento.get("nome_fantasia") or "",
        ddd=estabelecimento.get("ddd1") or None,
        telefone=estabelecimento.get("telefone1") or None,
        email=estabelecimento.get("email") or None,
        cep=estabelecimento.get("cep") or None,
        endereco=endereco,
        estado_uf=estado.get("sigla"),
        municipio_cod_ibge=str(cidade["id"]) if cidade.get("id") is not None else None,
        municipio_nome=cidade.get("nome"),
    )


@router.get("/cep/{cep}", response_model=CepLookupResult)
def lookup_cep(cep: str, current_user: User = Depends(get_current_user)):
    digits = _only_digits(cep)
    if len(digits) != 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="CEP deve ter 8 dígitos"
        )

    try:
        resp = httpx.get(f"https://viacep.com.br/ws/{digits}/json/", timeout=_HTTP_TIMEOUT)
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="Não foi possível consultar o CEP agora"
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="Não foi possível consultar o CEP agora"
        )

    data = resp.json()
    if data.get("erro"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CEP não encontrado")

    endereco = _join_nonempty([data.get("logradouro"), data.get("complemento"), data.get("bairro")])

    return CepLookupResult(
        cep=data.get("cep") or digits,
        endereco=endereco,
        estado_uf=data.get("uf"),
        municipio_cod_ibge=data.get("ibge"),
        municipio_nome=data.get("localidade"),
    )
