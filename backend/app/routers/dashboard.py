from datetime import date, datetime
from typing import Optional

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.enums import OrcamentoStatus
from app.models.budget import Budget
from app.models.budget_status_history import BudgetStatusHistory
from app.models.user import User
from app.schemas.dashboard import DashboardSummaryOut, EvolucaoItemOut, PorVendedorOut
from app.security import get_current_user
from app.services import solar_calc

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

TERMINAIS = {OrcamentoStatus.confirmado, OrcamentoStatus.cancelado}


def _preco_final(budget: Budget) -> float:
    itens_dicts = [{"quantidade": i.quantidade, "custo_unitario": i.custo_unitario} for i in budget.itens]
    _custo_total, preco_final = solar_calc.calcular_totais(itens_dicts, budget.margem_lucro_pct)
    return preco_final


def _tempo_resposta_dias(budget: Budget) -> Optional[float]:
    """Dias entre o evento 'enviado' e o primeiro evento terminal (confirmado/cancelado)
    subsequente, no histórico de status do orçamento."""
    historico = sorted(budget.status_history, key=lambda h: h.changed_at)
    enviado_em = None
    for h in historico:
        if enviado_em is None and h.status_novo == OrcamentoStatus.enviado:
            enviado_em = h.changed_at
            continue
        if enviado_em is not None and h.status_novo in TERMINAIS:
            delta = h.changed_at - enviado_em
            return delta.total_seconds() / 86400
    return None


def _media(valores: list[float]) -> Optional[float]:
    valores = [v for v in valores if v is not None]
    if not valores:
        return None
    return sum(valores) / len(valores)


def _query_budgets(
    db: Session,
    vendedor_id: Optional[int] = None,
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
) -> list[Budget]:
    stmt = select(Budget).options(
        selectinload(Budget.itens),
        selectinload(Budget.status_history),
        selectinload(Budget.vendedor),
    )
    if vendedor_id:
        stmt = stmt.where(Budget.vendedor_id == vendedor_id)
    if data_inicio:
        stmt = stmt.where(Budget.created_at >= datetime.combine(data_inicio, datetime.min.time()))
    if data_fim:
        stmt = stmt.where(Budget.created_at <= datetime.combine(data_fim, datetime.max.time()))
    return list(db.scalars(stmt).all())


@router.get("/summary", response_model=DashboardSummaryOut)
def summary(
    vendedor_id: Optional[int] = Query(default=None),
    data_inicio: Optional[date] = Query(default=None),
    data_fim: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budgets = _query_budgets(db, vendedor_id, data_inicio, data_fim)

    por_status: dict[str, int] = {s.value: 0 for s in OrcamentoStatus}
    for b in budgets:
        por_status[b.status.value] += 1

    confirmados = [b for b in budgets if b.status == OrcamentoStatus.confirmado]
    cancelados = [b for b in budgets if b.status == OrcamentoStatus.cancelado]
    ativos = [b for b in budgets if b.status != OrcamentoStatus.cancelado]

    return DashboardSummaryOut(
        total_orcamentos=len(budgets),
        valor_total=sum(_preco_final(b) for b in ativos),
        orcamentos_realizados=len(confirmados),
        valor_realizado=sum(_preco_final(b) for b in confirmados),
        orcamentos_nao_realizados=len(cancelados),
        valor_nao_realizado=sum(_preco_final(b) for b in cancelados),
        por_status=por_status,
        tempo_medio_resposta_dias=_media([_tempo_resposta_dias(b) for b in budgets]),
    )


@router.get("/por_vendedor", response_model=list[PorVendedorOut])
def por_vendedor(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    budgets = _query_budgets(db)
    vendedores = db.scalars(select(User)).all()

    result = []
    for v in vendedores:
        do_vendedor = [b for b in budgets if b.vendedor_id == v.id]
        total = len(do_vendedor)
        confirmados = sum(1 for b in do_vendedor if b.status == OrcamentoStatus.confirmado)
        taxa = (confirmados / total) if total else 0.0
        result.append(
            PorVendedorOut(
                vendedor_id=v.id,
                vendedor_nome=v.nome,
                total_orcamentos=total,
                confirmados=confirmados,
                taxa_conversao=taxa,
                tempo_medio_resposta_dias=_media([_tempo_resposta_dias(b) for b in do_vendedor]),
            )
        )
    return result


@router.get("/evolucao", response_model=list[EvolucaoItemOut])
def evolucao(
    meses: int = Query(default=12, ge=1, le=60),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budgets = _query_budgets(db)

    hoje = date.today().replace(day=1)
    meses_labels = [(hoje - relativedelta(months=i)) for i in range(meses - 1, -1, -1)]

    result = []
    for mes_inicio in meses_labels:
        mes_fim = mes_inicio + relativedelta(months=1)
        do_mes = [
            b
            for b in budgets
            if mes_inicio <= b.created_at.date().replace(day=1) < mes_fim
        ]
        result.append(
            EvolucaoItemOut(
                mes=mes_inicio.strftime("%Y-%m"),
                total_orcamentos=len(do_mes),
                # Mesmo critério do /summary: cancelado não é venda, não entra no valor.
                valor_total=sum(_preco_final(b) for b in do_mes if b.status != OrcamentoStatus.cancelado),
            )
        )
    return result
