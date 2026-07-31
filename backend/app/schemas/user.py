from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    nome: str = Field(min_length=1)
    senha: str = Field(min_length=4)
    # Se omitido, é derivado do primeiro nome em minúsculas (ver routers/users.py).
    username: Optional[str] = None


class UserOut(BaseModel):
    id: int
    nome: str
    username: str
    ativo: bool
    created_at: datetime

    model_config = {"from_attributes": True}
