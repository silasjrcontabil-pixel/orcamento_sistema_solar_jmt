from pydantic import BaseModel


class EstadoOut(BaseModel):
    sigla: str
    nome: str


class MunicipioOut(BaseModel):
    cod_ibge: str
    nome: str
