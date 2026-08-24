"""Gestão interna (autenticada) dos pedidos recebidos pelo formulário público do site —
ver `routers/public_leads.py` para o endpoint público que os cria."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.public_lead import PublicLead
from app.models.user import User
from app.schemas.public_lead import LeadOut, LeadStatusUpdate
from app.security import get_current_user

router = APIRouter(prefix="/api/leads", tags=["leads"])


@router.get("", response_model=list[LeadOut])
def list_leads(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    stmt = select(PublicLead).order_by(PublicLead.created_at.desc())
    return db.scalars(stmt).all()


@router.put("/{lead_id}/status", response_model=LeadOut)
def update_lead_status(
    lead_id: int,
    payload: LeadStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = db.get(PublicLead, lead_id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado")
    lead.status = payload.status
    db.commit()
    db.refresh(lead)
    return lead
