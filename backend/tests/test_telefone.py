import pytest

from app.services.telefone import normalizar_telefone_br, telefone_com_pais


@pytest.mark.parametrize(
    "entrada,esperado",
    [
        ("62999998888", "62999998888"),
        ("(62) 99999-8888", "62999998888"),
        ("62 9 9999-8888", "62999998888"),
        ("5562999998888", "62999998888"),  # já vem com código do país — remove
        ("6233334444", "6233334444"),  # fixo, 10 dígitos
    ],
)
def test_normaliza_telefones_validos(entrada, esperado):
    assert normalizar_telefone_br(entrada) == esperado


@pytest.mark.parametrize(
    "entrada",
    [
        "999998888",  # sem DDD (9 dígitos)
        "99998888",  # sem DDD, fixo (8 dígitos)
        "0299998888",  # DDD inválido (< 11)
        "62899998888",  # celular sem o 9 na frente
        "abc",
    ],
)
def test_rejeita_telefones_invalidos(entrada):
    with pytest.raises(ValueError):
        normalizar_telefone_br(entrada)


def test_telefone_com_pais():
    assert telefone_com_pais("62999998888") == "5562999998888"
