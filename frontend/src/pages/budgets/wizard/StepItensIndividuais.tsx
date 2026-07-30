import type { BudgetItemInput } from '../../../types';
import { Card } from '../../../components/Card';
import { Input } from '../../../components/Input';
import { Textarea } from '../../../components/Textarea';
import { ItemsEditor } from '../../../components/ItemsEditor';

export function StepItensIndividuais({
  items,
  onItemsChange,
  margemLucroPct,
  onMargemChange,
  validadeDias,
  onValidadeChange,
  observacoes,
  onObservacoesChange,
}: {
  items: BudgetItemInput[];
  onItemsChange: (items: BudgetItemInput[]) => void;
  margemLucroPct: number;
  onMargemChange: (value: number) => void;
  validadeDias: number;
  onValidadeChange: (value: number) => void;
  observacoes: string;
  onObservacoesChange: (value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <Card
        title="3. Itens do orçamento"
        subtitle="Monte a lista livremente: painéis, inversores, outros produtos, mão de obra ou homologação."
      >
        <ItemsEditor items={items} onChange={onItemsChange} allowProduct />
      </Card>

      <Card title="Margem de lucro e condições" subtitle="Padrão de 40%, editável por orçamento.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Margem de lucro"
            type="number"
            suffix="%"
            value={margemLucroPct}
            onChange={(e) => onMargemChange(Number(e.target.value))}
          />
          <Input
            label="Validade da proposta"
            type="number"
            suffix="dias"
            value={validadeDias}
            onChange={(e) => onValidadeChange(Number(e.target.value))}
          />
          <div className="sm:col-span-3">
            <Textarea
              label="Observações do orçamento"
              value={observacoes}
              onChange={(e) => onObservacoesChange(e.target.value)}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
