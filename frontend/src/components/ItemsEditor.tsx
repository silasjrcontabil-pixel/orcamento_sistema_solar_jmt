import { useEffect, useState } from 'react';
import type { BudgetItemInput, Product, TipoItem } from '../types';
import { TIPO_ITEM } from '../types';
import { productsApi } from '../lib/api';
import { Select } from './Select';
import { Input } from './Input';
import { Button } from './Button';
import { formatCurrency } from '../lib/format';

interface ItemsEditorProps {
  items: BudgetItemInput[];
  onChange: (items: BudgetItemInput[]) => void;
  /** Restringe os tipos de item permitidos (ex.: só extras em sistema completo). */
  allowedTypes?: TipoItem[];
  /** Permite vincular a um produto do estoque (usado em itens individuais). */
  allowProduct?: boolean;
}

const DEFAULT_ITEM = (tipo: TipoItem): BudgetItemInput => ({
  tipo_item: tipo,
  descricao: '',
  quantidade: 1,
  custo_unitario: 0,
  product_id: null,
});

/** Um item só é enviável com descrição, quantidade e custo unitário preenchidos —
 * evita salvar itens "de graça" (custo 0) sem o usuário perceber. */
export function itemsValid(items: BudgetItemInput[]): boolean {
  return items.every((item) => item.descricao.trim().length > 0 && item.quantidade > 0 && item.custo_unitario > 0);
}

export function ItemsEditor({ items, onChange, allowedTypes, allowProduct }: ItemsEditorProps) {
  const options = TIPO_ITEM.filter((t) => !allowedTypes || allowedTypes.includes(t.value));
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!allowProduct) return;
    productsApi
      .list({ status: 'ativo' })
      .then(setProducts)
      .catch(() => setProducts([]));
  }, [allowProduct]);

  function addItem() {
    onChange([...items, DEFAULT_ITEM(options[0]?.value ?? 'outro')]);
  }

  function updateItem(index: number, patch: Partial<BudgetItemInput>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  const total = items.reduce((sum, item) => sum + item.quantidade * item.custo_unitario, 0);

  return (
    <div className="space-y-4">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum item adicionado ainda.</p>
      )}

      {items.map((item, index) => (
        <div key={index} className="rounded-md border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="field-label">Item {index + 1}</span>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="text-xs text-danger hover:underline"
            >
              Remover
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Select
              label="Tipo"
              value={item.tipo_item}
              onChange={(e) => updateItem(index, { tipo_item: e.target.value as TipoItem })}
            >
              {options.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
            {allowProduct && (
              <Select
                label="Produto (opcional)"
                value={item.product_id ?? ''}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  const prod = products.find((p) => p.id === id);
                  updateItem(index, {
                    product_id: id,
                    descricao: prod ? prod.nome : item.descricao,
                  });
                }}
              >
                <option value="">Nenhum (item avulso)</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </Select>
            )}
            <div className={allowProduct ? 'lg:col-span-1' : 'sm:col-span-1'}>
              <Input
                label="Descrição"
                required
                value={item.descricao}
                onChange={(e) => updateItem(index, { descricao: e.target.value })}
                error={item.descricao.trim().length === 0 ? 'Obrigatório' : undefined}
              />
            </div>
            <Input
              label="Quantidade"
              type="number"
              min={0}
              required
              value={item.quantidade}
              onChange={(e) => updateItem(index, { quantidade: Number(e.target.value) })}
              error={item.quantidade <= 0 ? 'Deve ser maior que 0' : undefined}
            />
            <Input
              label="Custo unitário"
              type="number"
              suffix="R$"
              min={0}
              required
              value={item.custo_unitario}
              onChange={(e) => updateItem(index, { custo_unitario: Number(e.target.value) })}
              error={item.custo_unitario <= 0 ? 'Informe o custo' : undefined}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">
            Subtotal: <span className="text-primary font-semibold">{formatCurrency(item.quantidade * item.custo_unitario)}</span>
          </p>
        </div>
      ))}

      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="secondary" onClick={addItem}>
          + Adicionar item
        </Button>
        <p className="text-sm">
          Total: <span className="font-display font-bold text-primary">{formatCurrency(total)}</span>
        </p>
      </div>
    </div>
  );
}
