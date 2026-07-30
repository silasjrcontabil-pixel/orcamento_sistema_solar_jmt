import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productsApi } from '../../lib/api';
import type { Product, ProdutoStatus, ProdutoTipo } from '../../types';
import { PRODUTO_TIPOS } from '../../types';
import { Card } from '../../components/Card';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { Spinner } from '../../components/Spinner';
import { EmptyState } from '../../components/EmptyState';
import { ErrorBanner } from '../../components/ErrorBanner';
import { ProductStatusBadge } from '../../components/StatusBadge';
import { formatNumber } from '../../lib/format';

function specsSummary(product: Product): string {
  const specs = product.specs as Record<string, unknown>;
  if (product.tipo === 'painel_solar') {
    return `${formatNumber(specs.potencia_wp as number)} Wp — ${specs.composicao_estrutura ?? ''}`;
  }
  if (product.tipo === 'inversor') {
    return `${formatNumber(specs.quantidade_kw as number)} kW`;
  }
  return specs.ano_fabricacao ? `Ano ${specs.ano_fabricacao}` : '—';
}

export function ProductsList() {
  const [tipo, setTipo] = useState<ProdutoTipo | ''>('');
  const [status, setStatus] = useState<ProdutoStatus | ''>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    productsApi
      .list({ tipo: tipo || undefined, status: status || undefined })
      .then(setProducts)
      .catch(() => setError('Não foi possível carregar a lista de produtos.'))
      .finally(() => setLoading(false));
  }, [tipo, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Produtos</h1>
          <p className="text-sm text-muted-foreground">Estoque de painéis, inversores e outros itens.</p>
        </div>
        <Link to="/produtos/novo">
          <Button>+ Novo produto</Button>
        </Link>
      </div>

      <Card goldTop={false} className="!bg-background-soft">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as ProdutoTipo | '')}>
            <option value="">Todos os tipos</option>
            {PRODUTO_TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as ProdutoStatus | '')}>
            <option value="">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="desativado">Desativado</option>
          </Select>
        </div>
      </Card>

      <ErrorBanner message={error} />

      {loading ? (
        <Spinner />
      ) : products.length === 0 ? (
        <EmptyState
          title="Nenhum produto encontrado"
          description="Ajuste os filtros ou cadastre um novo produto."
          action={
            <Link to="/produtos/novo">
              <Button>+ Novo produto</Button>
            </Link>
          }
        />
      ) : (
        <Card goldTop={false} className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-3 pl-6 pr-4 font-semibold">Nome</th>
                  <th className="py-3 pr-4 font-semibold">Tipo</th>
                  <th className="py-3 pr-4 font-semibold">Modelo/Marca</th>
                  <th className="py-3 pr-4 font-semibold">Especificações</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-6 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                    <td className="py-3 pl-6 pr-4 font-medium">{p.nome}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {PRODUTO_TIPOS.find((t) => t.value === p.tipo)?.label}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {[p.modelo, p.marca].filter(Boolean).join(' / ') || '—'}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{specsSummary(p)}</td>
                    <td className="py-3 pr-4">
                      <ProductStatusBadge status={p.status} />
                    </td>
                    <td className="py-3 pr-6 text-right">
                      <Link to={`/produtos/${p.id}/editar`} className="btn-ghost">
                        Editar
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
