import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, usersApi } from '../../lib/api';
import type { UserAccount } from '../../types';
import { useAuthStore } from '../../store/auth';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { Spinner } from '../../components/Spinner';
import { EmptyState } from '../../components/EmptyState';
import { ErrorBanner } from '../../components/ErrorBanner';
import { formatDateTime } from '../../lib/format';

export function VendedoresList() {
  const currentUsername = useAuthStore((s) => s.user?.username);
  // Só o Jheferson pode trocar senha de outros vendedores e ativar/desativar contas.
  const isAdmin = currentUsername === 'jheferson';

  const [vendedores, setVendedores] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [senhaAlvo, setSenhaAlvo] = useState<UserAccount | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [senhaSaving, setSenhaSaving] = useState(false);
  const [senhaError, setSenhaError] = useState<string | null>(null);

  const [statusAlvo, setStatusAlvo] = useState<UserAccount | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  function carregar() {
    setLoading(true);
    setError(null);
    usersApi
      .list()
      .then(setVendedores)
      .catch(() => setError('Não foi possível carregar a lista de vendedores.'))
      .finally(() => setLoading(false));
  }

  useEffect(carregar, []);

  function abrirModalSenha(vendedor: UserAccount) {
    setSenhaAlvo(vendedor);
    setNovaSenha('');
    setSenhaError(null);
  }

  async function confirmarNovaSenha() {
    if (!senhaAlvo) return;
    setSenhaSaving(true);
    setSenhaError(null);
    try {
      await usersApi.updatePassword(senhaAlvo.id, novaSenha);
      setSenhaAlvo(null);
    } catch (err) {
      setSenhaError(
        err instanceof ApiError ? err.message : 'Não foi possível trocar a senha. Tente novamente.',
      );
    } finally {
      setSenhaSaving(false);
    }
  }

  async function confirmarStatus() {
    if (!statusAlvo) return;
    setStatusSaving(true);
    setStatusError(null);
    try {
      const atualizado = await usersApi.updateStatus(statusAlvo.id, !statusAlvo.ativo);
      setVendedores((prev) => prev.map((v) => (v.id === atualizado.id ? atualizado : v)));
      setStatusAlvo(null);
    } catch (err) {
      setStatusError(
        err instanceof ApiError ? err.message : 'Não foi possível atualizar o status. Tente novamente.',
      );
    } finally {
      setStatusSaving(false);
    }
  }

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
                  {isAdmin && <th className="py-3 pr-6 font-semibold text-right">Ações</th>}
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
                    {isAdmin && (
                      <td className="py-3 pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline"
                            onClick={() => abrirModalSenha(v)}
                          >
                            Nova senha
                          </button>
                          <button
                            type="button"
                            className="text-xs text-danger hover:underline disabled:opacity-40 disabled:hover:no-underline"
                            disabled={v.username === currentUsername && v.ativo}
                            title={
                              v.username === currentUsername && v.ativo
                                ? 'Você não pode desativar sua própria conta'
                                : undefined
                            }
                            onClick={() => {
                              setStatusAlvo(v);
                              setStatusError(null);
                            }}
                          >
                            {v.ativo ? 'Desativar' : 'Ativar'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={!!senhaAlvo}
        onClose={() => setSenhaAlvo(null)}
        title={`Nova senha para ${senhaAlvo?.nome ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSenhaAlvo(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmarNovaSenha} loading={senhaSaving} disabled={novaSenha.trim().length < 4}>
              Salvar
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Senha"
            type="password"
            minLength={4}
            autoFocus
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            hint="Mínimo de 4 caracteres."
          />
          <ErrorBanner message={senhaError} />
        </div>
      </Modal>

      <Modal
        open={!!statusAlvo}
        onClose={() => setStatusAlvo(null)}
        title={statusAlvo?.ativo ? 'Desativar vendedor' : 'Ativar vendedor'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setStatusAlvo(null)}>
              Cancelar
            </Button>
            <Button
              variant={statusAlvo?.ativo ? 'danger' : 'primary'}
              onClick={confirmarStatus}
              loading={statusSaving}
            >
              Confirmar
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p>
            Tem certeza que deseja {statusAlvo?.ativo ? 'desativar' : 'ativar'}{' '}
            <span className="font-semibold text-foreground">{statusAlvo?.nome}</span>?
            {statusAlvo?.ativo && ' O vendedor não conseguirá mais fazer login.'}
          </p>
          <ErrorBanner message={statusError} />
        </div>
      </Modal>
    </div>
  );
}
