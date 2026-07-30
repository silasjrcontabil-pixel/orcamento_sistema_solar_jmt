# Contrato de API — Sistema de Orçamentos JMT Solar

Contrato fechado entre backend (FastAPI) e frontend (React), para os dois lados serem
construídos em paralelo sem depender um do outro. Base URL do backend: `/api`.

Auth: JWT Bearer. Todos os endpoints abaixo (exceto `/api/auth/login`) exigem
`Authorization: Bearer <token>`. Não há diferenciação de permissões entre os 3 usuários.

## Enums

- `ProdutoTipo`: `painel_solar` | `inversor` | `outro`
- `ProdutoStatus`: `ativo` | `desativado`
- `TipoResidencia`: `Residencial` | `Comercial` | `Industrial` | `Rural`
- `TipoOrcamento`: `sistema_completo` | `itens_individuais`
- `OrcamentoStatus`: `rascunho` | `enviado` | `aguardando_resposta` | `confirmado` | `cancelado`
- `TipoItem`: `painel` | `inversor` | `parte_ca` | `mao_obra` | `homologacao` | `outro`
- `TipoTelhado`: `Cerâmico (Francês)` | `Fibrocimento` | `Metálico` | `Laje` | `Solo`
- `Orientacao`: `Norte` | `Nordeste` | `Noroeste` | `Leste/Oeste`

## Auth

- `POST /api/auth/login` — body `{username, password}` → `{access_token, token_type: "bearer"}`
- `GET /api/auth/me` → `{id, nome, username}`

## Geo

- `GET /api/geo/estados` → `{[codigo]: {sigla, nome}}` (espelha `estados.json`)
- `GET /api/geo/municipios?uf=SP` → `[{cod_ibge, nome}]` (filtra `municipios_geo.json` por UF)

## Clientes

- `GET /api/clients?search=&municipio=&estado=` → lista
- `POST /api/clients` / `GET /api/clients/{id}` / `PUT /api/clients/{id}`
- Body: `{nome, ddd, telefone, cnpj_cpf?, email?, cep?, municipio_cod_ibge, estado_uf,
  endereco, tipo_residencia}`. Obrigatórios: nome, ddd, telefone, municipio_cod_ibge,
  estado_uf, endereco, tipo_residencia.
- Sem DELETE (clientes não são excluídos, só editados).

## Produtos

- `GET /api/products?tipo=&status=` → lista
- `POST /api/products` / `GET /api/products/{id}` / `PUT /api/products/{id}`
- Body varia por `tipo` (validação server-side):
  - `painel_solar`: obrigatórios `nome, modelo, composicao_estrutura, potencia_wp, status`;
    opcionais `marca, altura, largura, peso`.
  - `inversor`: obrigatórios `nome, modelo, quantidade_kw, status` (todos os campos listados
    no briefing são obrigatórios).
  - `outro`: obrigatórios `nome, marca, status`; opcionais `modelo, ano_fabricacao`.
- Sem DELETE — só `status=desativado` (produto desativado não aparece nos seletores de
  orçamento novo, mas segue existindo em orçamentos já criados).

## Orçamentos

- `GET /api/budgets?vendedor_id=&status=&data_inicio=&data_fim=&cliente_id=` → lista resumida
  (id, numero_proposta, cliente_nome, vendedor_nome, status, valor_final, created_at)
- `POST /api/budgets` → cria orçamento. Body:
  ```
  {
    client_id, tipo_orcamento, margem_lucro_pct?, validade_dias?, observacoes?,
    solar_config?: {   // obrigatório se tipo_orcamento = sistema_completo
      consumo_mensal_kwh, valor_conta, tipo_telhado, orientacao, distribuidora,
      area_disponivel_m2?, painel_product_id, potencia_wp_override?,
      qtd_paineis_override?, inversor_product_id, qtd_inversores_override?,
      custo_unitario_painel, custo_unitario_inversor
      // custo_unitario_painel/custo_unitario_inversor: regra mestra do briefing §2.4 —
      // o produto (catálogo) não tem preço; o custo unitário de placa/inversor é
      // informado pelo usuário em cada orçamento. Usados para gerar os budget_items
      // de painel/inversor automaticamente (quantidade * custo_unitario).
    },
    itens?: [{ tipo_item, product_id?, descricao, quantidade, custo_unitario }]
    // itens é usado direto quando tipo_orcamento = itens_individuais;
    // quando sistema_completo, o backend gera os itens de painel/inversor
    // automaticamente a partir de solar_config e o cliente só adiciona itens
    // extras (parte_ca, mao_obra, homologacao) nesta lista.
  }
  ```
- `GET /api/budgets/{id}` → detalhe completo (cliente, vendedor, solar_config se houver,
  itens, totais calculados: `custo_total`, `preco_final`, histórico de status resumido)
- `PUT /api/budgets/{id}` → edita (mesmo shape do POST); recalcula totais
- `PATCH /api/budgets/{id}/status` → body `{status}`; transições permitidas:
  rascunho→enviado→aguardando_resposta→confirmado, e qualquer status→cancelado.
  Sem endpoint de delete.
- `POST /api/budgets/calc-preview` → body `{client_id, solar_config: {...como acima}}`
  (client_id é necessário para resolver lat/lon do município do cliente já escolhido no
  wizard; sem precisar criar o orçamento ainda), retorna `{qtd_paineis,
  potencia_sistema_kwp, qtd_inversores, geracao_estimada_kwh, radiacao_media_regiao,
  radiacao_ajustada}` — usado pelo wizard do frontend para mostrar o dimensionamento em
  tempo real conforme o usuário digita.
- `GET /api/budgets/{id}/pdf` → retorna o PDF (`application/pdf`) da proposta.

## Dashboard

- `GET /api/dashboard/summary?vendedor_id=&data_inicio=&data_fim=` →
  `{total_orcamentos, valor_total, por_status: {status: count}, tempo_medio_resposta_dias}`
- `GET /api/dashboard/por_vendedor` → `[{vendedor_id, vendedor_nome, total_orcamentos,
  confirmados, taxa_conversao, tempo_medio_resposta_dias}]`
- `GET /api/dashboard/evolucao?meses=12` → série temporal de orçamentos/valor por mês

## Motor de cálculo solar (regra de negócio, deve viver em `services/solar_calc.py`)

Dado `municipio_cod_ibge` (lat/lon via `municipios_geo.json`), `orientacao`,
`consumo_mensal_kwh`, `potencia_wp` do painel escolhido:

1. `annual = nearest neighbor lookup em irradiancia.csv por (lat, lon)` (coluna `ANNUAL`,
   kWh/m²/ano)
2. `hsp = annual / 1000`
3. `radiacao_media_regiao = hsp * 30 * 0.80` (kWh/kWp/mês)
4. `fator_orientacao`: Norte=1.00, Nordeste=0.97, Noroeste=0.97, "Leste/Oeste"=0.90
5. `radiacao_ajustada = radiacao_media_regiao * fator_orientacao`
6. `qtd_paineis = ceil(consumo_mensal_kwh / (radiacao_ajustada * potencia_wp / 1000))`
   (mínimo 1; se usuário informar `qtd_paineis_override`, usar o valor informado sem
   recalcular, mas ainda retornar o valor sugerido para referência)
7. `potencia_sistema_kwp = qtd_paineis * potencia_wp / 1000`
8. `qtd_inversores = ceil(potencia_sistema_kwp / quantidade_kw_inversor)` (mínimo 1, editável)
9. `geracao_estimada_kwh = qtd_paineis * (potencia_wp / 1000) * radiacao_ajustada`

Se `municipio_cod_ibge` não existir em `municipios_geo.json` (cobertura ~98.5%, alguns
municípios faltam na planilha fonte), usar o município mais próximo do mesmo `estado_uf`
como fallback (nunca deixar o cálculo quebrar por falta de dado geográfico).

Custos (tanto para `sistema_completo` quanto `itens_individuais`):
`custo_total = sum(item.quantidade * item.custo_unitario for item in itens)`
`preco_final = custo_total * (1 + margem_lucro_pct / 100)`

## PDF

`GET /api/budgets/{id}/pdf` gera um PDF com 4 seções replicando
`Dados_Marca_Empresa/Exemplo de Proposta.pdf`: capa (nome do sistema/kWp, investimento,
retorno, economia/ano), dados do cliente + dimensionamento + equipamentos + investimento,
análise de retorno (economia mensal/anual, ROI, gráfico de barras de economia acumulada em
CSS/HTML, gráfico de linha de evolução), garantias/condições comerciais + projeção
financeira ano a ano + observações. Tema: fundo preto (#0a0a0a / #111), dourado #EFA809
como cor de destaque, logo em `Dados_Marca_Empresa/Logotipo.jpeg`.
