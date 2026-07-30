import type { OrcamentoStatus, ProdutoStatus } from '../types';
import { ORCAMENTO_STATUS_LABEL } from '../types';

const ORCAMENTO_STATUS_CLASS: Record<OrcamentoStatus, string> = {
  rascunho: 'bg-muted-foreground/10 text-muted-foreground border-muted-foreground/30',
  enviado: 'bg-info/10 text-info border-info/30',
  aguardando_resposta: 'bg-warning/10 text-warning border-warning/30',
  confirmado: 'bg-success/10 text-success border-success/30',
  cancelado: 'bg-danger/10 text-danger border-danger/30',
};

export function StatusBadge({ status }: { status: OrcamentoStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${ORCAMENTO_STATUS_CLASS[status]}`}
    >
      {ORCAMENTO_STATUS_LABEL[status]}
    </span>
  );
}

export function ProductStatusBadge({ status }: { status: ProdutoStatus }) {
  const isAtivo = status === 'ativo';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
        isAtivo
          ? 'bg-success/10 text-success border-success/30'
          : 'bg-muted-foreground/10 text-muted-foreground border-muted-foreground/30'
      }`}
    >
      {isAtivo ? 'Ativo' : 'Desativado'}
    </span>
  );
}
