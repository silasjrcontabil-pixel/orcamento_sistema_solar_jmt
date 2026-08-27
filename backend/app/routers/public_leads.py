"""Endpoint público (sem autenticação) do formulário de contato da página institucional."""
from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.public_lead import PublicLead
from app.schemas.public_lead import PublicLeadCreate, PublicLeadOut
from app.services.whatsapp_notify import notificar_novo_lead

router = APIRouter(prefix="/api/public/leads", tags=["public"])


@router.post("", response_model=PublicLeadOut, status_code=status.HTTP_201_CREATED)
def create_lead(payload: PublicLeadCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    lead = PublicLead(**payload.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    # Roda depois da resposta HTTP já ter sido enviada — o visitante não espera o WhatsApp.
    background_tasks.add_task(notificar_novo_lead, lead)
    return lead
