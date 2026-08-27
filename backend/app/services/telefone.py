"""Validação/normalização de telefone brasileiro (DDD + número) — usada tanto pro formulário
público de leads (garante que dá pra notificar por WhatsApp) quanto pra montar o número
completo com código do país na hora de enviar."""
import re

_DDD_MIN, _DDD_MAX = 11, 99  # faixa de DDDs válidos no Brasil


def normalizar_telefone_br(telefone: str) -> str:
    """Retorna só os dígitos (DDD + número, sem "55"), validando que dá pra discar.
    Levanta ValueError com mensagem em português pronta pra virar erro 422 do formulário."""
    digitos = re.sub(r"\D", "", telefone)
    if digitos.startswith("55") and len(digitos) in (12, 13):
        digitos = digitos[2:]

    if len(digitos) not in (10, 11):
        raise ValueError(
            "Telefone inválido — inclua o DDD junto com o número (ex.: 62999998888)."
        )
    ddd = int(digitos[:2])
    if not (_DDD_MIN <= ddd <= _DDD_MAX):
        raise ValueError(f"DDD \"{digitos[:2]}\" inválido — confira o número e inclua o DDD correto.")
    if len(digitos) == 11 and digitos[2] != "9":
        raise ValueError(
            "Celular com DDD precisa ter 11 dígitos e começar com 9 depois do DDD (ex.: 62 9XXXX-XXXX)."
        )
    return digitos


def telefone_com_pais(telefone_normalizado: str) -> str:
    """Prefixa o código do país (55, Brasil) — formato exigido pela API de envio do WhatsApp."""
    return f"55{telefone_normalizado}"
