import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { productsApi } from '../../lib/api';
import type { Product, ProdutoStatus, ProdutoTipo } from '../../types';
import { PRODUTO_TIPOS } from '../../types';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
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
    const potencia = specs.potencia_wp != null ? `${formatNumber(specs.potencia_wp as number)} Wp` : '—';
    return specs.composicao_estrutura ? `${potencia} — ${specs.composicao_estrutura}` : potencia;
  }
  if (product.tipo === 'inversor') {
    return specs.quantidade_kw != null ? `${formatNumber(specs.quantidade_kw as number)} kW` : '—';
  }
  return specs.ano_fabricacao ? `Ano ${specs.ano_fabricacao}` : '—';
}

function productMarca(product: Product): string | null {
  const specs = product.specs as Record<string, unknown>;
  return product.marca ?? (specs.marca as string | undefined) ?? null;
}

function productPotencia(product: Product): number | null {
  if (product.tipo !== 'painel_solar') return null;
  const specs = product.specs as Record<string, unknown>;
  return (specs.potencia_wp as number) ?? null;
}

const SPEC_LABELS: Record<string, string> = {
  potencia_wp: 'potência wp',
  composicao_estrutura: 'composição estrutura',
  quantidade_kw: 'quantidade kw',
  ano_fabricacao: 'ano fabricação',
  altura: 'altura',
  largura: 'largura',
  peso: 'peso',
  marca: 'marca',
};

/** Remove acentos e caixa para que "potencia" case com "potência". */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * Texto único com tudo que o produto exibe (colunas + specs), usado pelo filtro
 * curinga. Guarda o número cru e o formatado para que "1550" e "1.550" casem.
 */
function searchBlob(product: Product): string {
  const parts: (string | number | null | undefined)[] = [
    product.nome,
    product.modelo,
    product.marca,
    product.tipo,
    PRODUTO_TIPOS.find((t) => t.value === product.tipo)?.label,
    product.status,
    product.status === 'ativo' ? 'Ativo' : 'Desativado',
    specsSummary(product),
  ];

  for (const [key, raw] of Object.entries(product.specs as Record<string, unknown>)) {
    if (raw === null || raw === undefined || raw === '') continue;
    parts.push(SPEC_LABELS[key] ?? key.replace(/_/g, ' '));
    parts.push(String(raw));
    if (typeof raw === 'number') parts.push(formatNumber(raw));
  }

  return normalize(parts.filter((v) => v !== null && v !== undefined && v !== '').join(' '));
}

interface FilterCount<T> {
  value: T;
  count: number;
}

function buildCounts<T>(products: Product[], extract: (p: Product) => T | null): FilterCount<T>[] {
  const counts = new Map<T, number>();
  for (const p of products) {
    const value = extract(p);
    if (value === null || value === undefined || value === '') continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => String(a.value).localeCompare(String(b.value), 'pt-BR', { numeric: true }));
}

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function ProductsList() {
  const [tipo, setTipo] = useState<ProdutoTipo | ''>('');
  const [status, setStatus] = useState<ProdutoStatus | ''>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marcasSelecionadas, setMarcasSelecionadas] = useState<Set<string>>(new Set());
  const [potenciasSelecionadas, setPotenciasSelecionadas] = useState<Set<number>>(new Set());
  const [curingaTermos, setCuringaTermos] = useState<string[]>([]);
  const [curingaDigitando, setCuringaDigitando] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    productsApi
      .list({ tipo: tipo || undefined, status: status || undefined })
      .then(setProducts)
      .catch(() => setError('Não foi possível carregar a lista de produtos.'))
      .finally(() => setLoading(false));
  }, [tipo, status]);

  // Filtro de marca/potência é calculado em memória a partir da lista já carregada
  // (tipo/status continuam sendo filtrados via API) — evita um novo parâmetro de
  // filtro no backend só para isso.
  const marcaCounts = useMemo(() => buildCounts(products, productMarca), [products]);
  const potenciaCounts = useMemo(() => buildCounts(products, productPotencia), [products]);

  const blobs = useMemo(() => new Map(products.map((p) => [p.id, searchBlob(p)])), [products]);

  // O texto ainda não confirmado com Enter também filtra, para dar retorno imediato.
  const curingaAtivos = useMemo(() => {
    const termos = [...curingaTermos, curingaDigitando].map(normalize).map((t) => t.trim());
    return termos.filter(Boolean);
  }, [curingaTermos, curingaDigitando]);

  function adicionarTermo(texto: string) {
    // Aceita vários de uma vez ao colar: "550, canadian; growatt".
    const novos = texto
      .split(/[,;]/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (novos.length === 0) return;
    setCuringaTermos((prev) => [...prev, ...novos.filter((t) => !prev.includes(t))]);
    setCuringaDigitando('');
  }

  const produtosFiltrados = products.filter((p) => {
    if (marcasSelecionadas.size > 0) {
      const marca = productMarca(p);
      if (!marca || !marcasSelecionadas.has(marca)) return false;
    }
    if (potenciasSelecionadas.size > 0) {
      const potencia = productPotencia(p);
      if (potencia === null || !potenciasSelecionadas.has(potencia)) return false;
    }
    if (curingaAtivos.length > 0) {
      const blob = blobs.get(p.id) ?? '';
      // Todos os termos precisam aparecer (cada termo refina a busca).
      if (!curingaAtivos.every((t) => blob.includes(t))) return false;
    }
    return true;
  });

  const temFiltroMarcaPotencia =
    marcasSelecionadas.size > 0 || potenciasSelecionadas.size > 0 || curingaTermos.length > 0 || curingaDigitando !== '';

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
        <div className="space-y-4">
          <div>
            <Input
              label="Busca curinga"
              placeholder="Digite qualquer coisa (nome, marca, modelo, potência...) e tecle Enter"
              value={curingaDigitando}
              onChange={(e) => setCuringaDigitando(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  adicionarTermo(curingaDigitando);
                } else if (e.key === 'Backspace' && curingaDigitando === '' && curingaTermos.length > 0) {
                  setCuringaTermos((prev) => prev.slice(0, -1));
                }
              }}
              onBlur={() => adicionarTermo(curingaDigitando)}
              hint="Procura em todas as colunas da tabela. Vários termos combinam entre si (E)."
            />
            {curingaTermos.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {curingaTermos.map((termo) => (
                  <span
                    key={termo}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {termo}
                    <button
                      type="button"
                      aria-label={`Remover filtro ${termo}`}
                      className="text-muted-foreground transition-colors hover:text-danger"
                      onClick={() => setCuringaTermos((prev) => prev.filter((t) => t !== termo))}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setCuringaTermos([])}
                >
                  Limpar termos
                </button>
              </div>
            )}
          </div>

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
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <aside className="w-full shrink-0 lg:w-60">
            <Card goldTop={false} className="!bg-background-soft">
              <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-sm">Filtros</h3>
                {temFiltroMarcaPotencia && (
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => {
                      setMarcasSelecionadas(new Set());
                      setPotenciasSelecionadas(new Set());
                      setCuringaTermos([]);
                      setCuringaDigitando('');
                    }}
                  >
                    Limpar
                  </button>
                )}
              </div>

              {marcaCounts.length > 0 && (
                <div>
                  <p className="field-label mb-2">Marca</p>
                  <div className="space-y-1.5">
                    {marcaCounts.map(({ value, count }) => (
                      <label key={value} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          className="accent-primary"
                          checked={marcasSelecionadas.has(value)}
                          onChange={() => setMarcasSelecionadas((prev) => toggle(prev, value))}
                        />
                        <span className="flex-1 truncate">{value}</span>
                        <span className="text-muted-foreground text-xs">({count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {potenciaCounts.length > 0 && (
                <div>
                  <p className="field-label mb-2">Potência do módulo</p>
                  <div className="space-y-1.5">
                    {potenciaCounts.map(({ value, count }) => (
                      <label key={value} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          className="accent-primary"
                          checked={potenciasSelecionadas.has(value)}
                          onChange={() => setPotenciasSelecionadas((prev) => toggle(prev, value))}
                        />
                        <span className="flex-1">{formatNumber(value)} Wp</span>
                        <span className="text-muted-foreground text-xs">({count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              </div>
            </Card>
          </aside>

          <div className="flex-1 min-w-0 space-y-3">
            {produtosFiltrados.length === 0 ? (
              <EmptyState
                title="Nenhum produto com esses filtros"
                description="Ajuste a busca curinga ou os filtros de marca/potência para ver mais resultados."
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
                      {produtosFiltrados.map((p) => (
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
        </div>
      )}
    </div>
  );
}
