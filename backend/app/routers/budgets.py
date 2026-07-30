from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.enums import ALLOWED_STATUS_TRANSITIONS, OrcamentoStatus, ProdutoTipo, TipoItem, TipoOrcamento
from app.models.budget import Budget
from app.models.budget_item import BudgetItem
from app.models.budget_solar_config import BudgetSolarConfig
from app.models.budget_status_history import BudgetStatusHistory
from app.models.client import Client
from app.models.product import Product
from app.models.user import User
from app.schemas.budget import (
    BudgetCreate,
    BudgetDetailOut,
    BudgetItemOut,
    BudgetListItemOut,
    BudgetUpdate,
    CalcPreviewRequest,
    CalcPreviewResponse,
    ClientMiniOut,
    SolarConfigOut,
    StatusHistoryOut,
    StatusUpdateRequest,
    VendedorMiniOut,
)
from app.security import get_current_user
from app.services import solar_calc

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_client_or_404(db: Session, client_id: int) -> Client:
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado")
    return client


def _get_product_or_422(db: Session, product_id: int, tipo_esperado: ProdutoTipo) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Produto {product_id} não encontrado"
        )
    if product.tipo != tipo_esperado:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Produto {product_id} não é do tipo {tipo_esperado.value}",
        )
    return product


def _next_numero_proposta(db: Session) -> int:
    maior = db.scalar(select(Budget.numero_proposta).order_by(Budget.numero_proposta.desc()).limit(1))
    return (maior or 0) + 1


def _dimensionar(
    db: Session, client: Client, solar_config_in, *, exigir_inversor: bool = True
) -> tuple[dict, Product, Optional[Product]]:
    painel_product = _get_product_or_422(db, solar_config_in.painel_product_id, ProdutoTipo.painel_solar)

    # No preview (exigir_inversor=False) o inversor pode ainda não ter sido escolhido pelo
    # usuário no wizard — a quantidade de painéis não depende dele, então calculamos o que
    # já dá pra calcular em vez de bloquear tudo com 422. Na criação/edição do orçamento
    # (exigir_inversor=True, o padrão) o inversor continua obrigatório.
    inversor_product: Optional[Product] = None
    if exigir_inversor:
        inversor_product = _get_product_or_422(db, solar_config_in.inversor_product_id, ProdutoTipo.inversor)
    elif solar_config_in.inversor_product_id:
        candidato = db.get(Product, solar_config_in.inversor_product_id)
        if candidato is not None and candidato.tipo == ProdutoTipo.inversor:
            inversor_product = candidato

    potencia_wp = solar_config_in.potencia_wp_override or painel_product.specs.get("potencia_wp")
    if not potencia_wp:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="potencia_wp não definida no produto e nenhum potencia_wp_override informado",
        )

    quantidade_kw_inversor = inversor_product.specs.get("quantidade_kw") if inversor_product else None
    if inversor_product is not None and not quantidade_kw_inversor:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="quantidade_kw não definida no produto inversor",
        )

    dimensionamento, resolucao = solar_calc.calcular_orcamento_solar(
        municipio_cod_ibge=client.municipio_cod_ibge,
        estado_uf=client.estado_uf,
        orientacao=solar_config_in.orientacao.value,
        consumo_mensal_kwh=solar_config_in.consumo_mensal_kwh,
        potencia_wp=potencia_wp,
        # Placeholder de 1kW quando o inversor ainda não foi escolhido: só serve pra função
        # não dividir por None; qtd_inversores é descartado depois (ver inversor_calculado).
        quantidade_kw_inversor=quantidade_kw_inversor or 1.0,
        qtd_paineis_override=solar_config_in.qtd_paineis_override,
        qtd_inversores_override=solar_config_in.qtd_inversores_override,
    )
    return {
        "potencia_wp": potencia_wp,
        "quantidade_kw_inversor": quantidade_kw_inversor,
        "inversor_calculado": quantidade_kw_inversor is not None,
        "dimensionamento": dimensionamento,
        "fallback_usado": resolucao.fallback_usado,
    }, painel_product, inversor_product


def _montar_itens_e_config(db: Session, client: Client, payload: BudgetCreate):
    """Retorna (lista de dicts prontos para BudgetItem, BudgetSolarConfig ou None)."""
    if payload.tipo_orcamento == TipoOrcamento.sistema_completo:
        sc = payload.solar_config
        calc, painel_product, inversor_product = _dimensionar(db, client, sc)
        dim = calc["dimensionamento"]

        for item in payload.itens:
            if item.tipo_item in (TipoItem.painel, TipoItem.inversor):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=(
                        "Itens de painel/inversor são gerados automaticamente a partir de "
                        "solar_config; não envie tipo_item=painel/inversor na lista `itens`."
                    ),
                )

        itens_dicts = [
            {
                "tipo_item": TipoItem.painel,
                "product_id": painel_product.id,
                "descricao": f"{painel_product.nome} {painel_product.modelo or ''} - {calc['potencia_wp']:.0f}Wp".strip(),
                "quantidade": dim.qtd_paineis,
                "custo_unitario": sc.custo_unitario_painel,
            },
            {
                "tipo_item": TipoItem.inversor,
                "product_id": inversor_product.id,
                "descricao": (
                    f"{inversor_product.nome} {inversor_product.modelo or ''} - "
                    f"{calc['quantidade_kw_inversor']:.1f}kW".strip()
                ),
                "quantidade": dim.qtd_inversores,
                "custo_unitario": sc.custo_unitario_inversor,
            },
        ]
        for extra in payload.itens:
            itens_dicts.append(extra.model_dump())

        solar_config_model = BudgetSolarConfig(
            consumo_mensal_kwh=sc.consumo_mensal_kwh,
            valor_conta=sc.valor_conta,
            tipo_telhado=sc.tipo_telhado,
            orientacao=sc.orientacao,
            distribuidora=sc.distribuidora,
            area_disponivel_m2=sc.area_disponivel_m2,
            painel_product_id=painel_product.id,
            potencia_wp_override=sc.potencia_wp_override,
            qtd_paineis_override=sc.qtd_paineis_override,
            inversor_product_id=inversor_product.id,
            qtd_inversores_override=sc.qtd_inversores_override,
            potencia_wp_utilizada=calc["potencia_wp"],
            quantidade_kw_inversor_utilizada=calc["quantidade_kw_inversor"],
            radiacao_media_regiao=dim.radiacao_media_regiao,
            radiacao_ajustada=dim.radiacao_ajustada,
            qtd_paineis_sugerido=dim.qtd_paineis_sugerido,
            qtd_paineis=dim.qtd_paineis,
            potencia_sistema_kwp=dim.potencia_sistema_kwp,
            qtd_inversores_sugerido=dim.qtd_inversores_sugerido,
            qtd_inversores=dim.qtd_inversores,
            geracao_estimada_kwh=dim.geracao_estimada_kwh,
            municipio_fallback_usado=calc["fallback_usado"],
        )
        return itens_dicts, solar_config_model

    # itens_individuais
    itens_dicts = [item.model_dump() for item in payload.itens]
    return itens_dicts, None


def _build_solar_config_out(budget: Budget) -> Optional[SolarConfigOut]:
    sc = budget.solar_config
    if sc is None:
        return None
    custo_painel = next((i.custo_unitario for i in budget.itens if i.tipo_item == TipoItem.painel), 0)
    custo_inversor = next((i.custo_unitario for i in budget.itens if i.tipo_item == TipoItem.inversor), 0)
    return SolarConfigOut(
        consumo_mensal_kwh=sc.consumo_mensal_kwh,
        valor_conta=sc.valor_conta,
        tipo_telhado=sc.tipo_telhado,
        orientacao=sc.orientacao,
        distribuidora=sc.distribuidora,
        area_disponivel_m2=sc.area_disponivel_m2,
        painel_product_id=sc.painel_product_id,
        potencia_wp_override=sc.potencia_wp_override,
        qtd_paineis_override=sc.qtd_paineis_override,
        custo_unitario_painel=float(custo_painel),
        inversor_product_id=sc.inversor_product_id,
        qtd_inversores_override=sc.qtd_inversores_override,
        custo_unitario_inversor=float(custo_inversor),
        potencia_wp_utilizada=sc.potencia_wp_utilizada,
        quantidade_kw_inversor_utilizada=sc.quantidade_kw_inversor_utilizada,
        radiacao_media_regiao=sc.radiacao_media_regiao,
        radiacao_ajustada=sc.radiacao_ajustada,
        qtd_paineis_sugerido=sc.qtd_paineis_sugerido,
        qtd_paineis=sc.qtd_paineis,
        potencia_sistema_kwp=sc.potencia_sistema_kwp,
        qtd_inversores_sugerido=sc.qtd_inversores_sugerido,
        qtd_inversores=sc.qtd_inversores,
        geracao_estimada_kwh=sc.geracao_estimada_kwh,
        municipio_fallback_usado=sc.municipio_fallback_usado,
    )


def _to_detail_out(budget: Budget) -> BudgetDetailOut:
    itens_dicts = [{"quantidade": i.quantidade, "custo_unitario": i.custo_unitario} for i in budget.itens]
    custo_total, preco_final = solar_calc.calcular_totais(itens_dicts, budget.margem_lucro_pct)
    return BudgetDetailOut(
        id=budget.id,
        numero_proposta=budget.numero_proposta,
        client=ClientMiniOut.model_validate(budget.client),
        vendedor=VendedorMiniOut.model_validate(budget.vendedor),
        tipo_orcamento=budget.tipo_orcamento,
        status=budget.status,
        margem_lucro_pct=float(budget.margem_lucro_pct),
        validade_dias=budget.validade_dias,
        observacoes=budget.observacoes,
        solar_config=_build_solar_config_out(budget),
        itens=[BudgetItemOut.model_validate(i) for i in budget.itens],
        custo_total=custo_total,
        preco_final=preco_final,
        status_history=[
            StatusHistoryOut(
                status_anterior=h.status_anterior,
                status_novo=h.status_novo,
                changed_by=h.changed_by,
                changed_by_nome=h.changed_by_user.nome,
                changed_at=h.changed_at,
            )
            for h in budget.status_history
        ],
        created_at=budget.created_at,
        updated_at=budget.updated_at,
    )


def _load_budget_full(db: Session, budget_id: int) -> Budget:
    stmt = (
        select(Budget)
        .where(Budget.id == budget_id)
        .options(
            selectinload(Budget.client),
            selectinload(Budget.vendedor),
            selectinload(Budget.solar_config),
            selectinload(Budget.itens),
            selectinload(Budget.status_history).selectinload(BudgetStatusHistory.changed_by_user),
        )
    )
    budget = db.scalar(stmt)
    if budget is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orçamento não encontrado")
    return budget


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=list[BudgetListItemOut])
def list_budgets(
    vendedor_id: Optional[int] = Query(default=None),
    status_: Optional[OrcamentoStatus] = Query(default=None, alias="status"),
    data_inicio: Optional[date] = Query(default=None),
    data_fim: Optional[date] = Query(default=None),
    cliente_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Budget).options(
        selectinload(Budget.client), selectinload(Budget.vendedor), selectinload(Budget.itens)
    )
    if vendedor_id:
        stmt = stmt.where(Budget.vendedor_id == vendedor_id)
    if status_:
        stmt = stmt.where(Budget.status == status_)
    if cliente_id:
        stmt = stmt.where(Budget.client_id == cliente_id)
    if data_inicio:
        stmt = stmt.where(Budget.created_at >= datetime.combine(data_inicio, datetime.min.time()))
    if data_fim:
        stmt = stmt.where(Budget.created_at <= datetime.combine(data_fim, datetime.max.time()))
    stmt = stmt.order_by(Budget.created_at.desc())

    budgets = db.scalars(stmt).all()
    result = []
    for b in budgets:
        itens_dicts = [{"quantidade": i.quantidade, "custo_unitario": i.custo_unitario} for i in b.itens]
        _custo_total, preco_final = solar_calc.calcular_totais(itens_dicts, b.margem_lucro_pct)
        result.append(
            BudgetListItemOut(
                id=b.id,
                numero_proposta=b.numero_proposta,
                cliente_nome=b.client.nome,
                vendedor_nome=b.vendedor.nome,
                status=b.status,
                valor_final=preco_final,
                created_at=b.created_at,
            )
        )
    return result


@router.post("", response_model=BudgetDetailOut, status_code=status.HTTP_201_CREATED)
def create_budget(
    payload: BudgetCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    client = _get_client_or_404(db, payload.client_id)
    itens_dicts, solar_config_model = _montar_itens_e_config(db, client, payload)

    budget = Budget(
        numero_proposta=_next_numero_proposta(db),
        client_id=client.id,
        vendedor_id=current_user.id,
        tipo_orcamento=payload.tipo_orcamento,
        status=OrcamentoStatus.rascunho,
        margem_lucro_pct=payload.margem_lucro_pct,
        validade_dias=payload.validade_dias,
        observacoes=payload.observacoes,
    )
    if solar_config_model is not None:
        budget.solar_config = solar_config_model
    budget.itens = [BudgetItem(custo_total=d["quantidade"] * d["custo_unitario"], **d) for d in itens_dicts]
    budget.status_history = [
        BudgetStatusHistory(status_anterior=None, status_novo=OrcamentoStatus.rascunho, changed_by=current_user.id)
    ]

    db.add(budget)
    db.commit()

    return _to_detail_out(_load_budget_full(db, budget.id))


@router.get("/{budget_id}", response_model=BudgetDetailOut)
def get_budget(budget_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _to_detail_out(_load_budget_full(db, budget_id))


@router.put("/{budget_id}", response_model=BudgetDetailOut)
def update_budget(
    budget_id: int,
    payload: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = _load_budget_full(db, budget_id)
    client = _get_client_or_404(db, payload.client_id)
    itens_dicts, solar_config_model = _montar_itens_e_config(db, client, payload)

    budget.client_id = client.id
    budget.tipo_orcamento = payload.tipo_orcamento
    budget.margem_lucro_pct = payload.margem_lucro_pct
    budget.validade_dias = payload.validade_dias
    budget.observacoes = payload.observacoes

    budget.itens = [BudgetItem(custo_total=d["quantidade"] * d["custo_unitario"], **d) for d in itens_dicts]

    # budget_solar_config tem constraint única em budget_id (1:1) — reatribuir direto
    # tentaria inserir a nova linha antes do DELETE da antiga na mesma flush (o
    # cascade="delete-orphan" não garante a ordem certa aqui), violando a constraint.
    # Precisa deletar e dar flush antes de associar a nova configuração.
    if budget.solar_config is not None:
        db.delete(budget.solar_config)
        db.flush()
    budget.solar_config = solar_config_model

    db.commit()
    return _to_detail_out(_load_budget_full(db, budget.id))


@router.patch("/{budget_id}/status", response_model=BudgetDetailOut)
def update_budget_status(
    budget_id: int,
    payload: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = _load_budget_full(db, budget_id)
    permitido = ALLOWED_STATUS_TRANSITIONS.get(budget.status, set())
    if payload.status not in permitido:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Transição de status inválida: {budget.status.value} -> {payload.status.value}",
        )

    db.add(
        BudgetStatusHistory(
            budget_id=budget.id,
            status_anterior=budget.status,
            status_novo=payload.status,
            changed_by=current_user.id,
        )
    )
    budget.status = payload.status
    db.commit()
    return _to_detail_out(_load_budget_full(db, budget.id))


@router.post("/calc-preview", response_model=CalcPreviewResponse)
def calc_preview(
    payload: CalcPreviewRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    client = _get_client_or_404(db, payload.client_id)
    calc, _painel, _inversor = _dimensionar(db, client, payload.solar_config, exigir_inversor=False)
    dim = calc["dimensionamento"]
    inversor_calculado = calc["inversor_calculado"]
    return CalcPreviewResponse(
        qtd_paineis=dim.qtd_paineis,
        qtd_paineis_sugerido=dim.qtd_paineis_sugerido,
        potencia_sistema_kwp=dim.potencia_sistema_kwp,
        qtd_inversores=dim.qtd_inversores if inversor_calculado else None,
        qtd_inversores_sugerido=dim.qtd_inversores_sugerido if inversor_calculado else None,
        geracao_estimada_kwh=dim.geracao_estimada_kwh,
        radiacao_media_regiao=dim.radiacao_media_regiao,
        radiacao_ajustada=dim.radiacao_ajustada,
        municipio_fallback_usado=calc["fallback_usado"],
    )


@router.get("/{budget_id}/pdf")
def get_budget_pdf(budget_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.services.pdf_generator import generate_budget_pdf  # import tardio (weasyprint)

    budget = _load_budget_full(db, budget_id)
    pdf_bytes = generate_budget_pdf(budget)
    filename = f"proposta-{budget.numero_proposta:04d}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )
