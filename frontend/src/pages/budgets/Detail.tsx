import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { budgetsApi } from '../../lib/api';
import type { BudgetDetail as BudgetDetailType, OrcamentoStatus } from '../../types';
import { ORCAMENTO_STATUS_LABEL, ORCAMENTO_TRANSICOES, TIPO_ITEM } from '../../types';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Select } from '../../components/Select';
import { Spinner } from '../../components/Spinner';
import { ErrorBanner } from '../../components/ErrorBanner';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { formatCurrency, formatDateTime, formatNumber } from '../../lib/format';

function itemTypeLabel(tipo: string) {
  return TIPO_ITEM.find((t) => t.value === tipo)?.label ?? tipo;
}

export function BudgetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [budget, setBudget] = useState<BudgetDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState<OrcamentoStatus | ''>('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    budgetsApi
      .get(Number(id))
      .then(setBudget)
      .catch(() => setError('Não foi possível carregar o orçamento.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function handleExportPdf() {
    if (!budget) return;
    setExporting(true);
    try {
      const blob = await budgetsApi.downloadPdf(budget.id);
      setPdfUrl(URL.createObjectURL(blob));
    } catch {
      setError('Não foi possível gerar o PDF do orçamento.');
    } finally {
      setExporting(false);
    }
  }

  function handleClosePdfPreview() {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
  }

  function handleDownloadPdf() {
    if (!pdfUrl || !budget) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `orcamento-${budget.numero_proposta}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function handleConfirmStatusChange() {
    if (!budget || !nextStatus) return;
    setChangingStatus(true);
    try {
      const updated = await budgetsApi.updateStatus(budget.id, nextStatus);
      setBudget(updated);
      setConfirmOpen(false);
      setNextStatus('');
    } catch {
      setError('Não foi possível alterar o status do orçamento.');
    } finally {
      setChangingStatus(false);
    }
  }

  if (loading) return <Spinner />;
  if (!budget) return <ErrorBanner message={error ?? 'Orçamento não encontrado.'} />;

  const allowedTransitions = ORCAMENTO_TRANSICOES[budget.status];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-extrabold">Orçamento #{budget.numero_proposta}</h1>
            <StatusBadge status={budget.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {budget.client?.nome} — vendedor {budget.vendedor?.nome}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/orcamentos')}>
            Voltar
          </Button>
          {budget.status !== 'cancelado' && (
            <Button variant="secondary" onClick={() => navigate(`/orcamentos/${budget.id}/editar`)}>
              Editar
            </Button>
          )}
          <Button onClick={handleExportPdf} loading={exporting}>
            Ver PDF
          </Button>
        </div>
      </div>

      <ErrorBanner message={error} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Cliente">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="field-label mb-1">Nome</dt>
                <dd>{budget.client?.nome}</dd>
              </div>
              <div>
                <dt className="field-label mb-1">Telefone</dt>
                <dd>
                  ({budget.client?.ddd}) {budget.client?.telefone}
                </dd>
              </div>
              <div>
                <dt className="field-label mb-1">Município/UF</dt>
                <dd>
                  {budget.client?.municipio_nome} / {budget.client?.estado_uf}
                </dd>
              </div>
              <div>
                <dt className="field-label mb-1">E-mail</dt>
                <dd>{budget.client?.email ?? '—'}</dd>
              </div>
            </dl>
          </Card>

          {budget.solar_config && (
            <Card title="Dimensionamento do sistema">
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <dt className="field-label mb-1">Consumo mensal</dt>
                  <dd className="font-semibold">{formatNumber(budget.solar_config.consumo_mensal_kwh)} kWh</dd>
                </div>
                <div>
                  <dt className="field-label mb-1">Potência do sistema</dt>
                  <dd className="font-semibold text-primary">
                    {formatNumber(budget.solar_config.potencia_sistema_kwp, 2)} kWp
                  </dd>
                </div>
                <div>
                  <dt className="field-label mb-1">Qtd. painéis</dt>
                  <dd className="font-semibold">{budget.solar_config.qtd_paineis}</dd>
                </div>
                <div>
                  <dt className="field-label mb-1">Qtd. inversores</dt>
                  <dd className="font-semibold">{budget.solar_config.qtd_inversores}</dd>
                </div>
                <div>
                  <dt className="field-label mb-1">Geração estimada</dt>
                  <dd className="font-semibold">{formatNumber(budget.solar_config.geracao_estimada_kwh)} kWh/mês</dd>
                </div>
                <div>
                  <dt className="field-label mb-1">Tipo de telhado</dt>
                  <dd>{budget.solar_config.tipo_telhado}</dd>
                </div>
                <div>
                  <dt className="field-label mb-1">Orientação</dt>
                  <dd>{budget.solar_config.orientacao}</dd>
                </div>
                <div>
                  <dt className="field-label mb-1">Distribuidora</dt>
                  <dd>{budget.solar_config.distribuidora}</dd>
                </div>
              </dl>
            </Card>
          )}

          <Card title="Itens do orçamento">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-semibold">Tipo</th>
                    <th className="py-2 pr-4 font-semibold">Descrição</th>
                    <th className="py-2 pr-4 font-semibold text-right">Qtd.</th>
                    <th className="py-2 pr-4 font-semibold text-right">Custo unit.</th>
                    <th className="py-2 pr-4 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {budget.itens.map((item) => (
                    <tr key={item.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 pr-4">{itemTypeLabel(item.tipo_item)}</td>
                      <td className="py-2.5 pr-4">{item.descricao}</td>
                      <td className="py-2.5 pr-4 text-right">{formatNumber(item.quantidade)}</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(item.custo_unitario)}</td>
                      <td className="py-2.5 pr-4 text-right font-semibold">{formatCurrency(item.custo_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {budget.observacoes && (
            <Card title="Observações">
              <p className="text-sm whitespace-pre-line">{budget.observacoes}</p>
            </Card>
          )}

          <Card title="Histórico de status">
            {budget.status_history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem histórico registrado.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {budget.status_history.map((h, i) => (
                  <li key={i} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
                    <span>
                      {h.status_anterior ? `${ORCAMENTO_STATUS_LABEL[h.status_anterior]} → ` : ''}
                      <span className="font-semibold text-foreground">
                        {ORCAMENTO_STATUS_LABEL[h.status_novo]}
                      </span>
                      {h.changed_by_nome ? ` por ${h.changed_by_nome}` : ''}
                    </span>
                    <span className="text-muted-foreground">{formatDateTime(h.changed_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Totais">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo total</span>
                <span className="font-semibold">{formatCurrency(budget.custo_total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margem de lucro</span>
                <span className="font-semibold">{budget.margem_lucro_pct}%</span>
              </div>
              <div className="flex justify-between border-t border-border pt-3">
                <span className="text-muted-foreground">Preço final</span>
                <span className="font-display font-extrabold text-primary text-lg">
                  {formatCurrency(budget.preco_final)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground pt-2">
                <span>Validade da proposta</span>
                <span>{budget.validade_dias} dias</span>
              </div>
            </div>
          </Card>

          <Card title="Alterar status">
            {allowedTransitions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este orçamento está em um status final e não pode mais ser alterado.
              </p>
            ) : (
              <div className="space-y-3">
                <Select value={nextStatus} onChange={(e) => setNextStatus(e.target.value as OrcamentoStatus)}>
                  <option value="">Selecione o novo status...</option>
                  {allowedTransitions.map((s) => (
                    <option key={s} value={s}>
                      {ORCAMENTO_STATUS_LABEL[s]}
                    </option>
                  ))}
                </Select>
                <Button
                  className="w-full"
                  variant={nextStatus === 'cancelado' ? 'danger' : 'primary'}
                  disabled={!nextStatus}
                  onClick={() => setConfirmOpen(true)}
                >
                  Atualizar status
                </Button>
                <p className="text-xs text-muted-foreground">
                  Não é possível excluir orçamentos — apenas cancelar.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirmar alteração de status"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant={nextStatus === 'cancelado' ? 'danger' : 'primary'}
              onClick={handleConfirmStatusChange}
              loading={changingStatus}
            >
              Confirmar
            </Button>
          </>
        }
      >
        Tem certeza que deseja mudar o status para{' '}
        <span className="font-semibold text-foreground">
          {nextStatus ? ORCAMENTO_STATUS_LABEL[nextStatus] : ''}
        </span>
        ?
        {nextStatus === 'cancelado' && ' Esta ação não pode ser desfeita.'}
      </Modal>

      <Modal
        open={!!pdfUrl}
        onClose={handleClosePdfPreview}
        title={`Proposta #${budget.numero_proposta}`}
        widthClassName="max-w-4xl"
        footer={
          <>
            <Button variant="secondary" onClick={handleClosePdfPreview}>
              Fechar
            </Button>
            <Button onClick={handleDownloadPdf}>Baixar PDF</Button>
          </>
        }
      >
        {pdfUrl && (
          <iframe
            src={pdfUrl}
            title={`Proposta #${budget.numero_proposta}`}
            className="h-[75vh] w-full rounded-md border border-border bg-white"
          />
        )}
      </Modal>
    </div>
  );
}
