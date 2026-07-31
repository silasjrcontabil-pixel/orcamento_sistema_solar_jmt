import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { productsApi } from '../../lib/api';
import type { ProdutoStatus, ProdutoTipo, ProductInput, ProductPayload } from '../../types';
import { PRODUTO_TIPOS } from '../../types';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { Spinner } from '../../components/Spinner';
import { ErrorBanner } from '../../components/ErrorBanner';

const EMPTY: ProductInput = {
  tipo: 'painel_solar',
  nome: '',
  modelo: '',
  marca: '',
  status: 'ativo',
  composicao_estrutura: '',
  potencia_wp: undefined,
  altura: undefined,
  largura: undefined,
  peso: undefined,
  quantidade_kw: undefined,
  ano_fabricacao: undefined,
};

// Body enviado à API é montado por tipo — só os campos aplicáveis àquele tipo
// de produto (ver API_CONTRACT.md § Produtos), nunca o objeto flatten inteiro.
function buildPayload(form: ProductInput): ProductPayload {
  const base = { tipo: form.tipo, nome: form.nome, status: form.status };
  if (form.tipo === 'painel_solar') {
    return {
      ...base,
      modelo: form.modelo,
      marca: form.marca || null,
      composicao_estrutura: form.composicao_estrutura,
      potencia_wp: form.potencia_wp,
      altura: form.altura ?? null,
      largura: form.largura ?? null,
      peso: form.peso ?? null,
    };
  }
  if (form.tipo === 'inversor') {
    return {
      ...base,
      modelo: form.modelo,
      quantidade_kw: form.quantidade_kw,
    };
  }
  return {
    ...base,
    marca: form.marca,
    modelo: form.modelo || null,
    ano_fabricacao: form.ano_fabricacao ?? null,
  };
}

export function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<ProductInput>(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit) return;
    productsApi
      .get(Number(id))
      .then((product) => {
        const specs = product.specs as Record<string, unknown>;
        setForm({
          tipo: product.tipo,
          nome: product.nome,
          modelo: product.modelo ?? '',
          marca: product.marca ?? (specs.marca as string) ?? '',
          status: product.status,
          composicao_estrutura: (specs.composicao_estrutura as string) ?? '',
          potencia_wp: (specs.potencia_wp as number) ?? undefined,
          altura: (specs.altura as number) ?? undefined,
          largura: (specs.largura as number) ?? undefined,
          peso: (specs.peso as number) ?? undefined,
          quantidade_kw: (specs.quantidade_kw as number) ?? undefined,
          ano_fabricacao: (specs.ano_fabricacao as number) ?? undefined,
        });
      })
      .catch(() => setError('Não foi possível carregar o produto.'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function update<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload(form);
      if (isEdit) {
        await productsApi.update(Number(id), payload);
      } else {
        await productsApi.create(payload);
      }
      navigate('/produtos');
    } catch {
      setError('Não foi possível salvar o produto. Verifique os campos obrigatórios.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-extrabold">
          {isEdit ? 'Editar produto' : 'Novo produto'}
        </h1>
        <p className="text-sm text-muted-foreground">
          Os campos exibidos mudam conforme o tipo de produto selecionado.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card title="Dados do produto">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Select
                label="Tipo de produto"
                value={form.tipo}
                disabled={isEdit}
                onChange={(e) => update('tipo', e.target.value as ProdutoTipo)}
              >
                {PRODUTO_TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>

            <Input
              label="Nome"
              required={form.tipo !== 'outro'}
              value={form.nome}
              onChange={(e) => update('nome', e.target.value)}
            />

            {form.tipo !== 'outro' && (
              <Input
                label="Modelo"
                value={form.modelo ?? ''}
                onChange={(e) => update('modelo', e.target.value)}
              />
            )}

            {form.tipo === 'outro' && (
              <Input
                label="Modelo"
                value={form.modelo ?? ''}
                onChange={(e) => update('modelo', e.target.value)}
              />
            )}

            {(form.tipo === 'painel_solar' || form.tipo === 'outro') && (
              <Input
                label="Marca"
                value={form.marca ?? ''}
                onChange={(e) => update('marca', e.target.value)}
              />
            )}

            {form.tipo === 'painel_solar' && (
              <>
                <div className="sm:col-span-2">
                  <Input
                    label="Composição/Estrutura interna"
                    value={form.composicao_estrutura ?? ''}
                    onChange={(e) => update('composicao_estrutura', e.target.value)}
                  />
                </div>
                <Input
                  label="Potência"
                  required
                  type="number"
                  step="0.01"
                  suffix="Wp"
                  value={form.potencia_wp ?? ''}
                  onChange={(e) => update('potencia_wp', Number(e.target.value))}
                />
                <Input
                  label="Altura"
                  type="number"
                  step="0.01"
                  suffix="mm"
                  value={form.altura ?? ''}
                  onChange={(e) => update('altura', e.target.value ? Number(e.target.value) : undefined)}
                />
                <Input
                  label="Largura"
                  type="number"
                  step="0.01"
                  suffix="mm"
                  value={form.largura ?? ''}
                  onChange={(e) => update('largura', e.target.value ? Number(e.target.value) : undefined)}
                />
                <Input
                  label="Peso"
                  type="number"
                  step="0.01"
                  suffix="kg"
                  value={form.peso ?? ''}
                  onChange={(e) => update('peso', e.target.value ? Number(e.target.value) : undefined)}
                />
              </>
            )}

            {form.tipo === 'inversor' && (
              <Input
                label="Quantidade de kW"
                required
                type="number"
                step="0.01"
                suffix="kW"
                value={form.quantidade_kw ?? ''}
                onChange={(e) => update('quantidade_kw', Number(e.target.value))}
              />
            )}

            {form.tipo === 'outro' && (
              <Input
                label="Ano de fabricação"
                type="number"
                value={form.ano_fabricacao ?? ''}
                onChange={(e) =>
                  update('ano_fabricacao', e.target.value ? Number(e.target.value) : undefined)
                }
              />
            )}

            <Select
              label="Status"
              value={form.status}
              onChange={(e) => update('status', e.target.value as ProdutoStatus)}
            >
              <option value="ativo">Ativo</option>
              <option value="desativado">Desativado</option>
            </Select>
          </div>

          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={() => navigate('/produtos')}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Salvar
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
