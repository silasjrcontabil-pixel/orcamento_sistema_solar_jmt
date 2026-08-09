export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '0';
  return value.toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Texto digitável válido em campo decimal pt-BR: dígitos com no máximo uma vírgula ou ponto. */
export function isDecimalInputText(raw: string): boolean {
  return /^\d*[.,]?\d*$/.test(raw);
}

/** Converte texto digitado (vírgula ou ponto como separador) para número. Inválido/vazio vira 0. */
export function parseDecimalInput(raw: string): number {
  const normalizado = raw.trim().replace(',', '.');
  if (normalizado === '' || normalizado === '.') return 0;
  const valor = Number(normalizado);
  return Number.isNaN(valor) ? 0 : valor;
}

/** Texto para exibir um número num campo editável, com vírgula pt-BR. 0 vira campo vazio. */
export function formatDecimalForEdit(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value) || value === 0) return '';
  return String(value).replace('.', ',');
}
