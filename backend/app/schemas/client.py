from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.enums import TipoResidencia


class ClientCreate(BaseModel):
    nome: str = Field(min_length=1)
    ddd: str = Field(min_length=2, max_length=3)
    telefone: str = Field(min_length=8)
    cnpj_cpf: Optional[str] = None
    email: Optional[EmailStr] = None
    cep: Optional[str] = None
    municipio_cod_ibge: str
    estado_uf: str = Field(min_length=2, max_length=2)
    endereco: str = Field(min_length=1)
    tipo_residencia: TipoResidencia


class ClientUpdate(ClientCreate):
    pass


class ClientOut(BaseModel):
    id: int
    nome: str
    ddd: str
    telefone: str
    cnpj_cpf: Optional[str]
    email: Optional[str]
    cep: Optional[str]
    municipio_cod_ibge: str
    municipio_nome: str
    estado_uf: str
    endereco: str
    tipo_residencia: TipoResidencia
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
