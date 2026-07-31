import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usersApi } from '../../lib/api';
import type { UserAccount } from '../../types';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Spinner } from '../../components/Spinner';
import { EmptyState } from '../../components/EmptyState';
import { ErrorBanner } from '../../components/ErrorBanner';
import { formatDateTime } from '../../lib/format';

export function VendedoresList() {
  const [vendedores, setVendedores] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    usersApi
      .list()
      .then(setVendedores)
      .catch(() => setError('Não foi possível carregar a lista de vendedores.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Vendedores</h1>
          <p className="text-sm text-muted-foreground">Usuários com acesso ao portal para captar e gerenciar vendas.</p>
        </div>
        <Link to="/vendedores/novo">
          <Button>+ Novo vendedor</Button>
        </Link>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <Spinner />
      ) : vendedores.length === 0 ? (
        <EmptyState
          title="Nenhum vendedor cadastrado"
          description="Cadastre o primeiro vendedor para liberar o acesso dele ao portal."
          action={
            <Link to="/vendedores/novo">
              <Button>+ Novo vendedor</Button>
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
                  <th className="py-3 pr-4 font-semibold">Usuário</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-6 font-semibold">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {vendedores.map((v) => (
                  <tr key={v.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                    <td className="py-3 pl-6 pr-4 font-medium">{v.nome}</td>
                    <td className="py-3 pr-4 text-muted-foreground">@{v.username}</td>
                    <td className="py-3 pr-4">
                      <span className={v.ativo ? 'text-success' : 'text-muted-foreground'}>
                        {v.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-3 pr-6 text-muted-foreground">{formatDateTime(v.created_at)}</td>
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
