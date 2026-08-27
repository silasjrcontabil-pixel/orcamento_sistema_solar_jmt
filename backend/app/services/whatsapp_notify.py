"""Confirmação automática por WhatsApp pro CLIENTE que pediu orçamento no site (não pra
equipe interna) via Evolution API (self-hosted, REST — sem navegador/sessão frágil). Chamado
como BackgroundTask a partir de routers/public_leads.py: o lead já foi salvo no banco antes
disso rodar — falha aqui nunca derruba o cadastro do lead, só fica sem a mensagem (logada
como aviso)."""
import logging

import httpx

from app.config import settings
from app.services.telefone import telefone_com_pais

logger = logging.getLogger(__name__)


def _configurado() -> bool:
    return bool(settings.EVOLUTION_API_URL and settings.EVOLUTION_API_KEY and settings.EVOLUTION_INSTANCE_NAME)


def notificar_novo_lead(lead) -> None:
    if not _configurado():
        logger.warning(
            "Confirmação por WhatsApp pulada: EVOLUTION_API_URL/EVOLUTION_API_KEY/"
            "EVOLUTION_INSTANCE_NAME não configurados."
        )
        return

    primeiro_nome = lead.nome.strip().split()[0] if lead.nome.strip() else "tudo bem"
    texto = (
        f"Olá, {primeiro_nome}! 👋\n\n"
        "Recebemos sua solicitação de orçamento na *JMT Solar*. Em breve, um de nossos "
        "especialistas vai entrar em contato com você.\n\n"
        "Obrigado pelo interesse! ☀️"
    )

    url = f"{settings.EVOLUTION_API_URL.rstrip('/')}/message/sendText/{settings.EVOLUTION_INSTANCE_NAME}"
    payload = {
        "number": telefone_com_pais(lead.telefone),
        "textMessage": {"text": texto},
    }
    headers = {"apikey": settings.EVOLUTION_API_KEY, "Content-Type": "application/json"}

    try:
        resp = httpx.post(url, json=payload, headers=headers, timeout=15)
        resp.raise_for_status()
    except Exception:
        logger.exception("Falha ao enviar confirmação por WhatsApp pro lead #%s.", lead.id)
