import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError, clientsApi, geoApi } from '../../lib/api';
import type { ClientInput, EstadosResponse, MunicipioOption, TipoResidencia } from '../../types';
import { TIPO_RESIDENCIA } from '../../types';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { Spinner } from '../../components/Spinner';
import { ErrorBanner } from '../../components/ErrorBanner';

const EMPTY: ClientInput = {
  nome: '',
  ddd: '',
  telefone: '',
  cnpj_cpf: '',
  email: '',
  cep: '',
  municipio_cod_ibge: '',
  estado_uf: '',
  endereco: '',
  tipo_residencia: 'Residencial',
};

export function ClientForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<ClientInput>(EMPTY);
  const [estados, setEstados] = useState<EstadosResponse>({});
  const [municipios, setMunicipios] = useState<MunicipioOption[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cnpjLookup, setCnpjLookup] = useState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null,
  });
  const [cepLookup, setCepLookup] = useState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null,
  });

  useEffect(() => {
    geoApi
      .estados()
      .then(setEstados)
      .catch(() => setEstados({}));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    clientsApi
      .get(Number(id))
      .then((client) => {
        setForm({
          nome: client.nome,
          ddd: client.ddd,
          telefone: client.telefone,
          cnpj_cpf: client.cnpj_cpf ?? '',
          email: client.email ?? '',
          cep: client.cep ?? '',
          municipio_cod_ibge: client.municipio_cod_ibge,
          estado_uf: client.estado_uf,
          endereco: client.endereco,
          tipo_residencia: client.tipo_residencia,
        });
      })
      .catch(() => setError('Não foi possível carregar o cliente.'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  useEffect(() => {
    if (!form.estado_uf) {
      setMunicipios([]);
      return;
    }
    geoApi
      .municipios(form.estado_uf)
      .then(setMunicipios)
      .catch(() => setMunicipios([]));
  }, [form.estado_uf]);

  function update<K extends keyof ClientInput>(key: K, value: ClientInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateMany(patch: Partial<ClientInput>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function lookupErrorMessage(err: unknown, notFound: string, generic: string): string {
    if (err instanceof ApiError && err.status === 404) return notFound;
    return generic;
  }

  /** CNPJ.ws só cobre CNPJ (14 dígitos) — CPF não tem consulta pública equivalente. */
  async function handleCnpjBlur() {
    const digits = (form.cnpj_cpf ?? '').replace(/\D/g, '');
    if (digits.length !== 14) return;
    setCnpjLookup({ loading: true, error: null });
    try {
      const data = await clientsApi.lookupCnpj(digits);
      updateMany({
        nome: data.nome || form.nome,
        ddd: data.ddd || form.ddd,
        telefone: data.telefone || form.telefone,
        email: data.email || form.email,
        cep: data.cep || form.cep,
        endereco: data.endereco || form.endereco,
        estado_uf: data.estado_uf || form.estado_uf,
        municipio_cod_ibge: data.municipio_cod_ibge || form.municipio_cod_ibge,
      });
      setCnpjLookup({ loading: false, error: null });
    } catch (err) {
      setCnpjLookup({
        loading: false,
        error: lookupErrorMessage(err, 'CNPJ não encontrado.', 'Não foi possível buscar os dados do CNPJ agora.'),
      });
    }
  }

  async function handleCepBlur() {
    const digits = (form.cep ?? '').replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLookup({ loading: true, error: null });
    try {
      const data = await clientsApi.lookupCep(digits);
      updateMany({
        endereco: data.endereco || form.endereco,
        estado_uf: data.estado_uf || form.estado_uf,
        municipio_cod_ibge: data.municipio_cod_ibge || form.municipio_cod_ibge,
      });
      setCepLookup({ loading: false, error: null });
    } catch (err) {
      setCepLookup({
        loading: false,
        error: lookupErrorMessage(err, 'CEP não encontrado.', 'Não foi possível buscar o endereço agora.'),
      });
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: ClientInput = {
        ...form,
        cnpj_cpf: form.cnpj_cpf || null,
        email: form.email || null,
        cep: form.cep || null,
      };
      if (isEdit) {
        await clientsApi.update(Number(id), payload);
      } else {
        await clientsApi.create(payload);
      }
      navigate('/clientes');
    } catch {
      setError('Não foi possível salvar o cliente. Verifique os campos obrigatórios.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-extrabold">
          {isEdit ? 'Editar cliente' : 'Novo cliente'}
        </h1>
        <p className="text-sm text-muted-foreground">Dados de cadastro e endereço do cliente.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card title="Dados do cliente">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="Nome"
                required
                value={form.nome}
                onChange={(e) => update('nome', e.target.value)}
              />
            </div>
            <Input
              label="DDD"
              required
              maxLength={2}
              placeholder="Ex: 62"
              value={form.ddd}
              onChange={(e) => update('ddd', e.target.value)}
            />
            <Input
              label="Telefone"
              required
              placeholder="Ex: 999999999"
              value={form.telefone}
              onChange={(e) => update('telefone', e.target.value)}
            />
            <Input
              label="CNPJ/CPF"
              value={form.cnpj_cpf ?? ''}
              onChange={(e) => update('cnpj_cpf', e.target.value)}
              onBlur={handleCnpjBlur}
              hint={cnpjLookup.loading ? 'Buscando dados do CNPJ...' : 'CNPJ (14 dígitos) busca os dados automaticamente'}
              error={cnpjLookup.error ?? undefined}
            />
            <Input
              label="Email"
              type="email"
              value={form.email ?? ''}
              onChange={(e) => update('email', e.target.value)}
            />
            <Input
              label="CEP"
              value={form.cep ?? ''}
              onChange={(e) => update('cep', e.target.value)}
              onBlur={handleCepBlur}
              hint={cepLookup.loading ? 'Buscando endereço...' : undefined}
              error={cepLookup.error ?? undefined}
            />
            <Select
              label="Tipo Residência"
              required
              value={form.tipo_residencia}
              onChange={(e) => update('tipo_residencia', e.target.value as TipoResidencia)}
            >
              {TIPO_RESIDENCIA.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            <Select
              label="Estado"
              required
              value={form.estado_uf}
              onChange={(e) => {
                update('estado_uf', e.target.value);
                update('municipio_cod_ibge', '');
              }}
            >
              <option value="">Selecione...</option>
              {Object.values(estados).map((uf) => (
                <option key={uf.sigla} value={uf.sigla}>
                  {uf.nome} ({uf.sigla})
                </option>
              ))}
            </Select>
            <Select
              label="Município"
              required
              value={form.municipio_cod_ibge}
              onChange={(e) => update('municipio_cod_ibge', e.target.value)}
              disabled={!form.estado_uf}
            >
              <option value="">Selecione...</option>
              {municipios.map((m) => (
                <option key={m.cod_ibge} value={m.cod_ibge}>
                  {m.nome}
                </option>
              ))}
            </Select>
            <div className="sm:col-span-2">
              <Input
                label="Endereço"
                required
                value={form.endereco}
                onChange={(e) => update('endereco', e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={() => navigate('/clientes')}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Salvar
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
