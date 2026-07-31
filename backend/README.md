# JMT Solar — Backend

API FastAPI do sistema interno de orçamentos de energia solar da JMT Solar. Contrato completo
de endpoints em `../API_CONTRACT.md`; plano de implementação em
`~/.claude/plans/bright-discovering-pebble.md`.

## Stack

FastAPI + SQLAlchemy 2 + Alembic + Postgres (Supabase) / SQLite (dev) + JWT (python-jose) +
bcrypt (passlib) + WeasyPrint (PDF) + Jinja2.

## Rodando localmente

### 1. Ambiente virtual e dependências

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux/Mac
pip install -r requirements.txt
```

### 2. Configuração (`.env`)

```bash
cp .env.example .env
```

Edite `.env`:
- `DATABASE_URL`: string do Postgres do Supabase (`postgresql+psycopg2://...`). Para rodar sem
  Postgres disponível, use `sqlite:///./dev.db` — funciona igual para tudo, inclusive Alembic.
- `JWT_SECRET`: qualquer string aleatória longa.
- `FRONTEND_ORIGIN`: origem(ns) do frontend (ex.: `http://localhost:5174` em dev; separe por
  vírgula se houver mais de uma).

### 3. Migrações e seed dos usuários

```bash
alembic upgrade head
python scripts/seed_users.py
```

O seed cria (ou, se já existirem — casando por `nome` —, atualiza usuário/senha de) os 3
usuários sócios. Login é sempre o primeiro nome em minúsculas (ex.: `jheferson`), senha
individual de cada um definida na lista `SOCIOS` em `scripts/seed_users.py` (padrão
`Nome@1`, ex.: `Jheferson@1`). Editar a senha de alguém na lista e rodar o script de novo
aplica a troca no banco. Novos vendedores podem ser cadastrados direto pelo portal (aba
"Vendedores"), sem precisar rodar o script.

### 4. Subir a API

```bash
uvicorn app.main:app --reload
```

Docs interativas em `http://127.0.0.1:8000/docs`.

### 5. Testes

```bash
pytest
```

Cobre o motor de cálculo solar (`app/services/solar_calc.py`), incluindo o caso de referência
do PDF de exemplo (consumo 500 kWh/mês, painel 550 Wp, orientação Norte → 9 painéis, ~5 kWp).

## WeasyPrint no Windows (dev local)

O endpoint `GET /api/budgets/{id}/pdf` usa `weasyprint`, que depende das bibliotecas nativas
Pango/Cairo/GDK-Pixbuf/GObject (GTK). No Linux (Render) elas são instaladas via `apt-get` no
`buildCommand` do `render.yaml`. No Windows, para testar a geração de PDF localmente, instale o
runtime GTK3 e garanta que o `bin` dele esteja no `PATH` do processo que roda o uvicorn:

```powershell
winget install --id tschoonj.GTKForWindows -e
# adicione "C:\Program Files\GTK3-Runtime Win64\bin" ao PATH da sessão/terminal
```

Sem isso, o resto da API funciona normalmente — o import do `weasyprint` é feito de forma
lazy (só dentro do endpoint de PDF) justamente para não quebrar o boot da aplicação nem os
outros endpoints/testes em máquinas sem o runtime GTK.

## Deploy (Render, plano free)

`render.yaml` já define o serviço (`rootDir: backend`), instala as bibliotecas nativas do
WeasyPrint via apt no build, roda `alembic upgrade head` no start e sobe o uvicorn. Configure
no painel do Render (ou via `render.yaml` + variáveis marcadas `sync: false`):
- `DATABASE_URL` → Postgres do Supabase (não usar o Postgres free do Render, que expira).
- `FRONTEND_ORIGIN` → domínio(s) publicado(s) do frontend (Vercel/Netlify).

Depois do primeiro deploy, rode `python scripts/seed_users.py` uma vez (shell do Render ou
localmente apontando `DATABASE_URL` para o Supabase) para criar os 3 usuários.

## Estrutura

```
app/
  main.py            # FastAPI app, CORS, lifespan (carrega dados de referência geo/irradiância)
  config.py          # settings (.env)
  db.py              # engine/session SQLAlchemy
  security.py        # hash de senha + JWT
  enums.py           # enums compartilhados (models + schemas)
  models/            # SQLAlchemy: users, clients, products, budgets, budget_solar_config,
                     #   budget_items, budget_status_history, budget_edit_history
  schemas/           # Pydantic (request/response), discriminated union de produto por tipo
  routers/           # auth, geo, clients, products, budgets, dashboard, users
  services/
    reference_data.py # carrega municipios_geo.json + irradiancia.csv, monta cKDTree
    solar_calc.py      # motor de cálculo solar (API_CONTRACT.md)
    pdf_generator.py   # weasyprint + Jinja2
  templates/proposta.html
  data/              # municipios_geo.json, irradiancia.csv, estados.json, municipios.json
  static/logo.jpeg
scripts/
  build_reference_data.py  # já rodado — não rodar de novo
  seed_users.py
alembic/             # migrations
tests/               # pytest (solar_calc)
```

## Regras de negócio implementadas

- Orçamentos, clientes e produtos **nunca são deletados** — apenas `status=cancelado`
  (orçamentos) ou `status=desativado` (produtos). Não há endpoint de DELETE para nenhum dos
  três.
- Transições de status de orçamento seguem estritamente
  `rascunho → enviado → aguardando_resposta → confirmado`, e qualquer status pode ir direto
  para `cancelado`. Toda transição grava uma linha em `budget_status_history` (alimenta o
  dashboard de tempo de resposta por vendedor).
- Margem de lucro padrão 40%, editável por orçamento (`margem_lucro_pct`). Validade da
  proposta padrão 7 dias (`validade_dias`).
- Para `tipo_orcamento=sistema_completo`, o backend gera automaticamente os `budget_items` de
  painel e inversor a partir de `solar_config` (usando `custo_unitario_painel` /
  `custo_unitario_inversor` informados no próprio orçamento — o catálogo de produtos não tem
  preço, conforme regra mestra do briefing). O cliente só adiciona itens extras
  (`parte_ca`, `mao_obra`, `homologacao`, `outro`) na lista `itens`.
- Não há distinção de papel/role entre usuários: qualquer vendedor pode ver, editar e
  alterar o status de orçamento de outro vendedor. Edições (`PUT`) ficam registradas em
  `budget_edit_history` para auditoria de quem alterou.
- Cadastro de produto não exige nenhum campo preenchido além de `tipo` — o resto é
  preenchido depois ou fica com fallback (ver `routers/products.py::_resolve_nome`).

## Decisões de design não 100% explícitas no contrato

Ver seção correspondente no relatório final da tarefa (resumo): fallback de município ausente
usa o centroide dos municípios já catalogados do mesmo estado; `custo_unitario_painel`/
`custo_unitario_inversor` foram adicionados a `solar_config` (regra mestra do briefing);
`calc-preview` recebe `{client_id, solar_config}` para resolver a geolocalização do cliente;
número da proposta é sequencial global (não por vendedor); PDF de orçamentos
`itens_individuais` usa um layout simplificado (sem página de análise de retorno solar).
