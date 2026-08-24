import { useEffect, useState } from 'react';
import { ApiError, leadsApi } from '../../lib/api';
import type { Lead, LeadStatus } from '../../types';
import { LEAD_STATUS } from '../../types';
import { Card } from '../../components/Card';
import { Select } from '../../components/Select';
import { Spinner } from '../../components/Spinner';
import { EmptyState } from '../../components/EmptyState';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Modal } from '../../components/Modal';
import { formatDateTime } from '../../lib/format';

const STATUS_CLASS: Record<LeadStatus, string> = {
  Novo: 'text-info',
  'Em Contato': 'text-warning',
  'Orçamento Enviado': 'text-warning',
  Convertido: 'text-success',
  Descartado: 'text-muted-foreground',
};

export function LeadsList() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [detalhe, setDetalhe] = useState<Lead | null>(null);

  function carregar() {
    setLoading(true);
    setError(null);
    leadsApi
      .list()
      .then(setLeads)
      .catch(() => setError('Não foi possível carregar os pedidos do site.'))
      .finally(() => setLoading(false));
  }

  useEffect(carregar, []);

  async function handleStatusChange(lead: Lead, status: LeadStatus) {
    setSavingId(lead.id);
    setError(null);
    try {
      const atualizado = await leadsApi.updateStatus(lead.id, status);
      setLeads((prev) => prev.map((l) => (l.id === atualizado.id ? atualizado : l)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível atualizar o status.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Pedidos do Site</h1>
        <p className="text-sm text-muted-foreground">
          Solicitações recebidas pelo formulário de contato da página institucional.
        </p>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <Spinner />
      ) : leads.length === 0 ? (
        <EmptyState
          title="Nenhum pedido ainda"
          description="Quando alguém preencher o formulário do site, o pedido aparece aqui."
        />
      ) : (
        <Card goldTop={false} className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-3 pl-6 pr-4 font-semibold">Nome</th>
                  <th className="py-3 pr-4 font-semibold">Contato</th>
                  <th className="py-3 pr-4 font-semibold">Cidade</th>
                  <th className="py-3 pr-4 font-semibold">Interesse</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-4 font-semibold">Recebido em</th>
                  <th className="py-3 pr-6 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                    <td className="py-3 pl-6 pr-4 font-medium">{l.nome}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      <div>{l.telefone}</div>
                      {l.email && <div className="text-xs">{l.email}</div>}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{l.cidade}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{l.interesse}</td>
                    <td className="py-3 pr-4">
                      <Select
                        value={l.status}
                        disabled={savingId === l.id}
                        onChange={(e) => handleStatusChange(l, e.target.value as LeadStatus)}
                        className={`!py-1.5 !text-xs font-semibold ${STATUS_CLASS[l.status]}`}
                      >
                        {LEAD_STATUS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDateTime(l.created_at)}</td>
                    <td className="py-3 pr-6 text-right">
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => setDetalhe(l)}
                      >
                        Ver detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={!!detalhe}
        onClose={() => setDetalhe(null)}
        title={detalhe?.nome ?? ''}
        widthClassName="max-w-2xl"
      >
        {detalhe && (
          <dl className="grid grid-cols-1 gap-3 text-sm text-foreground sm:grid-cols-2">
            <div>
              <dt className="field-label mb-1">Cidade</dt>
              <dd>{detalhe.cidade}</dd>
            </div>
            <div>
              <dt className="field-label mb-1">Telefone</dt>
              <dd>{detalhe.telefone}</dd>
            </div>
            <div>
              <dt className="field-label mb-1">E-mail</dt>
              <dd>{detalhe.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="field-label mb-1">Interesse</dt>
              <dd>{detalhe.interesse}</dd>
            </div>
            <div>
              <dt className="field-label mb-1">Consumo médio mensal</dt>
              <dd>{detalhe.consumo_medio_mensal ?? '—'}</dd>
            </div>
            <div>
              <dt className="field-label mb-1">Tipo de projeto</dt>
              <dd>{detalhe.tipo_projeto ?? '—'}</dd>
            </div>
            <div>
              <dt className="field-label mb-1">Quando pretende investir</dt>
              <dd>{detalhe.quando_pretende_investir ?? '—'}</dd>
            </div>
            <div>
              <dt className="field-label mb-1">Faixa de parcela mensal</dt>
              <dd>{detalhe.faixa_parcela_mensal ?? '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="field-label mb-1">Mensagem</dt>
              <dd className="whitespace-pre-line">{detalhe.mensagem || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="field-label mb-1">Recebido em</dt>
              <dd>{formatDateTime(detalhe.created_at)}</dd>
            </div>
          </dl>
        )}
      </Modal>
    </div>
  );
}
