"""Tipos Pydantic compartilhados entre os schemas de resposta."""
from datetime import datetime, timezone
from typing import Annotated

from pydantic import BeforeValidator


def _assume_utc(value: object) -> object:
    """SQLite não persiste timezone (mesmo com `DateTime(timezone=True)` no model) —
    devolve o datetime "naive" (sem tzinfo) na hora local do servidor... na verdade em UTC,
    já que `server_default=func.now()`/`CURRENT_TIMESTAMP` gravam em UTC. Sem essa marcação,
    o Pydantic serializa a data sem sufixo de fuso (`"2026-07-31T16:43:07"`), e o navegador
    interpreta a string como hora LOCAL em vez de UTC — exibindo a hora adiantada pelo fuso
    do usuário (ex.: 3h a mais no Brasil). Marcar explicitamente como UTC aqui garante que o
    JSON sempre carregue o offset (`+00:00`), e o frontend converte para o horário local
    corretamente em qualquer banco (SQLite ou Postgres)."""
    if isinstance(value, datetime) and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


UTCDateTime = Annotated[datetime, BeforeValidator(_assume_utc)]
