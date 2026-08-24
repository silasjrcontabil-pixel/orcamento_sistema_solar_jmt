"""Migra todos os dados de `DATABASE_URL` (Postgres/Supabase, origem) para `MYSQL_DATABASE_URL`
(MySQL/MariaDB do cPanel, destino) — Etapa 4 de `../../instrucoes-migracao-postgres-mysql.md`.

Usa os mesmos `Table` (SQLAlchemy Core, vindos de `Base.metadata`/`app.models`) tanto pra ler
quanto pra gravar — os tipos de coluna (Enum, JSON, Numeric, DateTime) fazem a conversão
Python <-> banco de forma idêntica nos dois lados, sem precisar traduzir nada manualmente:
  - Enum(..., native_enum=False): lê como o membro Python (ex. TipoTelhado.ceramico_metalica) e
    grava de volta como `.name` — preserva exatamente o que já está no Postgres.
  - `products.specs` (JSON/JSONB via with_variant): dict Python nos dois lados.
  - Numeric/Decimal: passa direto.
  - DateTime(timezone=True): Postgres devolve datetime "aware" (UTC); removemos o tzinfo antes
    de gravar no MySQL (que não tem tipo "with timezone" — grava a mesma hora UTC, só sem o
    offset explícito, igual o resto do app já assume em `app/schemas/common.py`).

Preserva os IDs originais (INSERT explícito de `id`) pra manter as foreign keys íntegras — o
AUTO_INCREMENT do MySQL se ajusta sozinho pro próximo valor livre após um INSERT com id explícito.

Uso:
    python scripts/migrate_postgres_to_mysql.py              # migra e valida
    python scripts/migrate_postgres_to_mysql.py --dry-run    # só mostra o que faria, não grava
    python scripts/migrate_postgres_to_mysql.py --validate-only  # só valida (já migrado antes)
"""
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import create_engine, insert, select  # noqa: E402

from app.config import settings  # noqa: E402
from app.db import Base  # noqa: E402
from app import models  # noqa: E402,F401  (registra todos os models em Base.metadata)

# Ordem que respeita as foreign keys (tabela pai antes da(s) tabela(s) filha(s)).
TABLE_ORDER = [
    "users",
    "clients",
    "products",
    "budgets",
    "budget_items",
    "budget_solar_config",
    "budget_status_history",
    "budget_edit_history",
]


def _sem_timezone(valor):
    if isinstance(valor, datetime) and valor.tzinfo is not None:
        return valor.replace(tzinfo=None)
    return valor


def _linha_sem_timezone(row_mapping: dict) -> dict:
    return {k: _sem_timezone(v) for k, v in row_mapping.items()}


def _campos_iguais(a, b) -> bool:
    """MySQL DATETIME (sem fsp configurado) arredonda/trunca microssegundos — tolera até 1s de
    diferença em campos datetime (irrelevante: a UI nunca mostra precisão de segundo). Qualquer
    outro tipo de campo precisa bater exatamente."""
    a, b = _sem_timezone(a), _sem_timezone(b)
    if isinstance(a, datetime) and isinstance(b, datetime):
        return abs(a - b) <= timedelta(seconds=1)
    return a == b


def _migrar(origem, destino):
    with destino.connect() as conn_destino:
        contagens_destino = {
            nome: len(conn_destino.execute(select(Base.metadata.tables[nome])).fetchall())
            for nome in TABLE_ORDER
        }
    tabelas_com_dados = {k: v for k, v in contagens_destino.items() if v > 0}
    if tabelas_com_dados:
        print("ABORTADO: o banco de destino (MySQL) já tem dados nestas tabelas:")
        for nome, qtd in tabelas_com_dados.items():
            print(f"  - {nome}: {qtd} linha(s)")
        print(
            "\nRodar de novo causaria erro de chave duplicada (ou, pior, dado duplicado se os "
            "IDs não baterem). Esvazie o destino antes (ex.: `alembic downgrade base && alembic "
            "upgrade head` apontando pro MySQL), rode com --validate-only pra só conferir o que "
            "já está lá, ou --dry-run pra simular sem gravar."
        )
        sys.exit(1)

    with origem.connect() as conn_origem, destino.connect() as conn_destino:
        for nome_tabela in TABLE_ORDER:
            tabela = Base.metadata.tables[nome_tabela]
            linhas = conn_origem.execute(select(tabela)).mappings().all()
            linhas_convertidas = [_linha_sem_timezone(dict(linha)) for linha in linhas]

            print(f"{nome_tabela}: {len(linhas_convertidas)} linha(s) na origem", end="")
            if linhas_convertidas:
                conn_destino.execute(insert(tabela), linhas_convertidas)
                conn_destino.commit()
            print(" -> gravado(s) no destino")


def _validar(origem, destino) -> bool:
    print("\n--- Validação ---")
    ok = True
    with origem.connect() as conn_origem, destino.connect() as conn_destino:
        for nome_tabela in TABLE_ORDER:
            tabela = Base.metadata.tables[nome_tabela]
            esperado = len(conn_origem.execute(select(tabela)).fetchall())
            no_destino = len(conn_destino.execute(select(tabela)).fetchall())
            status = "OK" if no_destino == esperado else "DIVERGÊNCIA"
            if no_destino != esperado:
                ok = False
            print(f"{nome_tabela}: origem={esperado} destino={no_destino} [{status}]")

            # Amostra: primeira e última linha (por id) devem bater campo a campo.
            pk = tabela.primary_key.columns.values()[0]
            linhas_origem = conn_origem.execute(select(tabela).order_by(pk)).mappings().all()
            for linha in ([linhas_origem[0], linhas_origem[-1]] if linhas_origem else []):
                id_valor = linha[pk.name]
                linha_destino = conn_destino.execute(
                    select(tabela).where(pk == id_valor)
                ).mappings().first()
                if linha_destino is None:
                    print(f"  id={id_valor}: AUSENTE NO DESTINO")
                    ok = False
                    continue
                obtido_dict = dict(linha_destino)
                divergiu = False
                for campo, valor_origem in linha.items():
                    if not _campos_iguais(valor_origem, obtido_dict.get(campo)):
                        if not divergiu:
                            print(f"  id={id_valor}: DIVERGÊNCIA DE CAMPOS")
                            divergiu = True
                        print(f"    {campo}: origem={valor_origem!r} destino={obtido_dict.get(campo)!r}")
                if divergiu:
                    ok = False
    return ok


def main():
    dry_run = "--dry-run" in sys.argv
    validate_only = "--validate-only" in sys.argv

    if not settings.MYSQL_DATABASE_URL:
        print("MYSQL_DATABASE_URL não configurada no .env — nada a fazer.")
        sys.exit(1)

    origem = create_engine(settings.DATABASE_URL)
    destino = create_engine(settings.MYSQL_DATABASE_URL, connect_args={"charset": "utf8mb4"})

    print(f"Origem:  {origem.url.render_as_string(hide_password=True)}")
    print(f"Destino: {destino.url.render_as_string(hide_password=True)}")
    print()

    if dry_run:
        with origem.connect() as conn_origem:
            for nome_tabela in TABLE_ORDER:
                n = len(conn_origem.execute(select(Base.metadata.tables[nome_tabela])).fetchall())
                print(f"{nome_tabela}: {n} linha(s) na origem (dry-run, não gravado)")
        print("\nDry-run concluído — nada foi gravado no MySQL.")
        return

    if not validate_only:
        _migrar(origem, destino)

    ok = _validar(origem, destino)
    print("\n" + ("MIGRAÇÃO OK — todos os dados conferem." if ok else "MIGRAÇÃO COM DIVERGÊNCIAS — ver acima."))


if __name__ == "__main__":
    main()
