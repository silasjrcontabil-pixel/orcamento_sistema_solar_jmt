"""remap tipo_telhado valores antigos

Revision ID: 7a1f2c9e4d3b
Revises: 3c0bd624773d
Create Date: 2026-07-31 17:05:00.000000

Migração de dados (sem mudança de schema): o enum `TipoTelhado` foi expandido de
5 para 9 opções e alguns nomes de membro do enum mudaram (`ceramico` ->
`ceramico_metalica`, `fibrocimento` -> `fibrocimento_metalica`, `metalico` ->
`fixacao_l_metalica`; `laje`/`solo` continuam iguais). A coluna
`budget_solar_config.tipo_telhado` (Enum não-nativo, sem `values_callable`) grava
o NOME do membro Python, não o valor exibido — orçamentos criados antes dessa
mudança ficam com um nome que não existe mais no enum novo, e o SQLAlchemy
lança erro ao tentar reconstruir o enum na leitura (`GET /budgets/{id}` quebra
com 500). Sem mapeamento direto para a variação de base (metálica/madeira)
usada originalmente, assume-se "metálica" como default — ajuste manualmente
depois se algum orçamento específico foi feito para telhado de madeira.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '7a1f2c9e4d3b'
down_revision: Union[str, Sequence[str], None] = '3c0bd624773d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_REMAP = {
    "ceramico": "ceramico_metalica",
    "fibrocimento": "fibrocimento_metalica",
    "metalico": "fixacao_l_metalica",
}


def upgrade() -> None:
    for antigo, novo in _REMAP.items():
        op.execute(
            f"UPDATE budget_solar_config SET tipo_telhado = '{novo}' WHERE tipo_telhado = '{antigo}'"
        )


def downgrade() -> None:
    for antigo, novo in _REMAP.items():
        op.execute(
            f"UPDATE budget_solar_config SET tipo_telhado = '{antigo}' WHERE tipo_telhado = '{novo}'"
        )
