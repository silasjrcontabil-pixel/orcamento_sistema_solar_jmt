import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { budgetsApi, clientsApi } from '../../lib/api';
import type { BudgetInput, BudgetItem, BudgetItemInput, SolarConfigInput } from '../../types';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Spinner } from '../../components/Spinner';
import { StepClient } from './wizard/StepClient';
import { StepType } from './wizard/StepType';
import { StepConsumo } from './wizard/StepConsumo';
import { StepEquipamentos } from './wizard/StepEquipamentos';
import { StepCustos } from './wizard/StepCustos';
import { StepItensIndividuais } from './wizard/StepItensIndividuais';
import { DEFAULT_WIZARD_STATE, type WizardState } from './wizard/types';
import { itemsValid } from '../../components/ItemsEditor';

function toItemInput(item: BudgetItem): BudgetItemInput {
  return {
    tipo_item: item.tipo_item,
    product_id: item.product_id ?? null,
    descricao: item.descricao,
    quantidade: item.quantidade,
    custo_unitario: item.custo_unitario,
  };
}

type StepKey = 'cliente' | 'tipo' | 'consumo' | 'equipamentos' | 'custos' | 'itens';

const STEP_LABEL: Record<StepKey, string> = {
  cliente: 'Cliente',
  tipo: 'Tipo',
  consumo: 'Consumo & Instalação',
  equipamentos: 'Equipamentos',
  custos: 'Custos & Margem',
  itens: 'Itens & Margem',
};

export function BudgetWizard() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [state, setState] = useState<WizardState>(DEFAULT_WIZARD_STATE);
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEditMode);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    budgetsApi
      .get(Number(id))
      .then(async (detail) => {
        const client = await clientsApi.get(detail.client.id);
        setState({
          client,
          tipoOrcamento: detail.tipo_orcamento,
          solarConfig: detail.solar_config ?? {},
          itensExtras:
            detail.tipo_orcamento === 'sistema_completo'
              ? detail.itens.filter((i) => i.tipo_item !== 'painel' && i.tipo_item !== 'inversor').map(toItemInput)
              : [],
          itensIndividuais: detail.tipo_orcamento === 'itens_individuais' ? detail.itens.map(toItemInput) : [],
          margemLucroPct: detail.margem_lucro_pct,
          validadeDias: detail.validade_dias,
          observacoes: detail.observacoes ?? '',
        });
      })
      .catch(() => setError('Não foi possível carregar o orçamento para edição.'))
      .finally(() => setLoading(false));
  }, [id]);

  const steps: StepKey[] = useMemo(() => {
    if (state.tipoOrcamento === 'sistema_completo') {
      return ['cliente', 'tipo', 'consumo', 'equipamentos', 'custos'];
    }
    if (state.tipoOrcamento === 'itens_individuais') {
      return ['cliente', 'tipo', 'itens'];
    }
    return ['cliente', 'tipo'];
  }, [state.tipoOrcamento]);

  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];

  function patchSolarConfig(patch: Partial<SolarConfigInput>) {
    setState((prev) => ({ ...prev, solarConfig: { ...prev.solarConfig, ...patch } }));
  }

  function canAdvance(): boolean {
    const sc = state.solarConfig;
    switch (currentStep) {
      case 'cliente':
        return Boolean(state.client);
      case 'tipo':
        return Boolean(state.tipoOrcamento);
      case 'consumo':
        return Boolean(
          sc.consumo_mensal_kwh &&
            sc.valor_conta !== undefined &&
            sc.tipo_telhado &&
            sc.orientacao &&
            sc.distribuidora,
        );
      case 'equipamentos':
        return Boolean(
          sc.painel_product_id &&
            sc.inversor_product_id &&
            sc.qtd_paineis_override &&
            sc.qtd_inversores_override &&
            sc.custo_unitario_painel &&
            sc.custo_unitario_inversor,
        );
      case 'custos':
        // itensExtras é opcional (pode ficar vazio), mas os que existirem precisam
        // estar completos — sem isso dava pra salvar um item "Parte CA" com custo 0.
        return state.margemLucroPct >= 0 && itemsValid(state.itensExtras);
      case 'itens':
        return state.itensIndividuais.length > 0 && itemsValid(state.itensIndividuais);
      default:
        return true;
    }
  }

  const isLastStep = stepIndex === steps.length - 1;

  async function handleSubmit() {
    if (!state.client || !state.tipoOrcamento) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: BudgetInput =
        state.tipoOrcamento === 'sistema_completo'
          ? {
              client_id: state.client.id,
              tipo_orcamento: 'sistema_completo',
              margem_lucro_pct: state.margemLucroPct,
              validade_dias: state.validadeDias,
              observacoes: state.observacoes || undefined,
              solar_config: state.solarConfig as SolarConfigInput,
              itens: state.itensExtras,
            }
          : {
              client_id: state.client.id,
              tipo_orcamento: 'itens_individuais',
              margem_lucro_pct: state.margemLucroPct,
              validade_dias: state.validadeDias,
              observacoes: state.observacoes || undefined,
              itens: state.itensIndividuais,
            };

      const saved = isEditMode ? await budgetsApi.update(Number(id), payload) : await budgetsApi.create(payload);
      navigate(`/orcamentos/${saved.id}`);
    } catch {
      setError(
        isEditMode
          ? 'Não foi possível salvar as alterações. Revise os dados informados e tente novamente.'
          : 'Não foi possível criar o orçamento. Revise os dados informados e tente novamente.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (isLastStep) {
      handleSubmit();
    } else {
      setStepIndex((i) => Math.min(i + 1, steps.length - 1));
    }
  }

  function handleBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-extrabold">
          {isEditMode ? `Editar orçamento` : 'Novo orçamento'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isEditMode
            ? 'Revise as etapas abaixo e salve as alterações.'
            : 'Preencha as etapas abaixo para gerar a proposta.'}
        </p>
      </div>

      {/* Stepper */}
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                i < stepIndex
                  ? 'bg-primary text-black'
                  : i === stepIndex
                    ? 'border-2 border-primary text-primary'
                    : 'border border-border text-muted-foreground'
              }`}
            >
              {i + 1}
            </span>
            <span className={`text-xs font-semibold ${i === stepIndex ? 'text-foreground' : 'text-muted-foreground'}`}>
              {STEP_LABEL[step]}
            </span>
            {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      {currentStep === 'cliente' && (
        <StepClient selected={state.client} onSelect={(client) => setState((prev) => ({ ...prev, client }))} />
      )}

      {currentStep === 'tipo' && (
        <StepType
          value={state.tipoOrcamento}
          onChange={(tipo) => setState((prev) => ({ ...prev, tipoOrcamento: tipo }))}
        />
      )}

      {currentStep === 'consumo' && (
        <StepConsumo value={state.solarConfig} onChange={patchSolarConfig} />
      )}

      {currentStep === 'equipamentos' && state.client && (
        <StepEquipamentos clientId={state.client.id} value={state.solarConfig} onChange={patchSolarConfig} />
      )}

      {currentStep === 'custos' && (
        <StepCustos
          items={state.itensExtras}
          onItemsChange={(itensExtras) => setState((prev) => ({ ...prev, itensExtras }))}
          margemLucroPct={state.margemLucroPct}
          onMargemChange={(margemLucroPct) => setState((prev) => ({ ...prev, margemLucroPct }))}
          validadeDias={state.validadeDias}
          onValidadeChange={(validadeDias) => setState((prev) => ({ ...prev, validadeDias }))}
          observacoes={state.observacoes}
          onObservacoesChange={(observacoes) => setState((prev) => ({ ...prev, observacoes }))}
        />
      )}

      {currentStep === 'itens' && (
        <StepItensIndividuais
          items={state.itensIndividuais}
          onItemsChange={(itensIndividuais) => setState((prev) => ({ ...prev, itensIndividuais }))}
          margemLucroPct={state.margemLucroPct}
          onMargemChange={(margemLucroPct) => setState((prev) => ({ ...prev, margemLucroPct }))}
          validadeDias={state.validadeDias}
          onValidadeChange={(validadeDias) => setState((prev) => ({ ...prev, validadeDias }))}
          observacoes={state.observacoes}
          onObservacoesChange={(observacoes) => setState((prev) => ({ ...prev, observacoes }))}
        />
      )}

      <ErrorBanner message={error} />

      <div className="flex justify-between">
        <Button type="button" variant="secondary" onClick={handleBack} disabled={stepIndex === 0}>
          Voltar
        </Button>
        <Button type="button" onClick={handleNext} disabled={!canAdvance()} loading={submitting}>
          {isLastStep ? (isEditMode ? 'Salvar alterações' : 'Criar orçamento') : 'Avançar'}
        </Button>
      </div>
    </div>
  );
}
