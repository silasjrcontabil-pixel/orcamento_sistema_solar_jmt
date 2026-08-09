from typing import Optional

from pydantic import BaseModel


class CnpjLookupResult(BaseModel):
    nome: str
    ddd: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    cep: Optional[str] = None
    endereco: Optional[str] = None
    estado_uf: Optional[str] = None
    municipio_cod_ibge: Optional[str] = None
    municipio_nome: Optional[str] = None


class CepLookupResult(BaseModel):
    cep: str
    endereco: Optional[str] = None
    estado_uf: Optional[str] = None
    municipio_cod_ibge: Optional[str] = None
    municipio_nome: Optional[str] = None
