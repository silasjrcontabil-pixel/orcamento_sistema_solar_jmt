// Paleta de cores para gráficos (recharts), derivada da paleta da marca JMT Solar
// (preto/dourado) + cores de status reservadas (validadas com o skill de dataviz
// contra o fundo escuro dos cards: contraste >= 3:1 em todas). Cores de status
// nunca são usadas para identidade genérica de série — só para os 5 status reais
// de orçamento, sempre acompanhadas do rótulo textual (nunca só a cor).

export const GOLD = '#EFA809';
export const GOLD_SOFT = 'rgba(239, 168, 9, 0.25)';

export const STATUS_COLORS = {
  rascunho: '#8a8a90',
  enviado: '#3b82f6',
  aguardando_resposta: '#f0b429',
  confirmado: '#2fbf71',
  cancelado: '#e5484d',
} as const;

export const CHART_GRID = '#2a2a2e';
export const CHART_AXIS = '#6b6b70';
export const CHART_TEXT = '#9a9a9f';

export const tooltipStyle = {
  contentStyle: {
    background: '#18181b',
    border: '1px solid #2a2a2e',
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: '#f5f5f4', fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: '#EFA809' },
  cursor: { fill: 'rgba(239, 168, 9, 0.08)' },
};
