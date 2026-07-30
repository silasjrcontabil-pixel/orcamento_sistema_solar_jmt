# JMT Solar — Orçamentos (Frontend)

Frontend do sistema interno de orçamentos de energia solar da JMT Solar. React + Vite +
TypeScript + Tailwind CSS, com PWA (instalável em Android/iOS). Consome a API FastAPI
descrita em `../API_CONTRACT.md`.

## Stack

- React 19 + React Router 7 (rotas protegidas por autenticação JWT)
- TypeScript
- Tailwind CSS 3 (tema preto/dourado da marca JMT Solar)
- Zustand (store de sessão, persistido em `localStorage`)
- Recharts (gráficos do dashboard)
- PWA: `public/manifest.json` + `public/sw.js` (service worker simples de app-shell)

## Rodando localmente

Pré-requisitos: Node 18+ e o backend rodando (ou não — o app builda e roda mesmo sem o
backend no ar; as chamadas de API só falham em runtime, não no build).

```bash
npm install
cp .env.example .env   # ajuste VITE_API_URL se necessário
npm run dev
```

O app sobe em `http://localhost:5174`. Configure `VITE_API_URL` no `.env` apontando para
a URL base do backend (sem `/api` no final, ex.: `http://localhost:8000`).

## Build de produção

```bash
npm run build   # gera ./dist — roda type-check (tsc -b) + vite build
npm run preview # serve o build localmente para conferência
```

## Variáveis de ambiente

| Variável        | Descrição                                         | Exemplo                  |
|------------------|----------------------------------------------------|---------------------------|
| `VITE_API_URL`   | URL base do backend FastAPI (sem `/api` no final)  | `https://api.jmtsolar.com` |

## Deploy

### Vercel

O projeto já inclui `vercel.json` com fallback de SPA (todas as rotas caem em
`index.html`, necessário para o React Router funcionar em refresh/deep-link).

1. Importe o repositório na Vercel, apontando o **Root Directory** para `frontend/`.
2. Build command: `npm run build` — Output directory: `dist` (detectado automaticamente
   pelo preset Vite).
3. Configure a variável de ambiente `VITE_API_URL` no painel do projeto (Settings →
   Environment Variables).

### Netlify

Alternativamente, `netlify.toml` já configura build (`npm run build`), publish dir
(`dist`) e o redirect de SPA. Basta apontar o site para a pasta `frontend/` e definir
`VITE_API_URL` nas variáveis de ambiente do site.

## PWA

- `public/manifest.json`: nome "JMT Solar Orçamentos", ícones gerados a partir do
  logotipo oficial (`public/icons/`), tema preto/dourado.
- `public/sw.js`: service worker registrado em produção (`src/main.tsx`), com cache
  stale-while-revalidate para assets estáticos e network-first para navegação. Nunca
  cacheia chamadas `/api/*`.
- No Android (Chrome): menu → "Adicionar à tela inicial". No iPhone (Safari): botão de
  compartilhar → "Adicionar à Tela de Início".

## Estrutura

```
src/
  components/    Card, Input, Select, Textarea, Button, StatusBadge, Layout, ItemsEditor...
  lib/           api.ts (cliente HTTP), format.ts, chartColors.ts, useDebounce.ts
  store/         auth.ts (zustand + persist)
  types/         tipos espelhando API_CONTRACT.md
  pages/
    Login.tsx, Dashboard.tsx, NotFound.tsx
    clients/     List.tsx, Form.tsx
    products/    List.tsx, Form.tsx (campos dinâmicos por tipo de produto)
    budgets/     List.tsx, Detail.tsx, Wizard.tsx + wizard/ (etapas do assistente)
```

## Decisões de UX/contrato não 100% especificadas

Ver observações completas no relatório de entrega, principalmente sobre:

- `POST /api/budgets/calc-preview`: o contrato descreve o body como "mesmo body de
  `solar_config`", mas o dimensionamento depende de lat/lon do município do cliente
  (não presente nesse shape isoladamente). O frontend envia `client_id` junto (o
  cliente já foi selecionado no passo 1 do wizard nesse ponto do fluxo).
- Custo unitário de painel/inversor: o contrato de `solar_config` não lista
  `custo_unitario_painel`/`custo_unitario_inversor`, mas a regra de negócio do
  briefing (seção 2.4) exige que o usuário informe esses custos para o cálculo de
  `custo_total`/`preco_final` funcionar (não há campo de preço em `products`). O
  frontend inclui esses dois campos como adição aditiva ao shape de `solar_config`.
