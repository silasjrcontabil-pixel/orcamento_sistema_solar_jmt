import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { budgetsApi, clientsApi, dashboardApi } from '../../lib/api';
import type { BudgetListItem, Client, DashboardPorVendedor, OrcamentoStatus } from '../../types';
import { ORCAMENTO_STATUS_LABEL } from '../../types';
import { Card } from '../../components/Card';
import { Select } from '../../components/Select';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Spinner } from '../../components/Spinner';
import { EmptyState } from '../../components/EmptyState';
import { ErrorBanner } from '../../components/ErrorBanner';
import { StatusBadge } from '../../components/StatusBadge';
import { formatCurrency, formatDate } from '../../lib/format';

export function BudgetsList() {
  const [vendedorId, setVendedorId] = useState('');
  const [status, setStatus] = useState<OrcamentoStatus | ''>('');
  const [clienteId, setClienteId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const [vendedores, setVendedores] = useState<DashboardPorVendedor[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [budgets, setBudgets] = useState<BudgetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dashboardApi
      .porVendedor()
      .then(setVendedores)
      .catch(() => setVendedores([]));
    clientsApi
      .list()
      .then(setClients)
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    budgetsApi
      .list({
        vendedor_id: vendedorId ? Number(vendedorId) : undefined,
        status: status || undefined,
        cliente_id: clienteId ? Number(clienteId) : undefined,
        data_inicio: dataInicio || undefined,
        data_fim: dataFim || undefined,
      })
      .then(setBudgets)
      .catch(() => setError('Não foi possível carregar a lista de orçamentos.'))
      .finally(() => setLoading(false));
  }, [vendedorId, status, clienteId, dataInicio, dataFim]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">Propostas de energia solar e itens avulsos.</p>
        </div>
        <Link to="/orcamentos/novo">
          <Button>+ Novo orçamento</Button>
        </Link>
      </div>

      <Card goldTop={false} className="!bg-background-soft">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Select label="Vendedor" value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
            <option value="">Todos</option>
            {vendedores.map((v) => (
              <option key={v.vendedor_id} value={v.vendedor_id}>
                {v.vendedor_nome}
              </option>
            ))}
          </Select>
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as OrcamentoStatus | '')}>
            <option value="">Todos</option>
            {Object.entries(ORCAMENTO_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select label="Cliente" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">Todos</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>
          <Input label="Data início" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          <Input label="Data fim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        </div>
      </Card>

      <ErrorBanner message={error} />

      {loading ? (
        <Spinner />
      ) : budgets.length === 0 ? (
        <EmptyState
          title="Nenhum orçamento encontrado"
          description="Ajuste os filtros ou crie um novo orçamento."
          action={
            <Link to="/orcamentos/novo">
              <Button>+ Novo orçamento</Button>
            </Link>
          }
        />
      ) : (
        <Card goldTop={false} className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-3 pl-6 pr-4 font-semibold">Nº</th>
                  <th className="py-3 pr-4 font-semibold">Cliente</th>
                  <th className="py-3 pr-4 font-semibold">Vendedor</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-4 font-semibold">Dias parado</th>
                  <th className="py-3 pr-4 font-semibold">Valor final</th>
                  <th className="py-3 pr-4 font-semibold">Criado em</th>
                  <th className="py-3 pr-6 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((b) => (
                  <tr key={b.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                    <td className="py-3 pl-6 pr-4 font-medium">#{b.numero_proposta}</td>
                    <td className="py-3 pr-4">{b.cliente_nome}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{b.vendedor_nome}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {b.dias_parado === null ? '—' : b.dias_parado === 0 ? 'Hoje' : `${b.dias_parado} dias`}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-primary">{formatCurrency(b.valor_final)}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDate(b.created_at)}</td>
                    <td className="py-3 pr-6 text-right">
                      <Link to={`/orcamentos/${b.id}`} className="btn-ghost">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
