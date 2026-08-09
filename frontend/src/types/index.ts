// Tipos espelhando exatamente o contrato de API em API_CONTRACT.md.
// Qualquer mudança de shape deve ser refletida ali antes de mudar aqui.

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type ProdutoTipo = 'painel_solar' | 'inversor' | 'outro';
export type ProdutoStatus = 'ativo' | 'desativado';
export type TipoResidencia = 'Residencial' | 'Comercial' | 'Industrial' | 'Rural';
export type TipoOrcamento = 'sistema_completo' | 'itens_individuais';
export type OrcamentoStatus =
  | 'rascunho'
  | 'enviado'
  | 'aguardando_resposta'
  | 'confirmado'
  | 'cancelado';
export type TipoItem = 'painel' | 'inversor' | 'parte_ca' | 'mao_obra' | 'homologacao' | 'outro';
export type TipoTelhado =
  | 'Cerâmico (Francês) / Base Metálica'
  | 'Cerâmico (Francês) / Base Madeira'
  | 'Fibrocimento / Base Metálica'
  | 'Fibrocimento / Base Madeira'
  | 'Mini Trilho / Baixo'
  | 'Mini Trilho / Alto'
  | 'Fixação em L / Base Metálica'
  | 'Solo'
  | 'Laje';
export type Orientacao = 'Norte' | 'Nordeste' | 'Noroeste' | 'Leste/Oeste';

export const PRODUTO_TIPOS: { value: ProdutoTipo; label: string }[] = [
  { value: 'painel_solar', label: 'Painel Solar' },
  { value: 'inversor', label: 'Inversor' },
  { value: 'outro', label: 'Outro' },
];

export const PRODUTO_STATUS: { value: ProdutoStatus; label: string }[] = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'desativado', label: 'Desativado' },
];

export const TIPO_RESIDENCIA: TipoResidencia[] = [
  'Residencial',
  'Comercial',
  'Industrial',
  'Rural',
];

export const TIPO_TELHADO: TipoTelhado[] = [
  'Cerâmico (Francês) / Base Metálica',
  'Cerâmico (Francês) / Base Madeira',
  'Fibrocimento / Base Metálica',
  'Fibrocimento / Base Madeira',
  'Mini Trilho / Baixo',
  'Mini Trilho / Alto',
  'Fixação em L / Base Metálica',
  'Solo',
  'Laje',
];

export const ORIENTACAO: Orientacao[] = ['Norte', 'Nordeste', 'Noroeste', 'Leste/Oeste'];

export const DISTRIBUIDORAS = [
  'Enel SP',
  'CPFL',
  'Energisa',
  'Cemig',
  'Equatorial',
  'Coelba',
  'Outro',
];

export const TIPO_ITEM: { value: TipoItem; label: string }[] = [
  { value: 'painel', label: 'Painel Solar' },
  { value: 'inversor', label: 'Inversor' },
  { value: 'parte_ca', label: 'Parte CA' },
  { value: 'mao_obra', label: 'Mão de Obra' },
  { value: 'homologacao', label: 'Homologação/Projeto' },
  { value: 'outro', label: 'Outro' },
];

export const ORCAMENTO_STATUS_LABEL: Record<OrcamentoStatus, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aguardando_resposta: 'Aguardando Resposta',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
};

// Transições permitidas de status, conforme o contrato de API.
export const ORCAMENTO_TRANSICOES: Record<OrcamentoStatus, OrcamentoStatus[]> = {
  rascunho: ['enviado', 'cancelado'],
  enviado: ['aguardando_resposta', 'cancelado'],
  aguardando_resposta: ['confirmado', 'cancelado'],
  confirmado: ['cancelado'],
  cancelado: [],
};

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface CurrentUser {
  id: number;
  nome: string;
  username: string;
}

// ---------------------------------------------------------------------------
// Geo
// ---------------------------------------------------------------------------

export interface EstadoInfo {
  sigla: string;
  nome: string;
}

export type EstadosResponse = Record<string, EstadoInfo>;

export interface MunicipioOption {
  cod_ibge: string;
  nome: string;
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

export interface Client {
  id: number;
  nome: string;
  ddd: string;
  telefone: string;
  cnpj_cpf?: string | null;
  email?: string | null;
  cep?: string | null;
  municipio_cod_ibge: string;
  municipio_nome?: string | null;
  estado_uf: string;
  endereco: string;
  tipo_residencia: TipoResidencia;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
}

export type ClientInput = Omit<
  Client,
  'id' | 'municipio_nome' | 'created_by' | 'created_at' | 'updated_at'
>;

export interface ClientFilters {
  search?: string;
  municipio?: string;
  estado?: string;
}

export interface CnpjLookupResult {
  nome: string;
  ddd?: string | null;
  telefone?: string | null;
  email?: string | null;
  cep?: string | null;
  endereco?: string | null;
  estado_uf?: string | null;
  municipio_cod_ibge?: string | null;
  municipio_nome?: string | null;
}

export interface CepLookupResult {
  cep: string;
  endereco?: string | null;
  estado_uf?: string | null;
  municipio_cod_ibge?: string | null;
  municipio_nome?: string | null;
}

// ---------------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------------

export interface PainelSolarSpecs {
  composicao_estrutura: string;
  potencia_wp: number;
  marca?: string | null;
  altura?: number | null;
  largura?: number | null;
  peso?: number | null;
}

export interface InversorSpecs {
  quantidade_kw: number;
}

export interface OutroSpecs {
  ano_fabricacao?: number | null;
}

export interface Product {
  id: number;
  tipo: ProdutoTipo;
  nome: string;
  modelo?: string | null;
  marca?: string | null;
  status: ProdutoStatus;
  specs: PainelSolarSpecs | InversorSpecs | OutroSpecs | Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface ProductInput {
  tipo: ProdutoTipo;
  nome: string;
  modelo?: string | null;
  marca?: string | null;
  status: ProdutoStatus;
  // specs achatado no formulário; convertido para o shape específico ao enviar.
  composicao_estrutura?: string;
  potencia_wp?: number;
  altura?: number | null;
  largura?: number | null;
  peso?: number | null;
  quantidade_kw?: number;
  ano_fabricacao?: number | null;
}

// Corpo efetivamente enviado ao backend (montado por tipo a partir do
// ProductInput achatado do formulário — ver pages/products/Form.tsx#buildPayload).
export type ProductPayload = {
  tipo: ProdutoTipo;
  nome: string;
  status: ProdutoStatus;
} & Record<string, unknown>;

export interface ProductFilters {
  tipo?: ProdutoTipo;
  status?: ProdutoStatus;
}

// ---------------------------------------------------------------------------
// Orçamentos
// ---------------------------------------------------------------------------

export interface SolarConfigInput {
  consumo_mensal_kwh: number;
  valor_conta: number;
  tipo_telhado: TipoTelhado;
  orientacao: Orientacao;
  distribuidora: string;
  area_disponivel_m2?: number | null;
  painel_product_id: number;
  potencia_wp_override?: number | null;
  qtd_paineis_override?: number | null;
  inversor_product_id: number;
  qtd_inversores_override?: number | null;
  observacoes?: string;
  // Campos NÃO listados explicitamente em API_CONTRACT.md § Orçamentos, mas
  // necessários para fechar a "regra master" do briefing (2.4): o custo
  // unitário de painel/inversor precisa ser informado pelo usuário em cada
  // orçamento para que `custo_total`/`preco_final` sejam calculáveis, já que
  // `products` não tem campo de preço. Adição aditiva (não remove/renomeia
  // nada do contrato) — sinalizada no relatório final para alinhar com o
  // backend, que enfrenta a mesma lacuna.
  custo_unitario_painel: number;
  custo_unitario_inversor: number;
}

export interface SolarConfig extends SolarConfigInput {
  potencia_sistema_kwp: number;
  qtd_paineis: number;
  geracao_estimada_kwh: number;
  qtd_inversores: number;
}

export interface BudgetItemInput {
  tipo_item: TipoItem;
  product_id?: number | null;
  descricao: string;
  quantidade: number;
  custo_unitario: number;
}

export interface BudgetItem extends BudgetItemInput {
  id: number;
  custo_total: number;
}

export interface BudgetInput {
  client_id: number;
  tipo_orcamento: TipoOrcamento;
  margem_lucro_pct?: number;
  validade_dias?: number;
  observacoes?: string;
  solar_config?: SolarConfigInput;
  itens?: BudgetItemInput[];
}

export interface BudgetListItem {
  id: number;
  numero_proposta: number | string;
  cliente_nome: string;
  vendedor_nome: string;
  status: OrcamentoStatus;
  valor_final: number;
  dias_parado: number | null;
  created_at: string;
}

export interface BudgetStatusHistoryEntry {
  status_anterior: OrcamentoStatus | null;
  status_novo: OrcamentoStatus;
  changed_by: number;
  changed_by_nome: string;
  changed_at: string;
}

export interface BudgetEditHistoryEntry {
  edited_by: number;
  edited_by_nome: string;
  edited_at: string;
}

// Projeção reduzida do cliente embutida no detalhe do orçamento (API_CONTRACT.md:
// GET /api/budgets/{id} não retorna o Client completo, só os campos usados na proposta).
export interface ClientMini {
  id: number;
  nome: string;
  telefone: string;
  ddd: string;
  email?: string | null;
  endereco: string;
  municipio_nome: string;
  estado_uf: string;
}

export interface VendedorMini {
  id: number;
  nome: string;
}

export interface BudgetDetail {
  id: number;
  numero_proposta: number | string;
  client: ClientMini;
  vendedor: VendedorMini;
  tipo_orcamento: TipoOrcamento;
  status: OrcamentoStatus;
  margem_lucro_pct: number;
  validade_dias: number;
  observacoes?: string | null;
  solar_config?: SolarConfig | null;
  itens: BudgetItem[];
  custo_total: number;
  preco_final: number;
  status_history: BudgetStatusHistoryEntry[];
  edit_history: BudgetEditHistoryEntry[];
  created_at: string;
  updated_at?: string;
}

export interface BudgetFilters {
  vendedor_id?: number;
  status?: OrcamentoStatus;
  data_inicio?: string;
  data_fim?: string;
  cliente_id?: number;
}

// O contrato (API_CONTRACT.md) define o body de /budgets/calc-preview como
// `{client_id, solar_config: {...}}` — client_id resolve lat/lon do município do
// cliente já selecionado no passo 1 do wizard (não presente em solar_config isoladamente).
export interface CalcPreviewRequest {
  client_id: number;
  solar_config: SolarConfigInput;
}

export interface CalcPreviewResponse {
  qtd_paineis: number;
  qtd_paineis_sugerido: number;
  potencia_sistema_kwp: number;
  // Nulo enquanto o inversor ainda não foi selecionado no wizard (não é necessário
  // para dimensionar os painéis).
  qtd_inversores: number | null;
  qtd_inversores_sugerido: number | null;
  geracao_estimada_kwh: number;
  radiacao_media_regiao: number;
  radiacao_ajustada: number;
  municipio_fallback_usado: boolean;
}

// ---------------------------------------------------------------------------
// Usuários (vendedores)
// ---------------------------------------------------------------------------

export interface UserAccount {
  id: number;
  nome: string;
  username: string;
  ativo: boolean;
  created_at: string;
}

export interface UserInput {
  nome: string;
  senha: string;
  username?: string;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface DashboardSummary {
  total_orcamentos: number;
  valor_total: number;
  orcamentos_realizados: number;
  valor_realizado: number;
  orcamentos_nao_realizados: number;
  valor_nao_realizado: number;
  por_status: Partial<Record<OrcamentoStatus, number>>;
  tempo_medio_resposta_dias: number | null;
}

export interface DashboardPorVendedor {
  vendedor_id: number;
  vendedor_nome: string;
  total_orcamentos: number;
  confirmados: number;
  taxa_conversao: number;
  tempo_medio_resposta_dias: number | null;
}

export interface DashboardEvolucaoPonto {
  mes: string;
  total_orcamentos: number;
  valor_total: number;
}

export interface DashboardFilters {
  vendedor_id?: number;
  data_inicio?: string;
  data_fim?: string;
}
