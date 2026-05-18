import {
  BarChart3,
  Bot,
  Calculator,
  ChevronRight,
  Droplets,
  FileText,
  Fuel,
  HelpCircle,
  Mail,
  PackagePlus,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

const topicos = [
  {
    id: "dashboard",
    titulo: "Dashboard",
    icon: BarChart3,
    palavras: ["dashboard", "painel", "gráfico", "grafico", "cards", "média", "media"],
    passos: [
      "Acesse Dashboard no menu lateral.",
      "Confira os cards principais: energia, diesel, cálculos técnicos, água e solicitações.",
      "Nos gráficos, acompanhe evolução, médias e alertas.",
      "Caso algum dado esteja duplicado, vá no módulo de origem e exclua o registro incorreto.",
      "Depois atualize a página para o Dashboard recalcular as informações.",
    ],
  },
  {
    id: "energia",
    titulo: "Energia dos Locatários",
    icon: Zap,
    palavras: ["energia", "locatário", "locatarios", "medição", "medicao", "kwh", "medidor", "virou"],
    passos: [
      "Acesse Energia dos Locatários.",
      "Informe a data da medição anterior e a data da medição atual.",
      "Cole as leituras no formato: unidade - leitura.",
      "Clique em Calcular consumo.",
      "Confira total consumido, média por unidade, alertas e medidores que viraram.",
      "Clique em Salvar medição para o registro aparecer no histórico e no Dashboard.",
      "Se salvar duplicado, use a lixeira no histórico de medições salvas.",
    ],
  },
  {
    id: "geradores",
    titulo: "Geradores",
    icon: Fuel,
    palavras: ["gerador", "geradores", "diesel", "litros", "gmg", "horímetro", "horimetro"],
    passos: [
      "Acesse Geradores.",
      "Informe o nome do gerador e a data.",
      "Preencha os campos de litros/leituras conforme o padrão usado no sistema.",
      "Informe o valor do diesel quando necessário.",
      "Confira o cálculo automático de litros e custo.",
      "Clique em Salvar registro.",
      "Se lançar errado, exclua o registro pela lixeira no histórico.",
    ],
  },
  {
    id: "solicitacoes",
    titulo: "Solicitações de Material",
    icon: PackagePlus,
    palavras: ["solicitação", "solicitacao", "material", "aprovar", "reprovar", "comprar", "entregar", "valor unitário", "valor unitario"],
    passos: [
      "Acesse Solicitações de Material.",
      "Preencha data, setor, solicitante e prioridade.",
      "Informe quantidade, unidade e descrição do material.",
      "Se necessário, adicione marca/modelo, local de aplicação e observação.",
      "Clique em Adicionar item.",
      "Depois clique em Enviar solicitação.",
      "O administrador pode aprovar, reprovar, marcar como comprado ou entregue.",
      "Para valores, preencha Valor unitário e clique em Salvar dados.",
      "Se houver preço escrito na observação, use Extrair valor para preencher automaticamente.",
    ],
  },
  {
    id: "malote",
    titulo: "Malote",
    icon: Mail,
    palavras: ["malote", "nota", "nf", "csc", "financeiro", "pagamento", "transferência", "transferencia", "parcial"],
    passos: [
      "Acesse Malote.",
      "Preencha o destinatário do texto e, se quiser, o e-mail para envio.",
      "Informe fornecedor, NF, valor e centro de custo.",
      "Use observação quando necessário.",
      "Para pagamento parcial, preencha valor total e valor pago.",
      "Clique em Adicionar observação automática se quiser incluir percentual ou transferência.",
      "Clique em Adicionar ao malote.",
      "Copie o e-mail ou clique em Abrir e-mail para envio.",
    ],
  },
  {
    id: "rateio",
    titulo: "Rateio de Água",
    icon: Droplets,
    palavras: ["água", "agua", "rateio", "sabesp", "poço", "poco", "tarifa", "m3"],
    passos: [
      "Acesse Rateio de Água.",
      "Preencha mês de referência, períodos de leitura e valores.",
      "Informe consumo do Poço 1, Poço 2 e SABESP.",
      "O sistema calcula consumo total, tarifa e participação de Poço x SABESP.",
      "Confira o e-mail pronto no lado direito.",
      "Clique em Salvar no histórico se quiser manter o registro.",
      "Para remover um lançamento errado, use a lixeira em Últimos rateios salvos.",
    ],
  },
  {
    id: "relatorios",
    titulo: "Relatórios PDF",
    icon: FileText,
    palavras: ["relatório", "relatorio", "pdf", "imprimir", "baixar"],
    passos: [
      "Acesse Relatórios PDF.",
      "Escolha o tipo de relatório desejado.",
      "Selecione o período ou a medição quando houver filtro disponível.",
      "Clique em Gerar PDF.",
      "Confira se o relatório saiu corretamente antes de enviar.",
      "Se aparecer dado duplicado, corrija primeiro no módulo de origem.",
    ],
  },
  {
    id: "calculadora",
    titulo: "Calculadora Elétrica",
    icon: Calculator,
    palavras: ["calculadora", "elétrica", "eletrica", "corrente", "potência", "potencia", "queda", "tensão", "tensao"],
    passos: [
      "Acesse Calculadora Elétrica.",
      "Escolha o tipo de cálculo desejado.",
      "Preencha os campos solicitados.",
      "Clique para calcular.",
      "Confira o resultado e a fórmula exibida.",
      "Use o resultado como apoio técnico, validando sempre com as condições reais da instalação.",
    ],
  },
  {
    id: "usuarios",
    titulo: "Usuários e Permissões",
    icon: ShieldCheck,
    palavras: ["usuário", "usuario", "login", "senha", "permissão", "permissao", "acesso"],
    passos: [
      "Acesse Usuários.",
      "Cadastre ou edite o usuário desejado.",
      "Defina perfil, setor e permissões de acesso.",
      "Salve as alterações.",
      "Se o usuário não conseguir acessar uma tela, confira se a permissão foi liberada.",
      "Se a senha não atualizar, verifique a integração com o Supabase.",
    ],
  },
];

function normalizar(txt) {
  return String(txt || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function AssistenteTecnico() {
  const [aberto, setAberto] = useState(false);
  const [selecionado, setSelecionado] = useState("dashboard");
  const [busca, setBusca] = useState("");

  const topicoSelecionado =
    topicos.find((t) => t.id === selecionado) || topicos[0];

  const topicosFiltrados = useMemo(() => {
    const termo = normalizar(busca);

    if (!termo) return topicos;

    return topicos.filter((t) => {
      const texto = normalizar([
        t.titulo,
        ...t.palavras,
        ...t.passos,
      ].join(" "));

      return texto.includes(termo);
    });
  }, [busca]);

  function responderBusca() {
    const termo = normalizar(busca);

    if (!termo) return;

    const encontrado = topicos.find((t) => {
      const texto = normalizar([
        t.titulo,
        ...t.palavras,
        ...t.passos,
      ].join(" "));

      return texto.includes(termo);
    });

    if (encontrado) {
      setSelecionado(encontrado.id);
    } else {
      alert("Não encontrei um tópico específico. Tente buscar por: energia, malote, material, PDF, rateio ou usuários.");
    }
  }

  function abrirTourNovamente() {
    window.dispatchEvent(new CustomEvent("stp:abrir-tour"));
    setAberto(false);
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="fixed right-5 bottom-5 z-50 w-14 h-14 rounded-3xl bg-blue-600 text-white shadow-2xl flex items-center justify-center hover:bg-blue-700 hover:scale-105 transition"
        title="Assistente Técnico"
      >
        <Bot size={28} />
      </button>

      {aberto && (
        <div className="fixed right-5 bottom-24 z-50 w-[390px] max-w-[calc(100vw-40px)] h-[580px] max-h-[calc(100vh-120px)] bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-br from-blue-700 to-slate-950 text-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
                  <Bot />
                </div>

                <div>
                  <h3 className="font-black text-lg">Assistente Técnico</h3>
                  <p className="text-xs text-blue-100">
                    Ajuda rápida do sistema
                  </p>
                </div>
              </div>

              <button
                onClick={() => setAberto(false)}
                className="text-white/80 hover:text-white"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2">
              <Search size={16} className="text-blue-100 shrink-0" />

              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") responderBusca();
                }}
                placeholder="Digite sua dúvida..."
                className="bg-transparent outline-none text-sm placeholder:text-blue-100 w-full"
              />

              <button
                onClick={responderBusca}
                className="px-3 py-1 rounded-xl bg-white/15 text-xs font-bold hover:bg-white/20"
              >
                Buscar
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-slate-50 p-4">
            <div className="rounded-2xl bg-white border border-slate-100 p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <HelpCircle size={18} className="text-blue-600" />
                <p className="font-bold text-slate-900">Tópicos de ajuda</p>
              </div>

              <div className="space-y-2">
                {topicosFiltrados.length === 0 && (
                  <p className="text-sm text-slate-400">
                    Nenhum tópico encontrado.
                  </p>
                )}

                {topicosFiltrados.map((topico) => {
                  const Icon = topico.icon;

                  return (
                    <button
                      key={topico.id}
                      onClick={() => setSelecionado(topico.id)}
                      className={`w-full text-left rounded-2xl p-3 border flex items-center gap-3 transition ${
                        selecionado === topico.id
                          ? "bg-blue-50 border-blue-200"
                          : "bg-white border-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      <Icon
                        size={18}
                        className={
                          selecionado === topico.id
                            ? "text-blue-600"
                            : "text-slate-400"
                        }
                      />

                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-900">
                          {topico.titulo}
                        </p>
                      </div>

                      <ChevronRight size={16} className="text-slate-400" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-100 p-4">
              <p className="text-xs font-bold text-blue-600 mb-2">
                PASSO A PASSO
              </p>

              <h3 className="font-black text-slate-900 mb-3">
                {topicoSelecionado.titulo}
              </h3>

              <div className="space-y-3">
                {topicoSelecionado.passos.map((passo, index) => (
                  <div key={passo} className="flex gap-3 text-sm text-slate-700">
                    <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-black shrink-0">
                      {index + 1}
                    </span>

                    <span className="leading-relaxed">{passo}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border-t border-slate-100">
            <button
              onClick={abrirTourNovamente}
              className="mb-3 w-full px-4 py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700"
            >
              <RotateCcw size={16} />
              Ver tour do sistema novamente
            </button>

            <p className="text-xs text-slate-400">
              Versão inicial com respostas prontas. Pesquise por palavras como:
              energia, malote, material, PDF, rateio ou usuário.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
