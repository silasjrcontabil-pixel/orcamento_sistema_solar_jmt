import type { BudgetItemInput, Client, SolarConfigInput, TipoOrcamento } from '../../../types';

export interface WizardState {
  client: Client | null;
  tipoOrcamento: TipoOrcamento | null;
  solarConfig: Partial<SolarConfigInput>;
  // Sistema completo: só itens extras (parte_ca, mao_obra, homologacao, outro) —
  // painel/inversor são gerados pelo backend a partir de solarConfig.
  itensExtras: BudgetItemInput[];
  // Itens individuais: lista livre montada pelo usuário.
  itensIndividuais: BudgetItemInput[];
  margemLucroPct: number;
  validadeDias: number;
  observacoes: string;
}

export const DEFAULT_WIZARD_STATE: WizardState = {
  client: null,
  tipoOrcamento: null,
  solarConfig: {},
  itensExtras: [],
  itensIndividuais: [],
  margemLucroPct: 40,
  validadeDias: 7,
  observacoes: '',
};
