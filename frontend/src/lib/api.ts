// Cliente HTTP central. Todas as chamadas à API do backend passam por aqui.
//
// - Base URL configurável via VITE_API_URL (sem chamadas de rede no nível de módulo,
//   para que `npm run build` funcione mesmo sem o backend no ar).
// - Injeta o JWT salvo no auth store em todo request autenticado.
// - Em 401, limpa a sessão e redireciona para /login.

import type {
  BudgetDetail,
  BudgetFilters,
  BudgetInput,
  BudgetListItem,
  CalcPreviewRequest,
  CalcPreviewResponse,
  CepLookupResult,
  Client,
  ClientFilters,
  ClientInput,
  CnpjLookupResult,
  CurrentUser,
  DashboardEvolucaoPonto,
  DashboardFilters,
  DashboardPorVendedor,
  DashboardSummary,
  EstadosResponse,
  LoginRequest,
  LoginResponse,
  MunicipioOption,
  OrcamentoStatus,
  Lead,
  LeadStatus,
  Product,
  ProductFilters,
  ProductPayload,
  PublicLeadInput,
  UserAccount,
  UserInput,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const AUTH_STORAGE_KEY = 'jmt-solar-auth';

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

function getToken(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { token?: string | null } };
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

function handleUnauthorized() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

/** Erros de validação do FastAPI/Pydantic vêm como `detail: [{loc, msg, type}, ...]` — um
 * JSON.stringify cru disso era mostrado direto pro usuário antes. Monta uma mensagem legível
 * a partir do(s) campo(s) que falharam, com fallback pros formatos mais simples de erro. */
function _mensagemDeErro(data: unknown, status: number): string {
  const detail = (data as { detail?: unknown } | undefined)?.detail;
  if (Array.isArray(detail)) {
    const partes = detail.map((d) => {
      const item = d as { loc?: unknown[]; msg?: string };
      const campo = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : undefined;
      return campo && item.msg ? `${campo}: ${item.msg}` : (item.msg ?? JSON.stringify(item));
    });
    return partes.join(' | ');
  }
  if (typeof detail === 'string') return detail;
  const message = (data as { message?: unknown } | undefined)?.message;
  if (typeof message === 'string') return message;
  return `Erro ${status} ao processar a requisição.`;
}

function buildQuery(params?: object): string {
  if (!params) return '';
  const usp = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    usp.append(key, String(value));
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: object;
  /** Não anexa Authorization (usado só no login). */
  skipAuth?: boolean;
  /** Espera uma resposta binária (ex.: PDF) em vez de JSON. */
  raw?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, skipAuth, raw } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (!skipAuth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api${path}${buildQuery(query)}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError(
      'Não foi possível conectar ao servidor. Verifique sua conexão ou tente novamente mais tarde.',
      0,
      err,
    );
  }

  if (response.status === 401) {
    handleUnauthorized();
    throw new ApiError('Sessão expirada. Faça login novamente.', 401);
  }

  if (raw) {
    if (!response.ok) {
      throw new ApiError('Falha ao processar a requisição.', response.status);
    }
    return (await response.blob()) as unknown as T;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    throw new ApiError(_mensagemDeErro(data, response.status), response.status, data);
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const authApi = {
  login: (payload: LoginRequest) =>
    request<LoginResponse>('/auth/login', { method: 'POST', body: payload, skipAuth: true }),
  me: () => request<CurrentUser>('/auth/me'),
};

// ---------------------------------------------------------------------------
// Geo
// ---------------------------------------------------------------------------

export const geoApi = {
  estados: () => request<EstadosResponse>('/geo/estados'),
  municipios: (uf: string) => request<MunicipioOption[]>('/geo/municipios', { query: { uf } }),
};

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

export const clientsApi = {
  list: (filters?: ClientFilters) => request<Client[]>('/clients', { query: filters }),
  get: (id: number) => request<Client>(`/clients/${id}`),
  create: (payload: ClientInput) => request<Client>('/clients', { method: 'POST', body: payload }),
  update: (id: number, payload: ClientInput) =>
    request<Client>(`/clients/${id}`, { method: 'PUT', body: payload }),
  lookupCnpj: (cnpj: string) => request<CnpjLookupResult>(`/clients/lookup/cnpj/${cnpj}`),
  lookupCep: (cep: string) => request<CepLookupResult>(`/clients/lookup/cep/${cep}`),
};

// ---------------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------------

export const productsApi = {
  list: (filters?: ProductFilters) => request<Product[]>('/products', { query: filters }),
  get: (id: number) => request<Product>(`/products/${id}`),
  create: (payload: ProductPayload) => request<Product>('/products', { method: 'POST', body: payload }),
  update: (id: number, payload: ProductPayload) =>
    request<Product>(`/products/${id}`, { method: 'PUT', body: payload }),
};

// ---------------------------------------------------------------------------
// Orçamentos
// ---------------------------------------------------------------------------

export const budgetsApi = {
  list: (filters?: BudgetFilters) => request<BudgetListItem[]>('/budgets', { query: filters }),
  get: (id: number) => request<BudgetDetail>(`/budgets/${id}`),
  create: (payload: BudgetInput) => request<BudgetDetail>('/budgets', { method: 'POST', body: payload }),
  update: (id: number, payload: BudgetInput) =>
    request<BudgetDetail>(`/budgets/${id}`, { method: 'PUT', body: payload }),
  updateStatus: (id: number, status: OrcamentoStatus) =>
    request<BudgetDetail>(`/budgets/${id}/status`, { method: 'PATCH', body: { status } }),
  calcPreview: (payload: CalcPreviewRequest) =>
    request<CalcPreviewResponse>('/budgets/calc-preview', { method: 'POST', body: payload }),
  pdfUrl: (id: number) => `${API_BASE}/api/budgets/${id}/pdf`,
  downloadPdf: (id: number) => request<Blob>(`/budgets/${id}/pdf`, { raw: true }),
};

// ---------------------------------------------------------------------------
// Usuários (vendedores)
// ---------------------------------------------------------------------------

export const usersApi = {
  list: () => request<UserAccount[]>('/users'),
  create: (payload: UserInput) => request<UserAccount>('/users', { method: 'POST', body: payload }),
  updatePassword: (id: number, senha: string) =>
    request<void>(`/users/${id}/senha`, { method: 'PUT', body: { senha } }),
  updateStatus: (id: number, ativo: boolean) =>
    request<UserAccount>(`/users/${id}/status`, { method: 'PUT', body: { ativo } }),
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export const dashboardApi = {
  summary: (filters?: DashboardFilters) =>
    request<DashboardSummary>('/dashboard/summary', { query: filters }),
  porVendedor: () => request<DashboardPorVendedor[]>('/dashboard/por_vendedor'),
  evolucao: (meses = 12) =>
    request<DashboardEvolucaoPonto[]>('/dashboard/evolucao', { query: { meses } }),
};

// ---------------------------------------------------------------------------
// Leads públicos (formulário de contato da página institucional, sem login)
// ---------------------------------------------------------------------------

export const publicLeadsApi = {
  create: (payload: PublicLeadInput) =>
    request<{ id: number }>('/public/leads', { method: 'POST', body: payload, skipAuth: true }),
};

// ---------------------------------------------------------------------------
// Pedidos do site (gestão interna dos leads públicos, autenticado)
// ---------------------------------------------------------------------------

export const leadsApi = {
  list: () => request<Lead[]>('/leads'),
  updateStatus: (id: number, status: LeadStatus) =>
    request<Lead>(`/leads/${id}/status`, { method: 'PUT', body: { status } }),
};

export { getToken, AUTH_STORAGE_KEY };
