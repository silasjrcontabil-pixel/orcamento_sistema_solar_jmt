import { useEffect, useState } from 'react';
import { budgetsApi, productsApi } from '../../../lib/api';
import type { CalcPreviewResponse, Product, SolarConfigInput } from '../../../types';
import { Card } from '../../../components/Card';
import { CardPicker } from '../../../components/CardPicker';
import { Input } from '../../../components/Input';
import { Spinner } from '../../../components/Spinner';
import { useDebounce } from '../../../lib/useDebounce';
import { formatNumber } from '../../../lib/format';

export function StepEquipamentos({
  clientId,
  value,
  onChange,
}: {
  clientId: number;
  value: Partial<SolarConfigInput>;
  onChange: (patch: Partial<SolarConfigInput>) => void;
}) {
  const [paineis, setPaineis] = useState<Product[]>([]);
  const [inversores, setInversores] = useState<Product[]>([]);
  const [preview, setPreview] = useState<CalcPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    productsApi
      .list({ tipo: 'painel_solar', status: 'ativo' })
      .then(setPaineis)
      .catch(() => setPaineis([]));
    productsApi
      .list({ tipo: 'inversor', status: 'ativo' })
      .then(setInversores)
      .catch(() => setInversores([]));
  }, []);

  const painelSelecionado = paineis.find((p) => p.id === value.painel_product_id);

  const debouncedValue = useDebounce(value, 500);

  useEffect(() => {
    const canPreview =
      debouncedValue.consumo_mensal_kwh &&
      debouncedValue.orientacao &&
      debouncedValue.painel_product_id;
    if (!canPreview) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    budgetsApi
      .calcPreview({
        client_id: clientId,
        solar_config: {
          consumo_mensal_kwh: debouncedValue.consumo_mensal_kwh!,
          valor_conta: debouncedValue.valor_conta ?? 0,
          tipo_telhado: debouncedValue.tipo_telhado ?? 'Laje',
          orientacao: debouncedValue.orientacao!,
          distribuidora: debouncedValue.distribuidora ?? 'Outro',
          area_disponivel_m2: debouncedValue.area_disponivel_m2 ?? null,
          painel_product_id: debouncedValue.painel_product_id!,
          potencia_wp_override: debouncedValue.potencia_wp_override ?? null,
          qtd_paineis_override: debouncedValue.qtd_paineis_override ?? null,
          inversor_product_id: debouncedValue.inversor_product_id ?? 0,
          qtd_inversores_override: debouncedValue.qtd_inversores_override ?? null,
          custo_unitario_painel: debouncedValue.custo_unitario_painel ?? 0,
          custo_unitario_inversor: debouncedValue.custo_unitario_inversor ?? 0,
        },
      })
      .then((res) => {
        setPreview(res);
        // Preenche as sugestões como valor inicial editável, sem sobrescrever
        // se o usuário já tiver customizado manualmente.
        if (value.qtd_paineis_override === undefined || value.qtd_paineis_override === null) {
          onChange({ qtd_paineis_override: res.qtd_paineis });
        }
        // qtd_inversores vem nulo enquanto o inversor ainda não foi selecionado.
        if (
          res.qtd_inversores != null &&
          (value.qtd_inversores_override === undefined || value.qtd_inversores_override === null)
        ) {
          onChange({ qtd_inversores_override: res.qtd_inversores });
        }
      })
      .catch(() => setPreviewError('Não foi possível calcular o dimensionamento sugerido.'))
      .finally(() => setPreviewLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedValue.consumo_mensal_kwh,
    debouncedValue.orientacao,
    debouncedValue.painel_product_id,
    debouncedValue.inversor_product_id,
    debouncedValue.potencia_wp_override,
    debouncedValue.qtd_paineis_override,
    debouncedValue.qtd_inversores_override,
    clientId,
  ]);

  return (
    <div className="space-y-6">
      <Card title="3. Equipamentos — Painéis Solares" subtitle="Potência e quantidade sugeridas automaticamente, editáveis manualmente.">
        <div className="space-y-4">
          <div>
            <p className="field-label mb-2">
              Painel Solar<span className="text-primary"> *</span>
            </p>
            <CardPicker
              emptyLabel="Nenhum painel ativo cadastrado."
              value={value.painel_product_id}
              options={paineis.map((p) => {
                const specs = p.specs as Record<string, unknown>;
                const potencia = specs?.potencia_wp as number | undefined;
                const composicao = specs?.composicao_estrutura as string | undefined;
                return {
                  id: p.id,
                  title: p.nome,
                  subtitle: p.modelo ?? undefined,
                  highlight: [potencia ? `${formatNumber(potencia, 0)} Wp` : null, composicao]
                    .filter(Boolean)
                    .join(' · '),
                };
              })}
              onChange={(id) => {
                const prod = paineis.find((p) => p.id === id);
                const specs = prod?.specs as Record<string, unknown> | undefined;
                onChange({
                  painel_product_id: id,
                  potencia_wp_override: (specs?.potencia_wp as number) ?? undefined,
                });
              }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Potência da placa"
              type="number"
              suffix="Wp"
              value={value.potencia_wp_override ?? ''}
              onChange={(e) => onChange({ potencia_wp_override: Number(e.target.value) })}
              hint={painelSelecionado ? 'Preenchido do cadastro do produto, editável.' : undefined}
            />
            <Input
              label="Quantidade de placas"
              type="number"
              value={value.qtd_paineis_override ?? ''}
              onChange={(e) => onChange({ qtd_paineis_override: Number(e.target.value) })}
              hint={preview ? `Sugestão automática: ${preview.qtd_paineis}` : undefined}
            />
            <Input
              label="Custo unitário da placa"
              type="number"
              suffix="R$"
              required
              value={value.custo_unitario_painel ?? ''}
              onChange={(e) => onChange({ custo_unitario_painel: Number(e.target.value) })}
            />
          </div>
        </div>
      </Card>

      <Card title="Equipamentos — Inversores" subtitle="Quantidade sugerida conforme a potência do sistema.">
        <div className="space-y-4">
          <div>
            <p className="field-label mb-2">
              Inversor<span className="text-primary"> *</span>
            </p>
            <CardPicker
              emptyLabel="Nenhum inversor ativo cadastrado."
              value={value.inversor_product_id}
              options={inversores.map((p) => {
                const specs = p.specs as Record<string, unknown>;
                const quantidadeKw = specs?.quantidade_kw as number | undefined;
                return {
                  id: p.id,
                  title: p.nome,
                  subtitle: p.modelo ?? undefined,
                  highlight: quantidadeKw ? `${formatNumber(quantidadeKw, 1)} kW` : undefined,
                };
              })}
              onChange={(id) => onChange({ inversor_product_id: id })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Quantidade de inversores"
              type="number"
              value={value.qtd_inversores_override ?? ''}
              onChange={(e) => onChange({ qtd_inversores_override: Number(e.target.value) })}
              hint={preview?.qtd_inversores != null ? `Sugestão automática: ${preview.qtd_inversores}` : undefined}
            />
            <Input
              label="Custo unitário do inversor"
              type="number"
              suffix="R$"
              required
              value={value.custo_unitario_inversor ?? ''}
              onChange={(e) => onChange({ custo_unitario_inversor: Number(e.target.value) })}
            />
          </div>
        </div>
      </Card>

      <Card title="Dimensionamento sugerido" goldTop={false} className="!bg-background-soft">
        {previewLoading ? (
          <Spinner label="Calculando dimensionamento..." />
        ) : previewError ? (
          <p className="text-sm text-danger">{previewError}</p>
        ) : preview ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="field-label mb-1">Potência do sistema</p>
              <p className="font-display font-bold text-primary">
                {formatNumber(preview.potencia_sistema_kwp, 2)} kWp
              </p>
            </div>
            <div>
              <p className="field-label mb-1">Geração estimada</p>
              <p className="font-display font-bold text-primary">
                {formatNumber(preview.geracao_estimada_kwh, 0)} kWh/mês
              </p>
            </div>
            <div>
              <p className="field-label mb-1">Radiação média região</p>
              <p className="font-display font-bold text-primary">
                {formatNumber(preview.radiacao_media_regiao, 2)}
              </p>
            </div>
            <div>
              <p className="field-label mb-1">Radiação ajustada</p>
              <p className="font-display font-bold text-primary">
                {formatNumber(preview.radiacao_ajustada, 2)}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Preencha consumo, orientação e painel para ver o dimensionamento sugerido.
          </p>
        )}
      </Card>
    </div>
  );
}
