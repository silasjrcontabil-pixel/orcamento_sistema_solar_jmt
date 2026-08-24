"""Endpoint público (sem autenticação) do formulário de contato da página institucional."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.public_lead import PublicLead
from app.schemas.public_lead import PublicLeadCreate, PublicLeadOut

router = APIRouter(prefix="/api/public/leads", tags=["public"])


@router.post("", response_model=PublicLeadOut, status_code=status.HTTP_201_CREATED)
def create_lead(payload: PublicLeadCreate, db: Session = Depends(get_db)):
    lead = PublicLead(**payload.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead
