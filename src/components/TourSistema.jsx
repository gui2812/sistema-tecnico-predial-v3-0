import {
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Link,
  MapPinned,
  Menu,
  PackagePlus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const passos = [
  {
    titulo: "Bem-vindo ao Sistema Técnico Predial 👋",
    descricao:
      "Este tour rápido vai te mostrar como usar as principais funções do sistema.",
    icon: CheckCircle2,
  },
  {
    titulo: "Menu lateral",
    descricao:
      "Aqui você acessa as áreas liberadas para seu usuário, como Solicitações, Dashboard, Histórico e Relatórios.",
    icon: Menu,
  },
  {
    titulo: "Solicitação de Material",
    descricao:
      "Nesta tela você abre pedidos de compra, informa quantidade, descrição, local e link do item.",
    icon: PackagePlus,
  },
  {
    titulo: "Área solicitante",
    descricao:
      "O administrador define quais áreas cada usuário pode solicitar. Você só verá as áreas liberadas para o seu login.",
    icon: MapPinned,
  },
  {
    titulo: "Link do item / orçamento",
    descricao:
      "Cole aqui o link do produto, orçamento ou referência. Assim o administrador consegue consultar depois sem poluir a tela.",
    icon: Link,
  },
  {
    titulo: "Acompanhar status",
    descricao:
      "Depois de enviar, acompanhe o status do item: Nova, Em análise, Aprovada, Comprada, Entregue ou Reprovada.",
    icon: ClipboardList,
  },
  {
    titulo: "Assistente Técnico",
    descricao:
      "Use o robôzinho no canto da tela sempre que tiver dúvida. Ele mostra passo a passo de cada módulo.",
    icon: Bot,
  },
];

function chaveTour(user) {
  return `stp_tour_visto_${user?.id || user?.usuario || user?.nome || "anonimo"}`;
}

export default function TourSistema({ user }) {
  const [aberto, setAberto] = useState(false);
  const [passoAtual, setPassoAtual] = useState(0);

  const passo = passos[passoAtual];
  const Icon = passo.icon;

  const storageKey = useMemo(() => chaveTour(user), [user]);

  useEffect(() => {
    const jaViu = localStorage.getItem(storageKey);

    if (!jaViu) {
      const timer = setTimeout(() => {
        setAberto(true);
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  function fecharTour() {
    localStorage.setItem(storageKey, "sim");
    setAberto(false);
  }

  function agoraNao() {
    localStorage.setItem(storageKey, "sim");
    setAberto(false);
  }

  function comecarTour() {
    setPassoAtual(1);
  }

  function anterior() {
    setPassoAtual((p) => Math.max(0, p - 1));
  }

  function proximo() {
    if (passoAtual >= passos.length - 1) {
      fecharTour();
      return;
    }

    setPassoAtual((p) => p + 1);
  }

  if (!aberto) return null;

  const progresso = Math.round(((passoAtual + 1) / passos.length) * 100);
  const telaInicial = passoAtual === 0;
  const ultimoPasso = passoAtual === passos.length - 1;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-br from-blue-700 to-slate-950 text-white p-6 relative">
          <button
            onClick={fecharTour}
            className="absolute right-4 top-4 w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20"
            title="Fechar"
          >
            <X size={18} />
          </button>

          <div className="w-14 h-14 rounded-3xl bg-white/15 flex items-center justify-center mb-4">
            <Icon size={30} />
          </div>

          <p className="text-blue-100 text-sm font-semibold">
            Modo treinamento
          </p>

          <h2 className="text-2xl md:text-3xl font-black mt-1 pr-10">
            {passo.titulo}
          </h2>

          <p className="text-blue-100 mt-3 leading-relaxed">
            {passo.descricao}
          </p>
        </div>

        <div className="p-6">
          <div className="mb-5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
              <span>
                Passo {passoAtual + 1} de {passos.length}
              </span>
              <span>{progresso}%</span>
            </div>

            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>

          {!telaInicial && (
            <div className="rounded-3xl bg-slate-50 border border-slate-100 p-4 mb-5">
              <p className="text-sm font-bold text-slate-800 mb-3">
                O que fazer:
              </p>

              <ul className="space-y-2 text-sm text-slate-600">
                {passoAtual === 1 && (
                  <>
                    <li>• Use o menu para navegar entre as telas.</li>
                    <li>• Cada usuário vê apenas as áreas liberadas.</li>
                  </>
                )}

                {passoAtual === 2 && (
                  <>
                    <li>• Acesse Solicitação de Material.</li>
                    <li>• Preencha a solicitação e adicione os itens.</li>
                  </>
                )}

                {passoAtual === 3 && (
                  <>
                    <li>• Selecione a área solicitante disponível.</li>
                    <li>• Caso falte alguma área, peça liberação ao administrador.</li>
                  </>
                )}

                {passoAtual === 4 && (
                  <>
                    <li>• Cole o link do produto, orçamento ou referência.</li>
                    <li>• O link ficará organizado dentro do item.</li>
                  </>
                )}

                {passoAtual === 5 && (
                  <>
                    <li>• Acompanhe o item no painel de solicitações.</li>
                    <li>• O status será atualizado pelo administrador.</li>
                  </>
                )}

                {passoAtual === 6 && (
                  <>
                    <li>• Clique no robôzinho no canto inferior direito.</li>
                    <li>• Escolha o tópico da dúvida e siga o passo a passo.</li>
                  </>
                )}
              </ul>
            </div>
          )}

          {telaInicial ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={comecarTour}
                className="flex-1 px-5 py-3 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700"
              >
                Começar tour
              </button>

              <button
                onClick={agoraNao}
                className="flex-1 px-5 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
              >
                Agora não
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={anterior}
                disabled={passoAtual === 0}
                className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ChevronLeft size={18} />
                Voltar
              </button>

              <button
                onClick={proximo}
                className="flex-1 px-5 py-3 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                {ultimoPasso ? "Finalizar tour" : "Próximo"}
                {!ultimoPasso && <ChevronRight size={18} />}
              </button>
            </div>
          )}

          {!telaInicial && (
            <button
              onClick={agoraNao}
              className="mt-3 w-full text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              Pular tour
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
