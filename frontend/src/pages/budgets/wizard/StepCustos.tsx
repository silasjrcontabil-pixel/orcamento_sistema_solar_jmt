import type { BudgetItemInput, TipoItem } from '../../../types';
import { Card } from '../../../components/Card';
import { Input } from '../../../components/Input';
import { Textarea } from '../../../components/Textarea';
import { ItemsEditor } from '../../../components/ItemsEditor';

const EXTRA_TYPES: TipoItem[] = ['parte_ca', 'mao_obra', 'homologacao', 'outro'];

export function StepCustos({
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
        title="4. Custos extras"
        subtitle="Parte CA (cabos, disjuntor, placa de aviso), mão de obra e homologação/projeto."
      >
        <ItemsEditor items={items} onChange={onItemsChange} allowedTypes={EXTRA_TYPES} />
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
