# Briefing de Projeto — Sistema de Orçamentos (Uso Interno)

> Este documento serve como prompt/briefing para uma IA de desenvolvimento (ex: Claude Code, Cursor, etc.) construir o sistema. A stack técnica já está definida abaixo — a seção "Descrição completa do sistema" deve ser preenchida com todos os detalhes de funcionamento antes de enviar para a IA.

---

## 1. Contexto técnico (já definido — não alterar sem necessidade)

**Tipo de aplicação:** Sistema interno, sem acesso público. Poucos usuários (uso próprio/equipe pequena).

**Backend:**
- Linguagem/Framework: Python + FastAPI
- Deploy: Render (plano free)
- Geração de PDF: `reportlab` ou `weasyprint` (orçamentos em PDF)
- Autenticação: login simples (usuário/senha) protegendo a API, já que a URL fica publicamente acessível mesmo sem divulgação

**Banco de dados:**
- PostgreSQL via Supabase (plano free, permanente — não usar o Postgres free do Render, que expira em 30 dias)
- Volume esperado: baixo (até ~50 itens de estoque, poucos clientes/orçamentos)

**Frontend:**
- Web app responsivo (React ou similar)
- Também funciona como PWA (manifest.json + service worker) para "instalar" no Android (Chrome) e iPhone (Safari → Adicionar à Tela de Início), sem precisar de App Store
- Deploy: Vercel ou Netlify (plano free)
- Gráficos: `recharts` (ou biblioteca equivalente)

**Integração:**
- Frontend consome a API do backend via HTTP/REST
- CORS configurado no FastAPI liberando apenas o domínio do frontend

---

## 2. Descrição completa do sistema

> ⬇️ Sistema terá o objetivo servir para três socios cada um com usuario e senha realizar cadastro de clientes, cadastrar produtos, e lançar orçamentos de produtos, mudar status de orçamentos de enviado, esperando respota, confirmado, sistema precisará ter um CRM (em português, Gestão de Relacionamento com o Cliente), graficos e gestão dos clientes inclusive mostrando por Vendedor (os proprios socios)

**2.1 Visão geral do sistema**

> ⬇️ Sistema precisará ser web e também será convertido em app via PWA, nele os vendedores/socios farão login com seus usuarios e poderão criar produtos, criar clientes, criar orçamentos de vendas, exportar os orçamentos de vendas, verificar como estão os status de seus orçamentos, filtrando por vendedores, por periodos, e ter graficos.


**2.2 Cadastro de produtos / estoque**

> Produtos terão tres tipos de produtos ["Paineis Solares", "Inversores", "Outros Tipos"]
    >> Paineis Solares precisam ter preenchidos as seguintes informações ["Nome", "Modelo", "Composição/Estrutura interna", "Potencia em WP", "Marca", "Altura", "Largura", "Peso"], Campos obrigatorios ["Nome", "Modelo", "Composição/Estrutura interna","Potencia em WP", "Status Ativo ou Desativado"]
    >> Inversores precisam ter ["Nome", "Modelo", "Quantidade de kW", "Status Ativo ou Desativado"] todos são obrigatorios
    >> Outros Tipos seriam produtos diversos e fora da proposta Energia Solar pode ser des de Bicicletar eletricas, Moveis ..... Sugestão de campos ["Nome", "Modelo", "Marca", "Ano Fabricação", "Status Ativo ou Desativado"] campos obrigatórios ["Nome", "Marca", "Status Ativo ou Desativado"]


**2.3 Cadastro de clientes**

> Clientes precisam ter as seguintes informações ["Nome", "DDD", "Telefone", "CNPJ/CPF", "Email", "CEP", "Municipio", "Estado", "Endereço", {"Tipo Residencia": ["<select class="w-full bg-secondary border border-border rounded-md px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors font-body"><option value="Residencial">Residencial</option><option value="Comercial">Comercial</option><option value="Industrial">Industrial</option><option value="Rural">Rural</option></select>"]}], campos obrigatorios ["Nome", "DDD", "Telefone", "Municipio" , "Estado", "Endereço", "Tipo Residencia"], estados e municipios olhar os arquivos @estados.json e municipios.json

**2.4 Criação de orçamento**

> Para criação de orçamento selecione o cliente primeiro, depois preciso seja dinamico e não travado, sugiro ter duas opções (Orçamento para sistema solar completo || Orçamentos itens individuais)
    >>Orçamento para sistema solar completo: 
        >>>1 > Consumo & Instalação: tipo isso <div class="p-6"><h3 class="font-display font-bold text-foreground mb-1">Consumo &amp; Instalação</h3><p class="text-sm text-muted-foreground mb-5">Dados para dimensionamento automático do sistema.</p><div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div class="space-y-1.5"><label class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Consumo mensal</label><div class="relative"><input class="w-full bg-secondary border border-border rounded-md px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors font-body" type="number" placeholder="Ex: 500" value=""><span class="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-primary">kWh</span></div></div><div class="space-y-1.5"><label class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Valor da conta</label><div class="relative"><input class="w-full bg-secondary border border-border rounded-md px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors font-body" type="number" placeholder="Ex: 600" value=""><span class="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-primary">R$</span></div></div><div class="space-y-1.5"><label class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo de telhado</label><select class="w-full bg-secondary border border-border rounded-md px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary cursor-pointer font-body"><option value="Cerâmico (Francês)">Cerâmico (Francês)</option><option value="Fibrocimento">Fibrocimento</option><option value="Metálico">Metálico</option><option value="Laje">Laje</option><option value="Solo">Solo</option></select></div><div class="space-y-1.5"><label class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Orientação</label><select class="w-full bg-secondary border border-border rounded-md px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary cursor-pointer font-body"><option value="Norte (ideal)">Norte (ideal)</option><option value="Nordeste">Nordeste</option><option value="Noroeste">Noroeste</option><option value="Leste/Oeste">Leste/Oeste</option></select></div><div class="space-y-1.5"><label class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Distribuidora</label><select class="w-full bg-secondary border border-border rounded-md px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary cursor-pointer font-body"><option value="Enel SP">Enel SP</option><option value="CPFL">CPFL</option><option value="Energisa">Energisa</option><option value="Cemig">Cemig</option><option value="Equatorial">Equatorial</option><option value="Coelba">Coelba</option><option value="Outro">Outro</option></select></div><div class="space-y-1.5"><label class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Área disponível (m²)</label><input class="w-full bg-secondary border border-border rounded-md px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors font-body" type="number" value=""></div><div class="sm:col-span-2 space-y-1.5"><label class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Observações</label><textarea class="w-full bg-secondary border border-border rounded-md px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors font-body resize-y min-h-[80px]"></textarea></div></div></div>
        >>>2 > Equipamentos:
                > Paineis Solares: Escolher Placas dos produtos ativos, Potência da placa (Wp) vai trazer de acordo com o cadastrado no produto mas campo pode ser editado, quantidade de placas deve trazer automatico mas estar disponivel para cadatrar manual
                    > Como calcular quantidade de placas = (Kwh medio mensal informado item anterior / radiação media por regiaão) * Potencia WP da Placa, sempre arrendondar para cima, só posso ter um numero sem virgula
                    > Como Calcular radiação media por região, pegar o estado e municipio e achar latitude e longitude na tabela Munipios_Longitude.xlsx, depois pegando a orientação de 1 > Consumo & Instalação procurar um dos arquivos da pasta ./"Calcular Radicao"/Irradiação ..., procurar por latitude e longitude a radição media ano(RMA) do municipio e pegar RMA / 1000 = Horas de Sol Pleno (HSP), depois pegar HSP * 30 dias * 0,80 (eficiencia com 20% de perda) = Radiação Media Regiao
                > Inversores, geralmente preciso somente de um inversor para o projeto, teria que saber quanto de kwh medio (Kwh medio mensal informado item anterior / radiação media por regiaão) e verificar "Quantidade de kW" do inversor, mas se inversor for pouco, talvez precisa de dois, mas deixar campo preenchido aut mas usuario poder arrumar
                > Parte ca (cabos, disjuntor, placa de aviso) somente campo para inserir valor do custo em reais 
                > Mao Obra = somente campo para inserir valor do custo em reais 
                > Homologação/Projeto = somente campo para inserir valor do custo em reais 
                > Margem de Lucro, padrão é 40% mas pode deixar campo em aberto para usuario poder mudar

                > Preço Final .....

                *** Regra master para Paineis Solares e Inversores também preciso que usuario informe valor do custo unitario de cada placa e também custo inversores para saber preço final
    
    >>Orçamentos itens individuais: Nesse caso olhar processo anterior, mas no caso não vou ter a formula pronta, usuario pode vender somente inversores, ou somente placas, ou somente outros tipos de estoque, ou pode fazer combinação entre eles ...., ou somente homologação, ou somente mão de obra, mas precisa inserir o custo e também e margem fica


**2.5 Cálculo de margem de lucro e conversões**

> Margem de Lucro é padrão de 40% sobre custo mas podendo ser modificada em cada orçamento


**2.6 Geração de PDF do orçamento**

> Olhar exemplo C:\Users\silas.gomes\Documents\codigos\Sistema_Orcamento_Energia\Dados_Marca_Empresa\Exemplo de Proposta.pdf

**2.7 Dashboard / gráficos de clientes**

> Preciso coisas importantes para analise, inclusive quanto tempo os orçamentos foram enviados e não aceitos, por vendedor


**2.8 Usuários e permissões**

> Ter tabela para usuario mas todos eles vão ter acesso total sem nenhuma restrição, somente não deixe excluir orçamentos, só cancelar orçamentos


**2.9 Outras regras e observações**

> Tenho um framework pronto olhar C:\Users\silas.gomes\Documents\codigos\Sistema_Orcamento_Energia\Dados_Marca_Empresa\JMT_Solar_Framework_Site.docx

---

## 3. Entregáveis esperados da IA

- [ ] Backend FastAPI com endpoints para produtos, clientes, orçamentos e geração de PDF
- [ ] Modelo de banco de dados (schema) compatível com Supabase/PostgreSQL
- [ ] Frontend responsivo consumindo a API, com PWA habilitado
- [ ] Tela de login protegendo o acesso
- [ ] Instruções de deploy no Render (backend) e Vercel/Netlify (frontend)