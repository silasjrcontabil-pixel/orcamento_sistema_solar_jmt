import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { dashboardApi } from '../lib/api';
import type {
  DashboardEvolucaoPonto,
  DashboardPorVendedor,
  DashboardSummary,
  OrcamentoStatus,
} from '../types';
import { ORCAMENTO_STATUS_LABEL } from '../types';
import { Card } from '../components/Card';
import { StatBox } from '../components/StatBox';
import { Select } from '../components/Select';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { formatCurrency, formatNumber } from '../lib/format';
import { CHART_AXIS, CHART_GRID, CHART_TEXT, GOLD, STATUS_COLORS, tooltipStyle } from '../lib/chartColors';

const STATUS_ORDER: OrcamentoStatus[] = [
  'rascunho',
  'enviado',
  'aguardando_resposta',
  'confirmado',
  'cancelado',
];

export function Dashboard() {
  const [vendedorId, setVendedorId] = useState<string>('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [porVendedor, setPorVendedor] = useState<DashboardPorVendedor[]>([]);
  const [evolucao, setEvolucao] = useState<DashboardEvolucaoPonto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboardApi
      .porVendedor()
      .then(setPorVendedor)
      .catch(() => setPorVendedor([]));
    dashboardApi
      .evolucao(12)
      .then(setEvolucao)
      .catch(() => setEvolucao([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    dashboardApi
      .summary({
        vendedor_id: vendedorId ? Number(vendedorId) : undefined,
        data_inicio: dataInicio || undefined,
        data_fim: dataFim || undefined,
      })
      .then(setSummary)
      .catch(() => setError('Não foi possível carregar o resumo do dashboard.'))
      .finally(() => setLoading(false));
  }, [vendedorId, dataInicio, dataFim]);

  const taxaConversaoGeral = useMemo(() => {
    if (!summary || !summary.total_orcamentos) return 0;
    const confirmados = summary.por_status.confirmado ?? 0;
    return (confirmados / summary.total_orcamentos) * 100;
  }, [summary]);

  const maxStatusCount = useMemo(() => {
    if (!summary) return 1;
    return Math.max(1, ...STATUS_ORDER.map((s) => summary.por_status[s] ?? 0));
  }, [summary]);

  function clearFilters() {
    setVendedorId('');
    setDataInicio('');
    setDataFim('');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-extrabold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral dos orçamentos, filtrada por vendedor e período.
        </p>
      </div>

      {/* Filtros */}
      <Card goldTop={false} className="!bg-background-soft">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 items-end">
          <Select
            label="Vendedor"
            value={vendedorId}
            onChange={(e) => setVendedorId(e.target.value)}
          >
            <option value="">Todos os vendedores</option>
            {porVendedor.map((v) => (
              <option key={v.vendedor_id} value={v.vendedor_id}>
                {v.vendedor_nome}
              </option>
            ))}
          </Select>
          <Input
            label="Data início"
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
          <Input
            label="Data fim"
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
          <Button variant="secondary" onClick={clearFilters} type="button">
            Limpar filtros
          </Button>
        </div>
      </Card>

      <ErrorBanner message={error} />

      {loading && !summary ? (
        <Spinner />
      ) : (
        <>
          {/* Stat tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatBox label="Total de orçamentos" value={formatNumber(summary?.total_orcamentos)} />
            <StatBox
              label="Valor total"
              value={formatCurrency(summary?.valor_total)}
              hint="Não conta orçamentos cancelados"
            />
            <StatBox label="Taxa de conversão" value={formatNumber(taxaConversaoGeral, 1)} suffix="%" />
            <StatBox
              label="Tempo médio de resposta"
              value={formatNumber(summary?.tempo_medio_resposta_dias ?? 0, 1)}
              suffix="dias"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatBox
              label="Orçamentos realizados"
              value={formatCurrency(summary?.valor_realizado)}
              valueClassName="text-success"
              hint={`${formatNumber(summary?.orcamentos_realizados)} orçamento(s) confirmado(s)`}
            />
            <StatBox
              label="Orçamentos não realizados"
              value={formatCurrency(summary?.valor_nao_realizado)}
              valueClassName="text-danger"
              hint={`${formatNumber(summary?.orcamentos_nao_realizados)} orçamento(s) cancelado(s)`}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Por status */}
            <Card title="Orçamentos por status" subtitle="Distribuição do total no período filtrado.">
              <div className="space-y-3">
                {STATUS_ORDER.map((status) => {
                  const count = summary?.por_status[status] ?? 0;
                  const pct = (count / maxStatusCount) * 100;
                  return (
                    <div key={status} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">
                          {ORCAMENTO_STATUS_LABEL[status]}
                        </span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: STATUS_COLORS[status] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Por vendedor */}
            <Card title="Taxa de conversão por vendedor" subtitle="Confirmados sobre total de orçamentos.">
              {porVendedor.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados de vendedores.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={porVendedor} layout="vertical" margin={{ left: 8 }}>
                      <CartesianGrid horizontal={false} stroke={CHART_GRID} />
                      <XAxis
                        type="number"
                        stroke={CHART_AXIS}
                        tick={{ fill: CHART_TEXT, fontSize: 11 }}
                        unit="%"
                      />
                      <YAxis
                        type="category"
                        dataKey="vendedor_nome"
                        stroke={CHART_AXIS}
                        tick={{ fill: CHART_TEXT, fontSize: 11 }}
                        width={100}
                      />
                      <Tooltip
                        {...tooltipStyle}
                        formatter={(v) => [`${Number(v).toFixed(1)}%`, 'Conversão']}
                      />
                      <Bar dataKey="taxa_conversao" fill={GOLD} radius={[0, 4, 4, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Evolução - quantidade */}
            <Card title="Orçamentos por mês" subtitle="Evolução da quantidade de orçamentos criados.">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evolucao}>
                    <CartesianGrid vertical={false} stroke={CHART_GRID} />
                    <XAxis dataKey="mes" stroke={CHART_AXIS} tick={{ fill: CHART_TEXT, fontSize: 11 }} />
                    <YAxis stroke={CHART_AXIS} tick={{ fill: CHART_TEXT, fontSize: 11 }} allowDecimals={false} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="total_orcamentos" name="Orçamentos" fill={GOLD} radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Evolução - valor */}
            <Card title="Valor total por mês" subtitle="Evolução do valor total orçado (R$).">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolucao}>
                    <CartesianGrid vertical={false} stroke={CHART_GRID} />
                    <XAxis dataKey="mes" stroke={CHART_AXIS} tick={{ fill: CHART_TEXT, fontSize: 11 }} />
                    <YAxis
                      stroke={CHART_AXIS}
                      tick={{ fill: CHART_TEXT, fontSize: 11 }}
                      tickFormatter={(v) => formatNumber(v)}
                    />
                    <Tooltip {...tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'Valor total']} />
                    <Line
                      type="monotone"
                      dataKey="valor_total"
                      name="Valor total"
                      stroke={GOLD}
                      strokeWidth={2}
                      dot={{ r: 3, fill: GOLD }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Tabela por vendedor */}
          <Card title="Detalhamento por vendedor">
            {porVendedor.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados de vendedores.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-2 pr-4 font-semibold">Vendedor</th>
                      <th className="py-2 pr-4 font-semibold">Total</th>
                      <th className="py-2 pr-4 font-semibold">Confirmados</th>
                      <th className="py-2 pr-4 font-semibold">Conversão</th>
                      <th className="py-2 pr-4 font-semibold">Tempo médio resposta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porVendedor.map((v) => (
                      <tr key={v.vendedor_id} className="border-b border-border/60 last:border-0">
                        <td className="py-2.5 pr-4 font-medium">{v.vendedor_nome}</td>
                        <td className="py-2.5 pr-4">{v.total_orcamentos}</td>
                        <td className="py-2.5 pr-4">{v.confirmados}</td>
                        <td className="py-2.5 pr-4 text-primary font-semibold">
                          {v.taxa_conversao.toFixed(1)}%
                        </td>
                        <td className="py-2.5 pr-4">
                          {v.tempo_medio_resposta_dias != null
                            ? `${v.tempo_medio_resposta_dias.toFixed(1)} dias`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
