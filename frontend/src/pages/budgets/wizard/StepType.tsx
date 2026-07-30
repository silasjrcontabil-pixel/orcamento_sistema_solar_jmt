import type { TipoOrcamento } from '../../../types';
import { Card } from '../../../components/Card';

export function StepType({
  value,
  onChange,
}: {
  value: TipoOrcamento | null;
  onChange: (tipo: TipoOrcamento) => void;
}) {
  return (
    <Card title="2. Tipo de orçamento" subtitle="Como esse orçamento deve ser montado?">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange('sistema_completo')}
          className={`text-left rounded-lg border p-5 transition-colors ${
            value === 'sistema_completo'
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-primary/50'
          }`}
        >
          <h4 className="font-display font-bold text-foreground mb-1">Sistema Solar Completo</h4>
          <p className="text-sm text-muted-foreground">
            Dimensionamento automático a partir do consumo, com painéis, inversores, parte CA, mão
            de obra e homologação.
          </p>
        </button>
        <button
          type="button"
          onClick={() => onChange('itens_individuais')}
          className={`text-left rounded-lg border p-5 transition-colors ${
            value === 'itens_individuais'
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-primary/50'
          }`}
        >
          <h4 className="font-display font-bold text-foreground mb-1">Itens Individuais</h4>
          <p className="text-sm text-muted-foreground">
            Lista livre de itens (produtos do estoque ou avulsos), sem dimensionamento automático.
          </p>
        </button>
      </div>
    </Card>
  );
}
