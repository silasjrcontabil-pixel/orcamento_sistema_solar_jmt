# Instruções — Migração PostgreSQL → MySQL + Deploy HostGator (Plano P)

## Contexto
Este projeto atualmente usa:
- Backend: Python
- Frontend: Next.js
- Banco: PostgreSQL (hospedado no Supabase)

**Objetivo:** migrar o banco de dados de PostgreSQL para MySQL/MariaDB, para que o projeto possa
rodar em hospedagem compartilhada cPanel (Plano P da HostGator), que **não suporta PostgreSQL**
— apenas MySQL/MariaDB está disponível nesse tipo de plano.

Não há dependência de Auth, Storage ou Realtime do Supabase — apenas o banco Postgres é usado.

---

## ETAPA 1 — Auditoria do projeto (fazer primeiro, não pular)

1. Mapear todos os arquivos que acessam o banco de dados:
   - Arquivos de modelos/ORM (ex: `models.py`, `schema.py`)
   - Arquivos de configuração de conexão (`.env`, `settings.py`, `database.py`, `config.py`)
   - Qualquer SQL puro (raw queries) espalhado pelo código
   - Arquivos de migração (ex: pasta `migrations/`, Alembic, Django migrations)

2. Identificar qual biblioteca de acesso a dados está em uso:
   - SQLAlchemy / SQLAlchemy + Alembic
   - Django ORM
   - psycopg2 puro / asyncpg
   - Outro

3. Gerar um relatório resumido (antes de alterar qualquer coisa) listando:
   - Todas as tabelas e seus tipos de coluna atuais
   - Uso de recursos específicos do Postgres: `JSONB`, `UUID`, `ARRAY`, `ENUM` nativo, `SERIAL`,
     `TIMESTAMPTZ`, funções como `ILIKE`, `RETURNING`, CTEs recursivas, window functions,
     extensões (`pgcrypto`, `uuid-ossp`, etc.)
   - Todas as queries SQL puras que não sejam geradas pelo ORM

**Não prosseguir para a Etapa 2 sem antes mostrar esse relatório para revisão.**

---

## ETAPA 2 — Mapeamento de tipos de dados (Postgres → MySQL)

Aplicar esta tabela de conversão ao schema:

| PostgreSQL              | MySQL equivalente                          | Observação |
|--------------------------|---------------------------------------------|------------|
| `SERIAL` / `BIGSERIAL`   | `INT AUTO_INCREMENT` / `BIGINT AUTO_INCREMENT` | |
| `UUID`                   | `CHAR(36)` ou `BINARY(16)`                   | MySQL não tem tipo UUID nativo; gerar UUID na aplicação |
| `JSONB` / `JSON`         | `JSON`                                       | MySQL 5.7+/MariaDB 10.2+ suportam `JSON`, mas sem os operadores do Postgres |
| `TEXT[]` (ARRAY)         | Tabela relacionada (many-to-many) ou `JSON`  | MySQL não tem array nativo |
| `TIMESTAMPTZ`            | `DATETIME` ou `TIMESTAMP`                    | MySQL não guarda timezone; padronizar tudo em UTC na aplicação |
| `BOOLEAN`                | `TINYINT(1)`                                 | MySQL trata boolean como alias de TINYINT |
| `ENUM` nativo do Postgres| `ENUM` do MySQL ou `VARCHAR` + `CHECK`       | Sintaxe diferente, mas existe equivalente |
| `NUMERIC` / `DECIMAL`    | `DECIMAL`                                    | Compatível |
| Funções `ILIKE`          | `LIKE` com `COLLATE ..._ci` (case-insensitive)| |
| `RETURNING`              | Não existe no MySQL                          | Substituir por `SELECT LAST_INSERT_ID()` ou query separada |

---

## ETAPA 3 — Ajustar o backend Python

1. **Driver de conexão:**
   - Remover: `psycopg2` / `psycopg2-binary` / `asyncpg`
   - Adicionar: `PyMySQL` ou `mysqlclient` (para uso síncrono) — se async for necessário, usar `aiomysql`

2. **Se usa SQLAlchemy:**
   - Alterar a `DATABASE_URL` de `postgresql://...` para `mysql+pymysql://...`
   - Revisar todos os `Column(...)` que usam tipos exclusivos do Postgres (ex: `postgresql.UUID`,
     `postgresql.JSONB`, `postgresql.ARRAY`) e trocar pelos tipos genéricos ou específicos do
     MySQL (`sqlalchemy.dialects.mysql`)
   - Rodar `alembic revision --autogenerate` após o ajuste dos models e revisar a migration gerada
     manualmente (autogenerate nem sempre acerta 100% em trocas de dialect)

3. **Se usa Django:**
   - Alterar `DATABASES` em `settings.py` para o backend `django.db.backends.mysql`
   - Instalar `mysqlclient`
   - Rodar `python manage.py makemigrations` e `python manage.py migrate` em um banco de teste
     antes de aplicar em produção
   - Revisar `models.py` em busca de `ArrayField`, `JSONField` com uso de operadores específicos
     do Postgres, e `UUIDField`

4. **Se usa SQL puro:**
   - Reescrever cada query identificada na Etapa 1 usando sintaxe MySQL
   - Trocar `%s` / placeholders conforme o driver escolhido

5. Atualizar variáveis de ambiente (`.env`) com as novas credenciais MySQL (host, porta 3306,
   usuário, senha, nome do banco) — **não usar a mesma variável do Postgres antigo, criar
   `MYSQL_*` novas para evitar confusão durante a transição**

---

## ETAPA 4 — Migração dos dados existentes

1. Exportar os dados atuais do Postgres (Supabase) em formato neutro (CSV por tabela, ou dump SQL)
2. Criar as tabelas no MySQL usando o novo schema convertido (Etapa 2)
3. Importar os dados, tratando conversões necessárias (ex: transformar arrays em linhas de
   tabela relacionada, converter UUID para string, ajustar timestamps para UTC sem timezone)
4. Escrever um script de validação que compare contagem de linhas e alguns registros de amostra
   entre o banco antigo (Postgres) e o novo (MySQL), para garantir integridade

---

## ETAPA 5 — Testes

1. Rodar toda a suíte de testes automatizados do projeto (se houver) apontando para o MySQL local
2. Se não houver testes automatizados, criar ao menos testes manuais cobrindo:
   - Criação, leitura, atualização e exclusão (CRUD) de cada entidade principal
   - Queries mais complexas (relatórios, filtros, joins)
   - Qualquer lógica que dependia de recursos exclusivos do Postgres mapeados na Etapa 1
3. Não prosseguir para deploy sem confirmar que os testes passam

---

## ETAPA 6 — Preparar para deploy no cPanel (Plano P HostGator)

1. Confirmar no cPanel se a ferramenta **"Setup Python App"** está disponível e qual versão de
   Python é suportada
2. Criar o banco de dados MySQL pelo cPanel (**MySQL Databases**), anotar host, nome do banco,
   usuário e senha gerados (geralmente prefixados com o nome do usuário cPanel)
3. Configurar a aplicação Python via "Setup Python App":
   - Apontar para o diretório da aplicação
   - Definir o arquivo de entrada (WSGI/ASGI conforme o framework)
   - Instalar as dependências do `requirements.txt` pelo terminal do cPanel
4. Ajustar CORS e variáveis de ambiente de produção
5. Fazer o build do frontend Next.js (`next build` + export estático, se aplicável) e enviar os
   arquivos para o diretório público (`public_html` ou subpasta configurada)
6. Testar a aplicação completa no ambiente de produção antes de apontar o domínio definitivamente

---

## Regras gerais para o Claude Code seguir durante todo o processo

- Fazer commits pequenos e separados por etapa (schema, driver, queries, migração de dados),
  nunca um commit único gigante
- Nunca apagar ou sobrescrever o banco Postgres original até que o MySQL esteja validado e em
  produção estável por pelo menos alguns dias
- Documentar no README do projeto as mudanças feitas (nova stack de banco, como rodar localmente
  com MySQL, como fazer deploy no cPanel)
- Sinalizar explicitamente qualquer funcionalidade que não tenha equivalente direto no MySQL e
  precise de decisão de produto (não apenas técnica) antes de implementar uma solução alternativa
