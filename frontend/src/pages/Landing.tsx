import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { publicLeadsApi } from '../lib/api';
import type {
  ConsumoMedioMensal,
  FaixaParcelaMensal,
  InteresseLead,
  PublicLeadInput,
  QuandoPretendeInvestir,
  TipoResidencia,
} from '../types';
import {
  CONSUMO_MEDIO_MENSAL,
  FAIXA_PARCELA_MENSAL,
  INTERESSE_LEAD,
  QUANDO_PRETENDE_INVESTIR,
  TIPO_RESIDENCIA,
} from '../types';
import logo from '../assets/logo.jpeg';
import heroSolar from '../assets/hero-solar.jpg';

const WHATSAPP_NUMERO = '556292863606';
const TELEFONE_EXIBICAO = '(62) 9 9286-3606';
const EMAIL_CONTATO = 'comercial@jmtenergiasolar.com.br';

const EMPTY_FORM: PublicLeadInput = {
  nome: '',
  cidade: '',
  telefone: '',
  email: '',
  interesse: 'Energia Solar',
  mensagem: '',
};

const selectClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';
const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5';

function Section({
  id,
  className = '',
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`px-4 py-10 sm:px-6 sm:py-16 lg:px-8 ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

export function Landing() {
  const [form, setForm] = useState<PublicLeadInput>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const original = document.title;
    document.title = 'JMT Energia Solar';
    return () => {
      document.title = original;
    };
  }, []);

  function update<K extends keyof PublicLeadInput>(key: K, value: PublicLeadInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErro(null);
    try {
      await publicLeadsApi.create({
        ...form,
        email: form.email || undefined,
        mensagem: form.mensagem || undefined,
      });
      setEnviado(true);
    } catch {
      setErro('Não foi possível enviar sua solicitação agora. Tente novamente em instantes ou fale no WhatsApp.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2.5 sm:px-6 sm:py-3 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <img
              src={logo}
              alt="JMT Energia Solar"
              className="h-8 w-8 shrink-0 rounded-full object-cover sm:h-10 sm:w-10"
            />
            <span className="truncate font-display text-xs font-extrabold leading-tight sm:text-lg">
              JMT ENERGIA SOLAR
            </span>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
            <a href="#solucoes" className="hover:text-gray-900">
              Soluções
            </a>
            <a href="#por-que-jmt" className="hover:text-gray-900">
              Por que a JMT?
            </a>
            <a href="#contato" className="hover:text-gray-900">
              Contato
            </a>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <a href="#contato" className="btn-primary hidden sm:inline-flex">
              Solicitar Orçamento
            </a>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-gray-300 px-2.5 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-primary hover:text-primary sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
            >
              Acesso Vendedores
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gray-950 text-white">
        <img
          src={heroSolar}
          alt="Instalação de painéis solares ao entardecer"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/80 to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <p className="text-xs font-bold uppercase tracking-widest text-primary sm:text-sm">
            Energia Solar &amp; Mobilidade Elétrica
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
            Soluções inteligentes para um futuro{' '}
            <span className="text-primary">mais econômico e sustentável</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm text-gray-300 sm:text-base">
            Projetos completos de energia solar fotovoltaica e mobilidade elétrica para
            transformar sua rotina, reduzir custos e valorizar seu patrimônio.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
            <a href="#contato" className="btn-primary">
              Solicitar Orçamento
            </a>
            <a
              href={`https://wa.me/${WHATSAPP_NUMERO}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/30 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-primary hover:text-primary"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Soluções */}
      <Section id="solucoes">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8">
            <p className="text-3xl">☀️</p>
            <h3 className="mt-3 font-display text-xl font-bold text-primary">Energia Solar</h3>
            <p className="mt-2 text-sm text-gray-600">
              Soluções completas em energia fotovoltaica para reduzir sua conta de luz e
              valorizar seu patrimônio.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8">
            <p className="text-3xl">⚡</p>
            <h3 className="mt-3 font-display text-xl font-bold text-primary">Mobilidade Elétrica</h3>
            <p className="mt-2 text-sm text-gray-600">
              Bicicletas e triciclos elétricos para mais economia, praticidade e
              sustentabilidade no seu dia a dia.
            </p>
          </div>
        </div>
      </Section>

      {/* Por que escolher a JMT */}
      <Section id="por-que-jmt" className="bg-gray-950 text-white">
        <h2 className="text-center font-display text-2xl font-extrabold sm:text-3xl">
          Por que escolher a <span className="text-primary">JMT</span>?
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              titulo: 'Atendimento personalizado',
              desc: 'Cada cliente recebe direção e orientação de acordo com sua necessidade.',
            },
            {
              titulo: 'Parceiros selecionados',
              desc: 'Trabalhamos apenas com marcas e parceiros que garantem qualidade e confiabilidade.',
            },
            {
              titulo: 'Soluções modernas',
              desc: 'Tecnologia e inovação para oferecer o melhor em energia e mobilidade.',
            },
            {
              titulo: 'Suporte próximo',
              desc: 'Acompanhamento desde o primeiro contato até o pós-venda, sempre que precisar.',
            },
          ].map((item) => (
            <div key={item.titulo} className="rounded-xl border border-white/10 bg-white/5 p-6">
              <h4 className="font-display font-bold text-primary">{item.titulo}</h4>
              <p className="mt-2 text-sm text-gray-300">{item.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Formulário de contato */}
      <Section id="contato">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-gray-900 sm:text-3xl">
              Fale com um <span className="text-primary">especialista</span>
            </h2>
            <p className="mt-3 text-gray-600">
              Preencha o formulário e nossa equipe entra em contato pra te ajudar a encontrar a
              melhor solução.
            </p>

            <dl className="mt-8 space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-3">
                <dt className="font-semibold text-gray-900">Telefone/WhatsApp:</dt>
                <dd>{TELEFONE_EXIBICAO}</dd>
              </div>
              <div className="flex items-center gap-3">
                <dt className="font-semibold text-gray-900">E-mail:</dt>
                <dd>{EMAIL_CONTATO}</dd>
              </div>
              <div className="flex items-center gap-3">
                <dt className="font-semibold text-gray-900">Localização:</dt>
                <dd>Centro, Goiânia - GO</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 sm:p-8">
            {enviado ? (
              <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                <p className="text-4xl">✅</p>
                <h3 className="mt-4 font-display text-xl font-bold text-gray-900">
                  Recebemos sua solicitação!
                </h3>
                <p className="mt-2 max-w-sm text-sm text-gray-600">
                  Obrigado pelo contato. Em breve alguém da nossa equipe vai falar com você.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Nome completo *</label>
                    <input
                      required
                      className={selectClass}
                      value={form.nome}
                      onChange={(e) => update('nome', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Cidade *</label>
                    <input
                      required
                      className={selectClass}
                      value={form.cidade}
                      onChange={(e) => update('cidade', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>WhatsApp *</label>
                    <input
                      required
                      placeholder="(62) 99999-9999"
                      className={selectClass}
                      value={form.telefone}
                      onChange={(e) => update('telefone', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>E-mail</label>
                    <input
                      type="email"
                      className={selectClass}
                      value={form.email ?? ''}
                      onChange={(e) => update('email', e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Tenho interesse em *</label>
                    <select
                      required
                      className={selectClass}
                      value={form.interesse}
                      onChange={(e) => update('interesse', e.target.value as InteresseLead)}
                    >
                      {INTERESSE_LEAD.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Consumo médio mensal de energia</label>
                    <select
                      className={selectClass}
                      value={form.consumo_medio_mensal ?? ''}
                      onChange={(e) =>
                        update('consumo_medio_mensal', (e.target.value || undefined) as ConsumoMedioMensal)
                      }
                    >
                      <option value="">Prefiro não informar</option>
                      {CONSUMO_MEDIO_MENSAL.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Tipo de projeto</label>
                    <select
                      className={selectClass}
                      value={form.tipo_projeto ?? ''}
                      onChange={(e) => update('tipo_projeto', (e.target.value || undefined) as TipoResidencia)}
                    >
                      <option value="">Prefiro não informar</option>
                      {TIPO_RESIDENCIA.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Quando pretende investir?</label>
                    <select
                      className={selectClass}
                      value={form.quando_pretende_investir ?? ''}
                      onChange={(e) =>
                        update('quando_pretende_investir', (e.target.value || undefined) as QuandoPretendeInvestir)
                      }
                    >
                      <option value="">Prefiro não informar</option>
                      {QUANDO_PRETENDE_INVESTIR.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Faixa de parcela mensal</label>
                    <select
                      className={selectClass}
                      value={form.faixa_parcela_mensal ?? ''}
                      onChange={(e) =>
                        update('faixa_parcela_mensal', (e.target.value || undefined) as FaixaParcelaMensal)
                      }
                    >
                      <option value="">Prefiro não informar</option>
                      {FAIXA_PARCELA_MENSAL.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Como podemos ajudar? (opcional)</label>
                    <textarea
                      className={selectClass}
                      rows={3}
                      value={form.mensagem ?? ''}
                      onChange={(e) => update('mensagem', e.target.value)}
                    />
                  </div>
                </div>

                {erro && <p className="text-sm text-red-600">{erro}</p>}

                <button type="submit" disabled={submitting} className="btn-primary w-full">
                  {submitting ? 'Enviando...' : 'Quero atendimento'}
                </button>
              </form>
            )}
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="JMT Energia Solar" className="h-9 w-9 rounded-full object-cover" />
            <div>
              <p className="font-display font-bold text-gray-900">JMT ENERGIA SOLAR</p>
              <p className="text-xs text-gray-500">Energia que move o futuro.</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <p>{TELEFONE_EXIBICAO} · {EMAIL_CONTATO}</p>
            <p>Centro, Goiânia - GO</p>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-6xl text-xs text-gray-400">
          © {new Date().getFullYear()} JMT Energia Solar. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
