import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clientsApi, geoApi } from '../../lib/api';
import type { Client, EstadosResponse, MunicipioOption } from '../../types';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { Spinner } from '../../components/Spinner';
import { EmptyState } from '../../components/EmptyState';
import { ErrorBanner } from '../../components/ErrorBanner';
import { useDebounce } from '../../lib/useDebounce';

export function ClientsList() {
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [estados, setEstados] = useState<EstadosResponse>({});
  const [municipios, setMunicipios] = useState<MunicipioOption[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    geoApi
      .estados()
      .then(setEstados)
      .catch(() => setEstados({}));
  }, []);

  useEffect(() => {
    if (!estado) {
      setMunicipios([]);
      setMunicipio('');
      return;
    }
    geoApi
      .municipios(estado)
      .then(setMunicipios)
      .catch(() => setMunicipios([]));
    setMunicipio('');
  }, [estado]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    clientsApi
      .list({ search: debouncedSearch || undefined, estado: estado || undefined, municipio: municipio || undefined })
      .then(setClients)
      .catch(() => setError('Não foi possível carregar a lista de clientes.'))
      .finally(() => setLoading(false));
  }, [debouncedSearch, estado, municipio]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Clientes</h1>
          <p className="text-sm text-muted-foreground">Cadastro e busca de clientes.</p>
        </div>
        <Link to="/clientes/novo">
          <Button>+ Novo cliente</Button>
        </Link>
      </div>

      <Card goldTop={false} className="!bg-background-soft">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label="Buscar"
            placeholder="Nome, telefone, CPF/CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select label="Estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos os estados</option>
            {Object.values(estados).map((uf) => (
              <option key={uf.sigla} value={uf.sigla}>
                {uf.nome} ({uf.sigla})
              </option>
            ))}
          </Select>
          <Select
            label="Município"
            value={municipio}
            onChange={(e) => setMunicipio(e.target.value)}
            disabled={!estado}
          >
            <option value="">Todos os municípios</option>
            {municipios.map((m) => (
              <option key={m.cod_ibge} value={m.cod_ibge}>
                {m.nome}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <ErrorBanner message={error} />

      {loading ? (
        <Spinner />
      ) : clients.length === 0 ? (
        <EmptyState
          title="Nenhum cliente encontrado"
          description="Ajuste os filtros ou cadastre um novo cliente."
          action={
            <Link to="/clientes/novo">
              <Button>+ Novo cliente</Button>
            </Link>
          }
        />
      ) : (
        <Card goldTop={false} className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-3 pl-6 pr-4 font-semibold">Nome</th>
                  <th className="py-3 pr-4 font-semibold">Telefone</th>
                  <th className="py-3 pr-4 font-semibold">Município/UF</th>
                  <th className="py-3 pr-4 font-semibold">Tipo</th>
                  <th className="py-3 pr-6 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                    <td className="py-3 pl-6 pr-4 font-medium">{c.nome}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      ({c.ddd}) {c.telefone}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {c.municipio_nome ?? c.municipio_cod_ibge} / {c.estado_uf}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{c.tipo_residencia}</td>
                    <td className="py-3 pr-6 text-right">
                      <Link to={`/clientes/${c.id}/editar`} className="btn-ghost">
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
