from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.enums import ConsumoMedioMensal, FaixaParcelaMensal, InteresseLead, LeadStatus, QuandoPretendeInvestir, TipoResidencia
from app.schemas.common import UTCDateTime
from app.services.telefone import normalizar_telefone_br


class PublicLeadCreate(BaseModel):
    nome: str = Field(min_length=1)
    cidade: str = Field(min_length=1)
    telefone: str = Field(min_length=8)
    email: Optional[EmailStr] = None
    interesse: InteresseLead
    consumo_medio_mensal: Optional[ConsumoMedioMensal] = None
    tipo_projeto: Optional[TipoResidencia] = None
    quando_pretende_investir: Optional[QuandoPretendeInvestir] = None
    faixa_parcela_mensal: Optional[FaixaParcelaMensal] = None
    mensagem: Optional[str] = None

    @field_validator("telefone")
    @classmethod
    def _valida_telefone(cls, v: str) -> str:
        # Normaliza pra só dígitos (DDD+número, sem "55") — garante que dá pra notificar por
        # WhatsApp depois, e já avisa o cliente na hora se o DDD estiver faltando/errado.
        return normalizar_telefone_br(v)


class PublicLeadOut(BaseModel):
    id: int

    model_config = {"from_attributes": True}


class LeadOut(BaseModel):
    id: int
    nome: str
    cidade: str
    telefone: str
    email: Optional[str]
    interesse: InteresseLead
    consumo_medio_mensal: Optional[ConsumoMedioMensal]
    tipo_projeto: Optional[TipoResidencia]
    quando_pretende_investir: Optional[QuandoPretendeInvestir]
    faixa_parcela_mensal: Optional[FaixaParcelaMensal]
    mensagem: Optional[str]
    status: LeadStatus
    created_at: UTCDateTime

    model_config = {"from_attributes": True}


class LeadStatusUpdate(BaseModel):
    status: LeadStatus
