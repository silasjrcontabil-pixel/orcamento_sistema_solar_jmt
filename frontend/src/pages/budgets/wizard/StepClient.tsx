import { useEffect, useState } from 'react';
import { clientsApi } from '../../../lib/api';
import type { Client } from '../../../types';
import { Card } from '../../../components/Card';
import { Input } from '../../../components/Input';
import { Spinner } from '../../../components/Spinner';
import { useDebounce } from '../../../lib/useDebounce';

export function StepClient({
  selected,
  onSelect,
}: {
  selected: Client | null;
  onSelect: (client: Client) => void;
}) {
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setLoading(true);
    clientsApi
      .list({ search: debouncedSearch || undefined })
      .then(setClients)
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, [debouncedSearch]);

  return (
    <Card title="1. Selecionar cliente" subtitle="Escolha o cliente para este orçamento.">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Buscar cliente"
              placeholder="Nome, telefone, CPF/CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <a href="/clientes/novo" target="_blank" rel="noreferrer" className="btn-secondary whitespace-nowrap">
            + Novo cliente (nova aba)
          </a>
        </div>

        {loading ? (
          <Spinner />
        ) : clients.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto rounded-md border border-border divide-y divide-border">
            {clients.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => onSelect(c)}
                className={`w-full text-left px-4 py-3 transition-colors hover:bg-secondary ${
                  selected?.id === c.id ? 'bg-primary/10' : ''
                }`}
              >
                <p className="font-semibold text-foreground text-sm">{c.nome}</p>
                <p className="text-xs text-muted-foreground">
                  ({c.ddd}) {c.telefone} — {c.municipio_nome ?? c.municipio_cod_ibge}/{c.estado_uf}
                </p>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="rounded-md border border-primary/40 bg-primary/5 px-4 py-3 text-sm">
            Cliente selecionado: <span className="font-semibold text-primary">{selected.nome}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
