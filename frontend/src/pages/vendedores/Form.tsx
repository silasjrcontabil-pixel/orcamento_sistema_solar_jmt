import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../../lib/api';
import type { UserAccount } from '../../types';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';

export function VendedorForm() {
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [criado, setCriado] = useState<UserAccount | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const user = await usersApi.create({ nome, senha });
      setCriado(user);
    } catch {
      setError('Não foi possível cadastrar o vendedor. Verifique os campos.');
    } finally {
      setSaving(false);
    }
  }

  if (criado) {
    return (
      <div className="space-y-6 max-w-lg">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Vendedor cadastrado</h1>
        </div>
        <Card>
          <p className="text-sm text-muted-foreground mb-4">
            Repasse os dados de acesso abaixo para o vendedor — a senha não fica mais visível depois.
          </p>
          <dl className="space-y-2 text-sm mb-6">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Nome</dt>
              <dd className="font-semibold">{criado.nome}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Usuário</dt>
              <dd className="font-semibold">{criado.username}</dd>
            </div>
          </dl>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setCriado(null);
                setNome('');
                setSenha('');
              }}
            >
              Cadastrar outro
            </Button>
            <Button onClick={() => navigate('/vendedores')}>Ver vendedores</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Novo vendedor</h1>
        <p className="text-sm text-muted-foreground">
          O usuário de login é gerado automaticamente a partir do primeiro nome, em minúsculas.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card title="Dados de acesso">
          <div className="space-y-4">
            <Input
              label="Nome completo"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: João Pereira"
            />
            <Input
              label="Senha"
              type="password"
              required
              minLength={4}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>

          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={() => navigate('/vendedores')}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Cadastrar
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
