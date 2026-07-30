import type { Orientacao, SolarConfigInput, TipoTelhado } from '../../../types';
import { DISTRIBUIDORAS, ORIENTACAO, TIPO_TELHADO } from '../../../types';
import { Card } from '../../../components/Card';
import { Input } from '../../../components/Input';
import { Select } from '../../../components/Select';
import { Textarea } from '../../../components/Textarea';

const ORIENTACAO_LABEL: Record<Orientacao, string> = {
  Norte: 'Norte (ideal)',
  Nordeste: 'Nordeste',
  Noroeste: 'Noroeste',
  'Leste/Oeste': 'Leste/Oeste',
};

export function StepConsumo({
  value,
  onChange,
}: {
  value: Partial<SolarConfigInput>;
  onChange: (patch: Partial<SolarConfigInput>) => void;
}) {
  return (
    <Card
      title="Consumo & Instalação"
      subtitle="Dados para dimensionamento automático do sistema."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Consumo mensal"
          type="number"
          placeholder="Ex: 500"
          suffix="kWh"
          required
          value={value.consumo_mensal_kwh ?? ''}
          onChange={(e) => onChange({ consumo_mensal_kwh: Number(e.target.value) })}
        />
        <Input
          label="Valor da conta"
          type="number"
          placeholder="Ex: 600"
          suffix="R$"
          required
          value={value.valor_conta ?? ''}
          onChange={(e) => onChange({ valor_conta: Number(e.target.value) })}
        />
        <Select
          label="Tipo de telhado"
          required
          value={value.tipo_telhado ?? ''}
          onChange={(e) => onChange({ tipo_telhado: e.target.value as TipoTelhado })}
        >
          <option value="" disabled>
            Selecione...
          </option>
          {TIPO_TELHADO.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select
          label="Orientação"
          required
          value={value.orientacao ?? ''}
          onChange={(e) => onChange({ orientacao: e.target.value as Orientacao })}
        >
          <option value="" disabled>
            Selecione...
          </option>
          {ORIENTACAO.map((o) => (
            <option key={o} value={o}>
              {ORIENTACAO_LABEL[o]}
            </option>
          ))}
        </Select>
        <Select
          label="Distribuidora"
          required
          value={value.distribuidora ?? ''}
          onChange={(e) => onChange({ distribuidora: e.target.value })}
        >
          <option value="" disabled>
            Selecione...
          </option>
          {DISTRIBUIDORAS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
        <Input
          label="Área disponível (m²)"
          type="number"
          value={value.area_disponivel_m2 ?? ''}
          onChange={(e) =>
            onChange({ area_disponivel_m2: e.target.value ? Number(e.target.value) : null })
          }
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Observações"
            value={value.observacoes ?? ''}
            onChange={(e) => onChange({ observacoes: e.target.value })}
          />
        </div>
      </div>
    </Card>
  );
}
