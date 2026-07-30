"""Testes de integração ponta a ponta via TestClient: auth, geo, clients, products, budgets
(sistema_completo e itens_individuais), calc-preview, transições de status, PDF e dashboard.
"""
import pytest

SAO_BERNARDO_COD_IBGE = "3548708"


def test_login_e_me(client, seeded_user):
    resp = client.post("/api/auth/login", json={"username": "socio_teste", "password": "senha123"})
    assert resp.status_code == 200
    token = resp.json()["access_token"]

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["username"] == "socio_teste"


def test_login_invalido(client, seeded_user):
    resp = client.post("/api/auth/login", json={"username": "socio_teste", "password": "errada"})
    assert resp.status_code == 401


def test_endpoints_exigem_auth(client):
    assert client.get("/api/clients").status_code in (401, 403)


def test_geo_estados_e_municipios(client, auth_headers):
    estados = client.get("/api/geo/estados", headers=auth_headers)
    assert estados.status_code == 200
    assert "35" in estados.json()  # SP

    municipios = client.get("/api/geo/municipios", params={"uf": "SP"}, headers=auth_headers)
    assert municipios.status_code == 200
    nomes = [m["nome"] for m in municipios.json()]
    assert "São Bernardo do Campo" in nomes


@pytest.fixture()
def painel_product(client, auth_headers):
    resp = client.post(
        "/api/products",
        headers=auth_headers,
        json={
            "tipo": "painel_solar",
            "nome": "Canadian Solar",
            "modelo": "CS6R-550MS",
            "marca": "Canadian Solar",
            "status": "ativo",
            "composicao_estrutura": "Alumínio Anodizado",
            "potencia_wp": 550,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.fixture()
def inversor_product(client, auth_headers):
    resp = client.post(
        "/api/products",
        headers=auth_headers,
        json={
            "tipo": "inversor",
            "nome": "Fronius",
            "modelo": "Symo Advanced 5.0",
            "status": "ativo",
            "quantidade_kw": 5,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_criar_produto_painel_falta_obrigatorio(client, auth_headers):
    resp = client.post(
        "/api/products",
        headers=auth_headers,
        json={"tipo": "painel_solar", "nome": "X", "status": "ativo"},  # falta modelo/composicao/potencia
    )
    assert resp.status_code == 422


@pytest.fixture()
def cliente_sbc(client, auth_headers):
    resp = client.post(
        "/api/clients",
        headers=auth_headers,
        json={
            "nome": "Jheferson Teste",
            "ddd": "62",
            "telefone": "993146646",
            "email": "teste@gmail.com",
            "cnpj_cpf": "701.030.781-43",
            "municipio_cod_ibge": SAO_BERNARDO_COD_IBGE,
            "estado_uf": "SP",
            "endereco": "Rua da Borracha",
            "tipo_residencia": "Residencial",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_criar_cliente_resolve_municipio_nome(cliente_sbc):
    assert cliente_sbc["municipio_nome"] == "São Bernardo do Campo"
    assert cliente_sbc["estado_uf"] == "SP"


def test_calc_preview_bate_com_pdf_exemplo(client, auth_headers, cliente_sbc, painel_product, inversor_product):
    resp = client.post(
        "/api/budgets/calc-preview",
        headers=auth_headers,
        json={
            "client_id": cliente_sbc["id"],
            "solar_config": {
                "consumo_mensal_kwh": 500,
                "valor_conta": 540,
                "tipo_telhado": "Cerâmico (Francês)",
                "orientacao": "Norte",
                "distribuidora": "Enel SP",
                "painel_product_id": painel_product["id"],
                "custo_unitario_painel": 900,
                "inversor_product_id": inversor_product["id"],
                "custo_unitario_inversor": 5000,
            },
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["qtd_paineis"] == 9
    assert round(data["potencia_sistema_kwp"], 2) == 4.95
    assert data["qtd_inversores"] == 1
    assert data["municipio_fallback_usado"] is False


def _payload_budget_sistema_completo(cliente_id, painel_id, inversor_id):
    return {
        "client_id": cliente_id,
        "tipo_orcamento": "sistema_completo",
        "margem_lucro_pct": 40,
        "solar_config": {
            "consumo_mensal_kwh": 500,
            "valor_conta": 540,
            "tipo_telhado": "Cerâmico (Francês)",
            "orientacao": "Norte",
            "distribuidora": "Enel SP",
            "painel_product_id": painel_id,
            "custo_unitario_painel": 900,
            "inversor_product_id": inversor_id,
            "custo_unitario_inversor": 5000,
        },
        "itens": [
            {"tipo_item": "parte_ca", "descricao": "Cabos, conectores MC4, DPS", "quantidade": 1, "custo_unitario": 3000},
            {"tipo_item": "mao_obra", "descricao": "Instalação", "quantidade": 1, "custo_unitario": 8000},
            {"tipo_item": "homologacao", "descricao": "Projeto e homologação", "quantidade": 1, "custo_unitario": 2000},
        ],
    }


@pytest.fixture()
def budget_sistema_completo(client, auth_headers, cliente_sbc, painel_product, inversor_product):
    payload = _payload_budget_sistema_completo(cliente_sbc["id"], painel_product["id"], inversor_product["id"])
    resp = client.post("/api/budgets", headers=auth_headers, json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_criar_budget_sistema_completo_gera_itens_e_dimensionamento(budget_sistema_completo):
    b = budget_sistema_completo
    assert b["status"] == "rascunho"
    assert b["solar_config"]["qtd_paineis"] == 9
    assert round(b["solar_config"]["potencia_sistema_kwp"], 2) == 4.95

    tipos = sorted(i["tipo_item"] for i in b["itens"])
    assert tipos == ["homologacao", "inversor", "mao_obra", "painel", "parte_ca"]

    painel_item = next(i for i in b["itens"] if i["tipo_item"] == "painel")
    assert painel_item["quantidade"] == 9
    assert painel_item["custo_total"] == 9 * 900

    custo_esperado = 9 * 900 + 1 * 5000 + 3000 + 8000 + 2000
    assert b["custo_total"] == custo_esperado
    assert b["preco_final"] == pytest.approx(custo_esperado * 1.4)
    assert len(b["status_history"]) == 1
    assert b["status_history"][0]["status_novo"] == "rascunho"


def test_editar_budget_sistema_completo_substitui_solar_config(
    client, auth_headers, cliente_sbc, painel_product, inversor_product, budget_sistema_completo
):
    """Regressão: PUT em um orçamento sistema_completo já existente violava a constraint
    única de budget_solar_config.budget_id (tentava inserir a config nova antes de apagar
    a antiga na mesma flush). Cobre editar um orçamento mais de uma vez."""
    budget_id = budget_sistema_completo["id"]
    payload = _payload_budget_sistema_completo(cliente_sbc["id"], painel_product["id"], inversor_product["id"])
    payload["itens"][0]["custo_unitario"] = 500  # antes era 3000 — confirma que o valor novo é o que persiste

    resp = client.put(f"/api/budgets/{budget_id}", headers=auth_headers, json=payload)
    assert resp.status_code == 200, resp.text
    updated = resp.json()
    assert updated["id"] == budget_id

    parte_ca = next(i for i in updated["itens"] if i["tipo_item"] == "parte_ca")
    assert parte_ca["custo_unitario"] == 500

    # editar de novo (segunda substituição) — é justamente onde o bug aparecia, já que a
    # primeira edição já tinha deixado uma budget_solar_config "antiga" para substituir.
    payload["itens"][0]["custo_unitario"] = 700
    resp2 = client.put(f"/api/budgets/{budget_id}", headers=auth_headers, json=payload)
    assert resp2.status_code == 200, resp2.text


def test_budget_sistema_completo_rejeita_item_painel_manual(
    client, auth_headers, cliente_sbc, painel_product, inversor_product
):
    payload = _payload_budget_sistema_completo(cliente_sbc["id"], painel_product["id"], inversor_product["id"])
    payload["itens"].append({"tipo_item": "painel", "descricao": "extra", "quantidade": 1, "custo_unitario": 100})
    resp = client.post("/api/budgets", headers=auth_headers, json=payload)
    assert resp.status_code == 422


def test_budget_status_transicoes(client, auth_headers, budget_sistema_completo):
    budget_id = budget_sistema_completo["id"]

    # transição inválida: rascunho -> confirmado direto
    resp = client.patch(f"/api/budgets/{budget_id}/status", headers=auth_headers, json={"status": "confirmado"})
    assert resp.status_code == 422

    resp = client.patch(f"/api/budgets/{budget_id}/status", headers=auth_headers, json={"status": "enviado"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "enviado"

    resp = client.patch(
        f"/api/budgets/{budget_id}/status", headers=auth_headers, json={"status": "aguardando_resposta"}
    )
    assert resp.status_code == 200

    resp = client.patch(f"/api/budgets/{budget_id}/status", headers=auth_headers, json={"status": "confirmado"})
    assert resp.status_code == 200
    assert len(resp.json()["status_history"]) == 4

    # cancelado a partir de qualquer status
    resp = client.patch(f"/api/budgets/{budget_id}/status", headers=auth_headers, json={"status": "cancelado"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "cancelado"

    # não é possível sair de cancelado
    resp = client.patch(f"/api/budgets/{budget_id}/status", headers=auth_headers, json={"status": "enviado"})
    assert resp.status_code == 422


def test_budget_pdf_sistema_completo(client, auth_headers, budget_sistema_completo):
    budget_id = budget_sistema_completo["id"]
    resp = client.get(f"/api/budgets/{budget_id}/pdf", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content[:5] == b"%PDF-"
    assert len(resp.content) > 5000


def test_budget_itens_individuais(client, auth_headers, cliente_sbc):
    payload = {
        "client_id": cliente_sbc["id"],
        "tipo_orcamento": "itens_individuais",
        "itens": [
            {"tipo_item": "outro", "descricao": "Bicicleta elétrica", "quantidade": 2, "custo_unitario": 3500},
        ],
    }
    resp = client.post("/api/budgets", headers=auth_headers, json=payload)
    assert resp.status_code == 201, resp.text
    b = resp.json()
    assert b["solar_config"] is None
    assert b["custo_total"] == 7000
    assert b["preco_final"] == pytest.approx(7000 * 1.4)

    pdf_resp = client.get(f"/api/budgets/{b['id']}/pdf", headers=auth_headers)
    assert pdf_resp.status_code == 200
    assert pdf_resp.content[:5] == b"%PDF-"


def test_budget_itens_individuais_exige_itens_nao_vazio(client, auth_headers, cliente_sbc):
    payload = {"client_id": cliente_sbc["id"], "tipo_orcamento": "itens_individuais", "itens": []}
    resp = client.post("/api/budgets", headers=auth_headers, json=payload)
    assert resp.status_code == 422


def test_lista_budgets_e_filtro_por_status(client, auth_headers, budget_sistema_completo):
    resp = client.get("/api/budgets", headers=auth_headers)
    assert resp.status_code == 200
    assert any(b["id"] == budget_sistema_completo["id"] for b in resp.json())

    resp = client.get("/api/budgets", params={"status": "rascunho"}, headers=auth_headers)
    assert resp.status_code == 200
    assert all(b["status"] == "rascunho" for b in resp.json())


def test_dashboard_summary_e_por_vendedor(client, auth_headers, budget_sistema_completo):
    resp = client.get("/api/dashboard/summary", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_orcamentos"] >= 1
    assert data["por_status"]["rascunho"] >= 1

    resp = client.get("/api/dashboard/por_vendedor", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1

    resp = client.get("/api/dashboard/evolucao", params={"meses": 6}, headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 6
