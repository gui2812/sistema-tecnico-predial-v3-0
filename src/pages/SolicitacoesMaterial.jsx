import {
  CheckCircle2,
  CheckSquare,
  PackageCheck,
  PackagePlus,
  Plus,
  RefreshCcw,
  Save,
  Search,
  ShoppingCart,
  Square,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import CardResumo from "../components/CardResumo";
import Tabela from "../components/Tabela";
import { addNotification } from "../services/storageService";
import {
  atualizarItemSolicitacaoSupabase,
  atualizarItensEmLoteSupabase,
  criarSolicitacaoSupabase,
  excluirItemSolicitacaoSupabase,
  excluirSolicitacaoSupabase,
  listarSolicitacoesSupabase,
  verificarSenhaUsuarioSupabase,
} from "../services/solicitacoesSupabaseService";
import { brl, today } from "../utils/formatters";
import { registrarHistoricoSupabase } from "../services/historicoSupabaseService";

const itemVazio = {
  quantidade: "",
  unidade: "un",
  descricao: "",
  marca: "",
  local: "",
  observacao: "",
  valorUnitario: "",
  status: "Nova",
  motivoReprovacao: "",
  aprovadoPor: "",
  reprovadoPor: "",
  fornecedor: "",
  numeroNotaFiscal: "",
  recebidoPor: "",
  dataRecebimento: "",
  obsRecebimento: "",
  enviadoMalote: false,
  dataEnvioMalote: "",
};

const statusItem = [
  "Nova",
  "Em análise",
  "Aprovada",
  "Reprovada",
  "Comprada",
  "Entregue",
  "Cancelada",
];

const areasSolicitantes = [
  "Civil",
  "Mecânica",
  "Elétrica",
  "Hidráulica",
  "Limpeza",
  "BMS",
  "Segurança",
  "Incêndio",
  "Jardinagem",
  "Administrativo",
  "Outros",
];

function dinheiroParaNumero(v) {
  return Number(String(v || "0").replace(/\./g, "").replace(",", ".")) || 0;
}

function totalSolicitacao(sol) {
  return (sol.itens || []).reduce(
    (a, it) =>
      a + Number(it.quantidade || 0) * dinheiroParaNumero(it.valorUnitario),
    0
  );
}

function normalizar(txt) {
  return String(txt || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function statusGeral(sol) {
  const itens = sol.itens || [];

  if (!itens.length) return sol.status || "Nova";
  if (itens.every((i) => i.status === "Entregue")) return "Entregue";
  if (itens.every((i) => i.status === "Reprovada" || i.status === "Cancelada")) {
    return "Reprovada";
  }
  if (itens.some((i) => i.status === "Comprada" || i.status === "Entregue")) {
    return "Comprada";
  }
  if (itens.some((i) => i.status === "Aprovada")) return "Aprovada";
  if (itens.some((i) => i.status === "Reprovada")) return "Em análise";

  return sol.status || "Nova";
}

function BadgeStatus({ status }) {
  const estilos = {
    Nova: "bg-blue-50 text-blue-700",
    "Em análise": "bg-amber-50 text-amber-700",
    Aprovada: "bg-emerald-50 text-emerald-700",
    Reprovada: "bg-rose-50 text-rose-700",
    Comprada: "bg-indigo-50 text-indigo-700",
    Entregue: "bg-teal-50 text-teal-700",
    Cancelada: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold ${
        estilos[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

function TextoQuebra({ children, className = "" }) {
  return (
    <span className={`break-words whitespace-normal ${className}`}>
      {children}
    </span>
  );
}

function ObservacaoLonga({ texto }) {
  if (!texto) return null;

  return (
    <div className="text-sm text-slate-500 mt-2 max-w-full overflow-hidden">
      <span className="font-semibold">Obs.: </span>
      <span className="break-all whitespace-normal">{texto}</span>
    </div>
  );
}

function normalizarItem(item) {
  return {
    id: item.id,
    quantidade: item.quantidade ?? "",
    unidade: item.unidade || "un",
    descricao: item.descricao || "",
    marca: item.marca || item.marca_modelo || "",
    local: item.local || item.local_aplicacao || "",
    observacao: item.observacao || "",
    valorUnitario: item.valorUnitario || item.valor_unitario || "",
    status: item.status || "Nova",
    motivoReprovacao: item.motivoReprovacao || item.motivo_reprovacao || "",
    fornecedor: item.fornecedor || "",
    numeroNotaFiscal:
      item.numeroNotaFiscal || item.numero_nota_fiscal || item.notaFiscal || "",
    recebidoPor: item.recebidoPor || item.recebido_por || "",
    dataRecebimento: item.dataRecebimento || item.data_recebimento || "",
    obsRecebimento: item.obsRecebimento || item.observacao_recebimento || "",
    enviadoMalote:
      item.enviadoMalote ?? item.enviado_malote ?? item.maloteEnviado ?? false,
    dataEnvioMalote:
      item.dataEnvioMalote || item.data_envio_malote || item.dataMalote || "",
    atualizadoPor: item.atualizadoPor || item.atualizado_por || "",
    atualizadoEm: item.atualizadoEm || item.atualizado_em || item.criado_em || "",
  };
}

function normalizarSolicitacao(sol) {
  return {
    id: sol.id,
    numero: sol.numero,
    data: sol.data || (sol.criado_em ? String(sol.criado_em).slice(0, 10) : today()),
    setor: sol.area_solicitante || sol.setor || "Elétrica",
    areaSolicitante: sol.area_solicitante || sol.setor || "Elétrica",
    solicitante: sol.solicitante_nome || sol.solicitante || "",
    solicitanteId: sol.solicitante_id || "",
    prioridade: sol.prioridade || "Normal",
    observacaoGeral: sol.observacao_geral || "",
    status: sol.status || "Nova",
    criadoEm: sol.criado_em,
    atualizadoEm: sol.atualizado_em,
    itens: Array.isArray(sol.itens) ? sol.itens.map(normalizarItem) : [],
  };
}

export default function SolicitacoesMaterial({ user }) {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [cab, setCab] = useState({
    data: today(),
    setor: areasSolicitantes.includes(user?.setor) ? user?.setor : "Elétrica",
    solicitante: user?.nome || "",
    prioridade: "Normal",
    observacaoGeral: "",
  });
  const [item, setItem] = useState(itemVazio);
  const [itens, setItens] = useState([]);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("Todos");
  const [setorFiltro, setSetorFiltro] = useState("Todos");
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const isAdmin = user?.perfil === "admin" || user?.perfil === "administrador";

  async function registrarHistorico(acao, descricao, referenciaId = null, dados = {}) {
    try {
      await registrarHistoricoSupabase({
        tipo: "Solicitação de Material",
        modulo: "Solicitação de Material",
        acao,
        descricao,
        usuario: user?.nome || user?.usuario || "Sistema",
        usuario_id: user?.id || null,
        referencia_id: referenciaId,
        dados,
      });
    } catch (err) {
      console.error("Erro ao registrar histórico de solicitação:", err);
    }
  }

  async function carregarSolicitacoes() {
    setCarregando(true);
    setErro("");

    try {
      const lista = await listarSolicitacoesSupabase();
      setSolicitacoes(lista.map(normalizarSolicitacao));
    } catch (err) {
      console.error(err);
      setErro("Não foi possível carregar as solicitações.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarSolicitacoes();
  }, []);

  async function validarSenhaAdmin() {
    if (!isAdmin) {
      alert("Apenas o administrador pode excluir.");
      return false;
    }

    const senha = window.prompt("Digite sua senha de administrador para confirmar:");

    if (!senha) {
      alert("Exclusão cancelada.");
      return false;
    }

    const senhaOk = await verificarSenhaUsuarioSupabase(user?.usuario, senha);

    if (!senhaOk) {
      alert("Senha incorreta. Exclusão não realizada.");
      return false;
    }

    return true;
  }

  async function excluirSolicitacao(sol) {
    const confirmar = window.confirm(
      `Tem certeza que deseja excluir a solicitação #${String(sol.numero || sol.id)
        .slice(-4)
        .toUpperCase()}?\n\nEssa ação vai apagar a solicitação e todos os itens dela.`
    );

    if (!confirmar) return;

    const senhaOk = await validarSenhaAdmin();
    if (!senhaOk) return;

    try {
      await excluirSolicitacaoSupabase(sol.id);

      await registrarHistorico(
        "Solicitação excluída",
        `Solicitação #${String(sol.numero || sol.id).slice(-4).toUpperCase()} excluída.`,
        sol.id,
        {
          solicitacao: sol,
          quantidadeItens: sol.itens?.length || 0,
        }
      );

      setItensSelecionados([]);
      await carregarSolicitacoes();
      alert("Solicitação excluída com sucesso.");
    } catch (err) {
      console.error(err);
      alert("Não foi possível excluir a solicitação.");
    }
  }

  async function excluirItem(sol, it) {
    const confirmar = window.confirm(
      `Tem certeza que deseja excluir este item?\n\n${it.quantidade} ${it.unidade} • ${it.descricao}`
    );

    if (!confirmar) return;

    const senhaOk = await validarSenhaAdmin();
    if (!senhaOk) return;

    try {
      await excluirItemSolicitacaoSupabase(it.id);

      await registrarHistorico(
        "Item excluído",
        `Item "${it.descricao}" excluído da solicitação #${String(sol.numero || sol.id)
          .slice(-4)
          .toUpperCase()}.`,
        it.id,
        {
          solicitacaoId: sol.id,
          item: it,
        }
      );

      setItensSelecionados((prev) => prev.filter((id) => id !== String(it.id)));
      await carregarSolicitacoes();
      alert("Item excluído com sucesso.");
    } catch (err) {
      console.error(err);
      alert("Não foi possível excluir o item.");
    }
  }

  function formatarDataNotificacao(data = new Date()) {
    return data.toLocaleDateString("pt-BR");
  }

  function mensagemAtualizacao(sol, it, novoStatus, motivo = "") {
    let msg = `Sua solicitação #${String(sol.numero || sol.id || "")
      .slice(-4)
      .toUpperCase()} foi atualizada.\n\nItem: ${it.descricao}\nStatus: ${novoStatus}\nAtualizado por: ${
      user?.nome || "Sistema"
    }\nData: ${formatarDataNotificacao()}`;

    if (novoStatus === "Reprovada" && motivo) {
      msg += `\nMotivo: ${motivo}`;
    }

    return msg;
  }

  function notificarAlteracaoStatus(sol, it, novoStatus, motivo = "") {
    if (!novoStatus || !it?.descricao) return;

    addNotification({
      tipo: "solicitacao_material",
      solicitacaoId: sol.id,
      destinatario: sol.solicitante,
      destinatarioSetor: sol.setor,
      destinatarioUsuario: sol.solicitanteId,
      titulo: `Solicitação atualizada: ${novoStatus}`,
      mensagem: mensagemAtualizacao(sol, it, novoStatus, motivo),
    });
  }

  function chaveItem(itemId) {
    return String(itemId);
  }

  function itemSelecionado(itemId) {
    return itensSelecionados.includes(chaveItem(itemId));
  }

  function alternarItem(itemId) {
    const chave = chaveItem(itemId);

    setItensSelecionados((prev) =>
      prev.includes(chave) ? prev.filter((i) => i !== chave) : [...prev, chave]
    );
  }

  function selecionarTodosVisiveis() {
    const chaves = [];

    listaVisivel.forEach((sol) => {
      (sol.itens || []).forEach((it) => {
        if (it.id) chaves.push(chaveItem(it.id));
      });
    });

    setItensSelecionados(chaves);
  }

  function limparSelecao() {
    setItensSelecionados([]);
  }

  async function atualizarItensEmLote(patch) {
    if (!itensSelecionados.length) {
      alert("Selecione pelo menos um item.");
      return;
    }

    try {
      const ids = itensSelecionados;

      await atualizarItensEmLoteSupabase(ids, {
        ...patch,
        atualizado_por: user?.nome || "Admin",
      });

      const selecionados = new Set(ids);

      listaVisivel.forEach((sol) => {
        (sol.itens || []).forEach((it) => {
          if (selecionados.has(String(it.id)) && patch.status && patch.status !== it.status) {
            notificarAlteracaoStatus(sol, it, patch.status, patch.motivoReprovacao || "");
          }
        });
      });

      setItensSelecionados([]);
      await carregarSolicitacoes();
    } catch (err) {
      console.error(err);
      alert("Não foi possível atualizar os itens selecionados.");
    }
  }

  function aprovarSelecionados() {
    atualizarItensEmLote({
      status: "Aprovada",
      motivoReprovacao: "",
    });
  }

  function reprovarSelecionados() {
    if (!itensSelecionados.length) {
      alert("Selecione pelo menos um item.");
      return;
    }

    const motivo = window.prompt(
      "Informe o motivo da reprovação para os itens selecionados:",
      ""
    );

    if (!motivo || !motivo.trim()) {
      alert("Para reprovar, é obrigatório informar o motivo.");
      return;
    }

    atualizarItensEmLote({
      status: "Reprovada",
      motivoReprovacao: motivo.trim(),
    });
  }

  function comprarSelecionados() {
    if (!itensSelecionados.length) {
      alert("Selecione pelo menos um item.");
      return;
    }

    const fornecedor = window.prompt("Informe o fornecedor para os itens selecionados:", "");

    if (!fornecedor || !fornecedor.trim()) {
      alert("Informe o fornecedor para marcar como comprado.");
      return;
    }

    atualizarItensEmLote({
      status: "Comprada",
      fornecedor: fornecedor.trim(),
      motivoReprovacao: "",
    });
  }

  function entregarSelecionados() {
    if (!itensSelecionados.length) {
      alert("Selecione pelo menos um item.");
      return;
    }

    const fornecedor = window.prompt("Fornecedor dos itens selecionados:", "") || "";

    if (!fornecedor.trim()) {
      alert("Informe o fornecedor.");
      return;
    }

    const numeroNotaFiscal =
      window.prompt("Número da nota fiscal para os itens selecionados (obrigatório):", "") || "";

    if (!numeroNotaFiscal.trim()) {
      alert("Informe o número da nota fiscal para comprovar a entrega.");
      return;
    }

    const recebidoPor = window.prompt("Recebido por:", user?.nome || "") || "";

    if (!recebidoPor.trim()) {
      alert("Informe quem recebeu o material.");
      return;
    }

    const dataRecebimento = window.prompt("Data do recebimento:", today()) || "";

    if (!dataRecebimento.trim()) {
      alert("Informe a data do recebimento.");
      return;
    }

    const obsRecebimento =
      window.prompt("Observação do recebimento para os itens selecionados (opcional):", "") ||
      "";

    const enviarMalote = window.confirm(
      "A nota fiscal já foi enviada para o malote?\n\nOK = Sim\nCancelar = Não"
    );

    const dataEnvioMalote = enviarMalote
      ? window.prompt("Data de envio ao malote:", today()) || today()
      : null;

    atualizarItensEmLote({
      status: "Entregue",
      fornecedor: fornecedor.trim(),
      numeroNotaFiscal: numeroNotaFiscal.trim(),
      recebidoPor: recebidoPor.trim(),
      dataRecebimento: dataRecebimento.trim(),
      obsRecebimento: obsRecebimento.trim(),
      enviadoMalote: enviarMalote,
      dataEnvioMalote: dataEnvioMalote ? String(dataEnvioMalote).trim() : null,
      motivoReprovacao: "",
    });
  }

  function addLinha() {
    if (!item.descricao || !item.quantidade) {
      alert("Preencha quantidade e descrição.");
      return;
    }

    setItens([
      ...itens,
      {
        ...item,
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      },
    ]);

    setItem(itemVazio);
  }

  async function enviar() {
    if (!itens.length) {
      alert("Adicione pelo menos um item.");
      return;
    }

    setSalvando(true);

    try {
      const solicitacaoCriada = await criarSolicitacaoSupabase(
        {
          solicitante_id: user?.id || null,
          solicitante_nome: cab.solicitante || user?.nome || "",
          setor: user?.setor || cab.setor || "",
          area_solicitante: cab.setor,
          prioridade: cab.prioridade,
          observacao_geral: cab.observacaoGeral,
        },
        itens.map((it) => ({
          quantidade: it.quantidade,
          unidade: it.unidade,
          descricao: it.descricao,
          marca_modelo: it.marca,
          local_aplicacao: it.local,
          observacao: it.observacao,
          status: "Nova",
        }))
      );

      await registrarHistorico(
        "Solicitação criada",
        `Solicitação criada por ${cab.solicitante || user?.nome || "usuário"} com ${itens.length} item(ns).`,
        solicitacaoCriada?.id,
        {
          solicitante: cab.solicitante || user?.nome || "",
          area: cab.setor,
          prioridade: cab.prioridade,
          quantidadeItens: itens.length,
          itens,
        }
      );

      setItens([]);
      setCab({
        data: today(),
        setor: areasSolicitantes.includes(user?.setor) ? user?.setor : "Elétrica",
        solicitante: user?.nome || "",
        prioridade: "Normal",
        observacaoGeral: "",
      });

      await carregarSolicitacoes();

      alert("Solicitação enviada.");
    } catch (err) {
      console.error(err);
      alert("Não foi possível enviar a solicitação. " + (err?.message || ""));
    } finally {
      setSalvando(false);
    }
  }

  async function atualizarItem(solId, itemId, patch) {
    const sol = solicitacoes.find((s) => s.id === solId);

    if (!sol) return;

    const itemAnterior = (sol.itens || []).find((i) => i.id === itemId);

    try {
      await atualizarItemSolicitacaoSupabase(itemId, {
        ...patch,
        atualizado_por: user?.nome || "Admin",
      });

      if (patch.status && itemAnterior && patch.status !== itemAnterior.status) {
        notificarAlteracaoStatus(
          sol,
          itemAnterior,
          patch.status,
          patch.motivoReprovacao || ""
        );

        await registrarHistorico(
          `Item ${patch.status.toLowerCase()}`,
          `Item "${itemAnterior.descricao}" atualizado para ${patch.status}.`,
          itemAnterior.id,
          {
            solicitacaoId: sol.id,
            solicitacao: sol.numero || sol.id,
            item: itemAnterior.descricao,
            statusAnterior: itemAnterior.status,
            novoStatus: patch.status,
            motivoReprovacao: patch.motivoReprovacao || "",
            fornecedor: patch.fornecedor || itemAnterior.fornecedor || "",
            numeroNotaFiscal:
              patch.numeroNotaFiscal || itemAnterior.numeroNotaFiscal || "",
            recebidoPor: patch.recebidoPor || itemAnterior.recebidoPor || "",
            dataRecebimento: patch.dataRecebimento || itemAnterior.dataRecebimento || "",
            enviadoMalote: patch.enviadoMalote ?? itemAnterior.enviadoMalote ?? false,
            dataEnvioMalote: patch.dataEnvioMalote || itemAnterior.dataEnvioMalote || "",
          }
        );
      }

      await carregarSolicitacoes();
    } catch (err) {
      console.error(err);
      alert("Não foi possível atualizar o item.");
    }
  }

  function atualizarItemLocal(solId, itemId, patch) {
    setSolicitacoes((prev) =>
      prev.map((sol) => {
        if (sol.id !== solId) return sol;

        return {
          ...sol,
          itens: (sol.itens || []).map((it) =>
            it.id === itemId ? { ...it, ...patch } : it
          ),
        };
      })
    );
  }

  async function salvarItemAdmin(itemId, patch) {
    try {
      await atualizarItemSolicitacaoSupabase(itemId, {
        ...patch,
        atualizado_por: user?.nome || "Admin",
      });
    } catch (err) {
      console.error(err);
      alert("Não foi possível salvar a alteração do item.");
    }
  }

  function aprovarItem(solId, itemId) {
    atualizarItem(solId, itemId, {
      status: "Aprovada",
      motivoReprovacao: "",
    });
  }

  function reprovarItem(solId, itemId, atual = "") {
    const motivo = window.prompt("Informe o motivo da reprovação deste item:", atual || "");

    if (!motivo || !motivo.trim()) {
      alert("Para reprovar, é obrigatório informar o motivo.");
      return;
    }

    atualizarItem(solId, itemId, {
      status: "Reprovada",
      motivoReprovacao: motivo.trim(),
    });
  }

  function marcarCompradoItem(solId, itemId, itemAtual) {
    let fornecedor = itemAtual.fornecedor || "";

    if (!fornecedor.trim()) {
      fornecedor = window.prompt("Informe o fornecedor da compra:", "") || "";
    }

    if (!fornecedor.trim()) {
      alert("Informe o fornecedor para marcar como comprado.");
      return;
    }

    atualizarItem(solId, itemId, {
      status: "Comprada",
      fornecedor: fornecedor.trim(),
      motivoReprovacao: "",
    });
  }

  function marcarEntregueItem(solId, itemId, itemAtual) {
    let fornecedor = itemAtual.fornecedor || window.prompt("Fornecedor:", "") || "";

    if (!fornecedor.trim()) {
      alert("Informe o fornecedor.");
      return;
    }

    const numeroNotaFiscal =
      itemAtual.numeroNotaFiscal ||
      window.prompt("Número da nota fiscal (obrigatório):", "") ||
      "";

    if (!numeroNotaFiscal.trim()) {
      alert("Informe o número da nota fiscal para comprovar a entrega.");
      return;
    }

    let recebidoPor =
      itemAtual.recebidoPor || window.prompt("Recebido por:", user?.nome || "") || "";

    if (!recebidoPor.trim()) {
      alert("Informe quem recebeu o material.");
      return;
    }

    let dataRecebimento =
      itemAtual.dataRecebimento || window.prompt("Data do recebimento:", today()) || "";

    if (!dataRecebimento.trim()) {
      alert("Informe a data do recebimento.");
      return;
    }

    const obsRecebimento =
      itemAtual.obsRecebimento || window.prompt("Observação do recebimento (opcional):", "") || "";

    const enviarMalote = window.confirm(
      "A nota fiscal já foi enviada para o malote?\n\nOK = Sim\nCancelar = Não"
    );

    const dataEnvioMalote = enviarMalote
      ? window.prompt("Data de envio ao malote:", today()) || today()
      : null;

    atualizarItem(solId, itemId, {
      status: "Entregue",
      fornecedor: fornecedor.trim(),
      numeroNotaFiscal: numeroNotaFiscal.trim(),
      recebidoPor: recebidoPor.trim(),
      dataRecebimento: dataRecebimento.trim(),
      obsRecebimento: obsRecebimento.trim(),
      enviadoMalote: enviarMalote,
      dataEnvioMalote: dataEnvioMalote ? String(dataEnvioMalote).trim() : null,
      motivoReprovacao: "",
    });
  }

  const listaVisivelBase = solicitacoes.filter((s) => {
    if (isAdmin) return true;

    const idUsuario = String(user?.id || "");
    const nomeUsuario = normalizar(user?.nome || "");
    const setorUsuario = normalizar(user?.setor || "");

    const idSolicitante = String(s.solicitanteId || "");
    const nomeSolicitante = normalizar(s.solicitante || "");
    const setorSolicitacao = normalizar(s.setor || "");

    return (
      idSolicitante === idUsuario ||
      nomeSolicitante === nomeUsuario ||
      nomeSolicitante.includes(nomeUsuario) ||
      setorSolicitacao === setorUsuario
    );
  });

  const setores = [
    "Todos",
    ...Array.from(new Set(solicitacoes.map((s) => s.setor).filter(Boolean))),
  ];

  const listaVisivel = useMemo(() => {
    const termo = normalizar(busca);

    return listaVisivelBase.filter((sol) => {
      const st = statusGeral(sol);

      const statusOk =
        statusFiltro === "Todos" ||
        st === statusFiltro ||
        (sol.itens || []).some((i) => i.status === statusFiltro);

      const setorOk = setorFiltro === "Todos" || sol.setor === setorFiltro;

      const texto = normalizar(
        [
          sol.data,
          sol.setor,
          sol.solicitante,
          sol.prioridade,
          st,
          sol.observacaoGeral,
          ...(sol.itens || []).flatMap((i) => [
            i.descricao,
            i.marca,
            i.local,
            i.status,
            i.fornecedor,
            i.numeroNotaFiscal,
            i.recebidoPor,
            i.enviadoMalote ? "malote enviado" : "malote pendente",
            i.motivoReprovacao,
          ]),
        ].join(" ")
      );

      return statusOk && setorOk && (!termo || texto.includes(termo));
    });
  }, [solicitacoes, busca, statusFiltro, setorFiltro, user, isAdmin]);

  const painelItens = useMemo(() => {
    const termo = normalizar(busca);

    return listaVisivelBase
      .flatMap((sol) =>
        (sol.itens || []).map((it) => ({
          ...it,
          solicitacaoId: sol.id,
          solicitacaoNumero: sol.numero,
          dataSolicitacao: sol.data,
          setor: sol.setor || "Sem setor",
          solicitante: sol.solicitante || "-",
          prioridade: sol.prioridade || "Normal",
          observacaoGeral: sol.observacaoGeral || "",
        }))
      )
      .filter((it) => {
        const statusOk = statusFiltro === "Todos" || it.status === statusFiltro;
        const setorOk = setorFiltro === "Todos" || it.setor === setorFiltro;

        const texto = normalizar(
          [
            it.dataSolicitacao,
            it.setor,
            it.solicitante,
            it.prioridade,
            it.descricao,
            it.marca,
            it.local,
            it.status,
            it.fornecedor,
            it.numeroNotaFiscal,
            it.recebidoPor,
            it.enviadoMalote ? "malote enviado" : "malote pendente",
            it.motivoReprovacao,
          ].join(" ")
        );

        return statusOk && setorOk && (!termo || texto.includes(termo));
      });
  }, [listaVisivelBase, busca, statusFiltro, setorFiltro]);

  const painelStatusResumo = statusItem.map((status) => ({
    status,
    total: painelItens.filter((it) => it.status === status).length,
  }));

  const painelPorSetor = useMemo(() => {
    const mapaSetor = new Map();

    painelItens.forEach((it) => {
      const setor = it.setor || "Sem setor";
      const status = it.status || "Nova";

      if (!mapaSetor.has(setor)) {
        mapaSetor.set(setor, {
          setor,
          total: 0,
          statuses: new Map(),
        });
      }

      const grupoSetor = mapaSetor.get(setor);
      grupoSetor.total += 1;

      if (!grupoSetor.statuses.has(status)) {
        grupoSetor.statuses.set(status, []);
      }

      grupoSetor.statuses.get(status).push(it);
    });

    return Array.from(mapaSetor.values())
      .map((grupo) => ({
        ...grupo,
        statuses: statusItem
          .map((status) => ({
            status,
            itens: grupo.statuses.get(status) || [],
          }))
          .filter((grupoStatus) => grupoStatus.itens.length > 0),
      }))
      .sort((a, b) => a.setor.localeCompare(b.setor, "pt-BR"));
  }, [painelItens]);

  const todosItensVisiveis = listaVisivelBase.flatMap((sol) => sol.itens || []);

  const totalSolic = listaVisivelBase.length;
  const totalItens = todosItensVisiveis.length;

  const novas = todosItensVisiveis.filter((i) => i.status === "Nova").length;
  const aprovadas = todosItensVisiveis.filter((i) => i.status === "Aprovada").length;
  const reprovadas = todosItensVisiveis.filter((i) => i.status === "Reprovada").length;
  const entregues = todosItensVisiveis.filter((i) => i.status === "Entregue").length;
  const pendentesMalote = todosItensVisiveis.filter(
    (i) => i.status === "Entregue" && !i.enviadoMalote
  ).length;

  const valorTotal = listaVisivelBase.reduce((s, sol) => s + totalSolicitacao(sol), 0);

  const resumoPorArea = Array.from(
    listaVisivelBase
      .reduce((map, sol) => {
        const area = sol.setor || "Sem área";
        const atual = map.get(area) || { area, itens: 0, valor: 0 };

        atual.itens += (sol.itens || []).length;
        atual.valor += totalSolicitacao(sol);

        map.set(area, atual);
        return map;
      }, new Map())
      .values()
  ).sort((a, b) => b.valor - a.valor);

  return (
    <div className="space-y-6 overflow-hidden">
      {erro && (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm">
          {erro}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={carregarSolicitacoes}
          className="px-4 py-2 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2 text-sm font-semibold"
        >
          <RefreshCcw size={16} />
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
        <CardResumo titulo="Solicitações" valor={totalSolic} icon={PackagePlus} />
        <CardResumo titulo="Itens" valor={totalItens} cor="blue" />
        <CardResumo titulo="Aprovados" valor={aprovadas} cor="teal" />
        <CardResumo titulo="Reprovados" valor={reprovadas} cor="rose" />
        <CardResumo titulo="Entregues" valor={entregues} cor="teal" />
        <CardResumo titulo="Malote pendente" valor={pendentesMalote} cor="amber" />
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 gap-4">
          <CardResumo
            titulo="Total estimado das solicitações"
            valor={brl(valorTotal)}
            cor="teal"
          />
        </div>
      )}

      {isAdmin && resumoPorArea.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 overflow-hidden">
          <h3 className="font-bold mb-4">Resumo por área solicitante</h3>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-4">Área</th>
                  <th className="py-2 pr-4">Itens</th>
                  <th className="py-2 pr-4">Valor estimado</th>
                </tr>
              </thead>

              <tbody>
                {resumoPorArea.map((r) => (
                  <tr key={r.area} className="border-t border-slate-100">
                    <td className="py-2 pr-4 font-semibold text-slate-800">
                      {r.area}
                    </td>
                    <td className="py-2 pr-4">{r.itens}</td>
                    <td className="py-2 pr-4 font-bold text-teal-700">
                      {brl(r.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 overflow-hidden">
        <h3 className="font-bold text-lg mb-1">Nova solicitação de material</h3>
        <p className="text-sm text-slate-500 mb-5">
          Líderes preenchem a área solicitante e os materiais. Valores, aprovação,
          compra e recebimento ficam no acesso master.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
          <input
            type="date"
            value={cab.data}
            onChange={(e) => setCab({ ...cab, data: e.target.value })}
            className="rounded-2xl border p-3"
          />

          <select
            value={cab.setor}
            onChange={(e) => setCab({ ...cab, setor: e.target.value })}
            className="rounded-2xl border p-3"
            title="Área solicitante"
          >
            {areasSolicitantes.map((area) => (
              <option key={area}>{area}</option>
            ))}
          </select>

          <input
            value={cab.solicitante}
            onChange={(e) => setCab({ ...cab, solicitante: e.target.value })}
            className="rounded-2xl border p-3"
            placeholder="Solicitante"
          />

          <select
            value={cab.prioridade}
            onChange={(e) => setCab({ ...cab, prioridade: e.target.value })}
            className="rounded-2xl border p-3"
          >
            <option>Baixa</option>
            <option>Normal</option>
            <option>Alta</option>
            <option>Urgente</option>
          </select>
        </div>

        <textarea
          value={cab.observacaoGeral}
          onChange={(e) => setCab({ ...cab, observacaoGeral: e.target.value })}
          className="w-full rounded-2xl border p-3 mb-5 h-20"
          placeholder="Observação geral da solicitação, se necessário"
        />

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input
            placeholder="Qtd"
            value={item.quantidade}
            onChange={(e) => setItem({ ...item, quantidade: e.target.value })}
            className="rounded-2xl border p-3"
          />

          <input
            placeholder="Unidade"
            value={item.unidade}
            onChange={(e) => setItem({ ...item, unidade: e.target.value })}
            className="rounded-2xl border p-3"
          />

          <input
            placeholder="Descrição do material"
            value={item.descricao}
            onChange={(e) => setItem({ ...item, descricao: e.target.value })}
            className="md:col-span-2 rounded-2xl border p-3"
          />

          <input
            placeholder="Marca/modelo"
            value={item.marca}
            onChange={(e) => setItem({ ...item, marca: e.target.value })}
            className="rounded-2xl border p-3"
          />

          <input
            placeholder="Local de aplicação"
            value={item.local}
            onChange={(e) => setItem({ ...item, local: e.target.value })}
            className="rounded-2xl border p-3"
          />

          <textarea
            placeholder="Observação do item"
            value={item.observacao}
            onChange={(e) => setItem({ ...item, observacao: e.target.value })}
            className="md:col-span-6 rounded-2xl border p-3 h-20"
          />
        </div>

        <div className="flex flex-wrap gap-3 mt-4">
          <button
            onClick={addLinha}
            className="px-5 py-3 bg-blue-600 text-white rounded-2xl font-semibold flex gap-2"
          >
            <Plus size={18} />
            Adicionar item
          </button>

          <button
            onClick={enviar}
            disabled={salvando}
            className="px-5 py-3 bg-teal-600 text-white rounded-2xl font-semibold flex gap-2 disabled:opacity-60"
          >
            <Save size={18} />
            {salvando ? "Enviando..." : "Enviar solicitação"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 overflow-hidden">
        <h3 className="font-bold mb-4">Itens desta solicitação</h3>

        <Tabela
          columns={[
            { key: "quantidade", label: "Qtd" },
            { key: "unidade", label: "Un." },
            { key: "descricao", label: "Descrição" },
            { key: "marca", label: "Marca" },
            { key: "local", label: "Local" },
            {
              key: "acao",
              label: "",
              render: (_, idx) => (
                <button
                  className="text-rose-600"
                  onClick={() => setItens(itens.filter((_, i) => i !== idx))}
                >
                  <Trash2 size={16} />
                </button>
              ),
            },
          ]}
          rows={itens}
        />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3 mb-5">
          <div className="flex-1 min-w-0">
            <label className="text-xs font-bold text-slate-500">
              Pesquisar solicitação ou item
            </label>

            <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2">
              <Search size={18} className="text-slate-400 shrink-0" />

              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por item, setor, status, fornecedor, recebido por..."
                className="w-full outline-none text-sm min-w-0"
              />
            </div>
          </div>

          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="rounded-2xl border p-3 text-sm"
          >
            <option>Todos</option>
            {statusItem.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <select
            value={setorFiltro}
            onChange={(e) => setSetorFiltro(e.target.value)}
            className="rounded-2xl border p-3 text-sm"
          >
            {setores.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        {isAdmin && (
          <div className="mb-5 rounded-3xl border border-blue-100 bg-blue-50 p-4 overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-slate-900">Ações em lote por item</p>
                <p className="text-sm text-slate-600">
                  Selecione as caixinhas dos itens e escolha a ação que deseja aplicar.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={selecionarTodosVisiveis}
                  className="px-3 py-2 rounded-2xl bg-white border border-blue-200 text-blue-700 text-xs font-bold"
                >
                  Selecionar todos visíveis
                </button>

                <button
                  onClick={limparSelecao}
                  className="px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-600 text-xs font-bold"
                >
                  Limpar seleção
                </button>

                <span className="px-3 py-2 rounded-2xl bg-blue-600 text-white text-xs font-bold">
                  {itensSelecionados.length} selecionado(s)
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={aprovarSelecionados}
                className="px-4 py-2 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
              >
                <CheckCircle2 size={14} />
                Aprovar selecionados
              </button>

              <button
                onClick={reprovarSelecionados}
                className="px-4 py-2 rounded-2xl bg-rose-600 text-white text-xs font-bold flex items-center gap-1"
              >
                <XCircle size={14} />
                Reprovar selecionados
              </button>

              <button
                onClick={comprarSelecionados}
                className="px-4 py-2 rounded-2xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-1"
              >
                <ShoppingCart size={14} />
                Marcar comprados
              </button>

              <button
                onClick={entregarSelecionados}
                className="px-4 py-2 rounded-2xl bg-teal-600 text-white text-xs font-bold flex items-center gap-1"
              >
                <PackageCheck size={14} />
                Marcar entregues
              </button>
            </div>
          </div>
        )}

        <div className="mb-6 rounded-3xl border border-slate-100 bg-slate-50/60 p-5 overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-5">
            <div className="min-w-0">
              <h3 className="font-bold text-lg text-slate-900">Painel de Itens</h3>
              <p className="text-sm text-slate-500">
                Itens organizados por setor e separados por status, respeitando os filtros acima.
              </p>
            </div>

            <div className="rounded-2xl bg-white border border-slate-100 px-4 py-3 text-sm">
              <p className="font-bold text-slate-700">Itens filtrados</p>
              <p className="text-2xl font-black text-blue-700">{painelItens.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-3 mb-5">
            {painelStatusResumo.map((resumo) => (
              <div key={resumo.status} className="rounded-2xl bg-white border border-slate-100 p-3">
                <div className="mb-2">
                  <BadgeStatus status={resumo.status} />
                </div>
                <p className="text-2xl font-black text-slate-900">{resumo.total}</p>
                <p className="text-xs text-slate-500">item(ns)</p>
              </div>
            ))}
          </div>

          {painelPorSetor.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-100 p-5 text-center text-sm text-slate-400">
              Nenhum item encontrado para os filtros selecionados.
            </div>
          ) : (
            <div className="space-y-5">
              {painelPorSetor.map((grupoSetor) => (
                <div key={grupoSetor.setor} className="rounded-3xl bg-white border border-slate-100 p-4 overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                    <div className="min-w-0">
                      <h4 className="font-black text-slate-900">{grupoSetor.setor}</h4>
                      <p className="text-xs text-slate-500">{grupoSetor.total} item(ns) neste setor</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {grupoSetor.statuses.map((grupoStatus) => (
                      <div key={`${grupoSetor.setor}-${grupoStatus.status}`} className="rounded-2xl border border-slate-100 overflow-hidden">
                        <div className="bg-slate-50 px-4 py-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <BadgeStatus status={grupoStatus.status} />
                            <span className="text-xs font-bold text-slate-500">
                              {grupoStatus.itens.length} item(ns)
                            </span>
                          </div>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {grupoStatus.itens.map((it) => {
                            const sol = solicitacoes.find((s) => s.id === it.solicitacaoId);
                            const totalItem = Number(it.quantidade || 0) * dinheiroParaNumero(it.valorUnitario);

                            return (
                              <div key={it.id} className="p-4 overflow-hidden">
                                <div className="flex flex-col 2xl:flex-row 2xl:items-start 2xl:justify-between gap-4">
                                  <div className="flex gap-3 flex-1 min-w-0">
                                    {isAdmin && (
                                      <button
                                        onClick={() => alternarItem(it.id)}
                                        className="mt-1 text-blue-700 hover:text-blue-900 shrink-0"
                                        title="Selecionar item"
                                      >
                                        {itemSelecionado(it.id) ? (
                                          <CheckSquare size={22} />
                                        ) : (
                                          <Square size={22} />
                                        )}
                                      </button>
                                    )}

                                    <div className="flex-1 min-w-0 overflow-hidden">
                                      <p className="font-bold text-slate-900 break-words">
                                        {it.quantidade} {it.unidade} • {it.descricao}
                                      </p>

                                      <p className="text-sm text-slate-500 mt-1 break-words">
                                        Solicitação #{String(it.solicitacaoNumero || it.solicitacaoId).slice(-4).toUpperCase()} •
                                        {" "}Data: {it.dataSolicitacao || "-"} • Solicitante: {it.solicitante || "-"} • Prioridade: {it.prioridade || "Normal"}
                                      </p>

                                      <p className="text-sm text-slate-500 mt-1 break-words">
                                        Marca/modelo: {it.marca || "-"} • Local: {it.local || "-"}
                                      </p>

                                      <ObservacaoLonga texto={it.observacao} />

                                      {isAdmin && (
                                        <p className="text-sm font-bold text-teal-700 mt-1">
                                          Valor estimado: {brl(totalItem)}
                                        </p>
                                      )}

                                      {it.status === "Reprovada" && it.motivoReprovacao && (
                                        <div className="mt-3 rounded-2xl bg-rose-50 border border-rose-100 p-3 text-sm text-rose-700 overflow-hidden">
                                          <strong>Motivo da reprovação:</strong>{" "}
                                          <span className="break-words">{it.motivoReprovacao}</span>
                                        </div>
                                      )}

                                      {it.status === "Entregue" && (
                                        <div className="mt-3 rounded-2xl bg-teal-50 border border-teal-100 p-3 text-sm text-teal-700 overflow-hidden">
                                          <p className="break-words">
                                            <strong>Recebimento:</strong> {it.recebidoPor || "-"}{" "}
                                            {it.dataRecebimento ? `em ${it.dataRecebimento}` : ""}
                                          </p>
                                          <p className="mt-1 break-words">
                                            <strong>NF:</strong> {it.numeroNotaFiscal || "Não informada"}
                                            {isAdmin && it.fornecedor && <span> • Fornecedor: {it.fornecedor}</span>}
                                          </p>
                                          <p className="mt-1 break-words">
                                            <strong>Malote:</strong>{" "}
                                            {it.enviadoMalote
                                              ? `Enviado${it.dataEnvioMalote ? ` em ${it.dataEnvioMalote}` : ""}`
                                              : "Pendente de envio"}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {isAdmin && sol && (
                                    <div className="flex flex-wrap gap-2 2xl:justify-end 2xl:w-[430px] 2xl:shrink-0">
                                      <button
                                        onClick={() => aprovarItem(sol.id, it.id)}
                                        className="px-3 py-2 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
                                      >
                                        <CheckCircle2 size={14} />
                                        Aprovar
                                      </button>

                                      <button
                                        onClick={() => reprovarItem(sol.id, it.id, it.motivoReprovacao)}
                                        className="px-3 py-2 rounded-2xl bg-rose-600 text-white text-xs font-bold flex items-center gap-1"
                                      >
                                        <XCircle size={14} />
                                        Reprovar
                                      </button>

                                      <button
                                        onClick={() => marcarCompradoItem(sol.id, it.id, it)}
                                        className="px-3 py-2 rounded-2xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-1"
                                      >
                                        <ShoppingCart size={14} />
                                        Comprado
                                      </button>

                                      <button
                                        onClick={() => marcarEntregueItem(sol.id, it.id, it)}
                                        className="px-3 py-2 rounded-2xl bg-teal-600 text-white text-xs font-bold flex items-center gap-1"
                                      >
                                        <PackageCheck size={14} />
                                        Entregue
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <h3 className="font-bold mb-4">Solicitações</h3>

        {carregando ? (
          <p className="text-sm text-slate-400 text-center py-8">
            Carregando solicitações...
          </p>
        ) : (
          <div className="space-y-5">
            {listaVisivel.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">
                Nenhuma solicitação encontrada.
              </p>
            )}

            {listaVisivel.map((sol) => (
              <div key={sol.id} className="rounded-3xl border border-slate-100 p-5 overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-slate-900 break-words">
                        {sol.setor || "Área não informada"} • {sol.solicitante}
                      </h4>
                      <BadgeStatus status={statusGeral(sol)} />
                    </div>

                    <p className="text-sm text-slate-500 break-words">
                      Solicitação #{String(sol.numero || sol.id).slice(-4).toUpperCase()} • Data:{" "}
                      {sol.data} • Prioridade: {sol.prioridade}
                    </p>

                    {sol.observacaoGeral && (
                      <div className="text-sm text-slate-500 mt-1 max-w-full overflow-hidden">
                        <span className="font-semibold">Obs.: </span>
                        <span className="break-all whitespace-normal">
                          {sol.observacaoGeral}
                        </span>
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => excluirSolicitacao(sol)}
                      className="px-3 py-2 rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1 shrink-0"
                    >
                      <Trash2 size={14} />
                      Excluir solicitação
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {(sol.itens || []).map((it, idx) => (
                    <div
                      key={it.id || idx}
                      className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 overflow-hidden"
                    >
                      <div className="flex flex-col 2xl:flex-row 2xl:items-start 2xl:justify-between gap-4">
                        <div className="flex gap-3 flex-1 min-w-0">
                          {isAdmin && (
                            <button
                              onClick={() => alternarItem(it.id)}
                              className="mt-1 text-blue-700 hover:text-blue-900 shrink-0"
                              title="Selecionar item"
                            >
                              {itemSelecionado(it.id) ? (
                                <CheckSquare size={22} />
                              ) : (
                                <Square size={22} />
                              )}
                            </button>
                          )}

                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <BadgeStatus status={it.status || "Nova"} />
                              <span className="text-xs text-slate-400">
                                Item {idx + 1}
                              </span>
                            </div>

                            <p className="font-bold text-slate-900 break-words">
                              {it.quantidade} {it.unidade} • {it.descricao}
                            </p>

                            <p className="text-sm text-slate-500 break-words">
                              Marca/modelo: {it.marca || "-"} • Local: {it.local || "-"}
                            </p>

                            <ObservacaoLonga texto={it.observacao} />

                            {it.status === "Reprovada" && it.motivoReprovacao && (
                              <div className="mt-3 rounded-2xl bg-rose-50 border border-rose-100 p-3 text-sm text-rose-700 overflow-hidden">
                                <strong>Motivo da reprovação:</strong>{" "}
                                <span className="break-words">{it.motivoReprovacao}</span>
                              </div>
                            )}

                            {it.status === "Entregue" && (
                              <div className="mt-3 rounded-2xl bg-teal-50 border border-teal-100 p-3 text-sm text-teal-700 overflow-hidden">
                                <p className="break-words">
                                  <strong>Recebimento:</strong> {it.recebidoPor || "-"}{" "}
                                  {it.dataRecebimento ? `em ${it.dataRecebimento}` : ""}
                                </p>

                                <p className="mt-1 break-words">
                                  <strong>NF:</strong> {it.numeroNotaFiscal || "Não informada"}
                                  {isAdmin && it.fornecedor && (
                                    <span> • Fornecedor: {it.fornecedor}</span>
                                  )}
                                </p>

                                <p className="mt-1 break-words">
                                  <strong>Malote:</strong>{" "}
                                  {it.enviadoMalote
                                    ? `Enviado${it.dataEnvioMalote ? ` em ${it.dataEnvioMalote}` : ""}`
                                    : "Pendente de envio"}
                                </p>

                                {it.obsRecebimento && (
                                  <p className="mt-1 break-all">Obs.: {it.obsRecebimento}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="w-full 2xl:w-[430px] 2xl:shrink-0 space-y-3 overflow-hidden">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                value={it.valorUnitario || ""}
                                onChange={(e) =>
                                  atualizarItemLocal(sol.id, it.id, {
                                    valorUnitario: e.target.value,
                                  })
                                }
                                onBlur={(e) =>
                                  salvarItemAdmin(it.id, {
                                    valorUnitario: e.target.value,
                                  })
                                }
                                className="rounded-2xl border bg-white p-2 text-sm min-w-0"
                                placeholder="Valor unitário"
                              />

                              <input
                                value={it.fornecedor || ""}
                                onChange={(e) =>
                                  atualizarItemLocal(sol.id, it.id, {
                                    fornecedor: e.target.value,
                                  })
                                }
                                onBlur={(e) =>
                                  salvarItemAdmin(it.id, {
                                    fornecedor: e.target.value,
                                  })
                                }
                                className="rounded-2xl border bg-white p-2 text-sm min-w-0"
                                placeholder="Fornecedor"
                              />

                              <input
                                value={it.numeroNotaFiscal || ""}
                                onChange={(e) =>
                                  atualizarItemLocal(sol.id, it.id, {
                                    numeroNotaFiscal: e.target.value,
                                  })
                                }
                                onBlur={(e) =>
                                  salvarItemAdmin(it.id, {
                                    numeroNotaFiscal: e.target.value,
                                  })
                                }
                                className="rounded-2xl border bg-white p-2 text-sm min-w-0"
                                placeholder="Nº da nota fiscal *"
                              />

                              <label className="rounded-2xl border bg-white p-2 text-sm flex items-center gap-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={!!it.enviadoMalote}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    atualizarItemLocal(sol.id, it.id, {
                                      enviadoMalote: checked,
                                      dataEnvioMalote: checked
                                        ? it.dataEnvioMalote || today()
                                        : null,
                                    });
                                    salvarItemAdmin(it.id, {
                                      enviadoMalote: checked,
                                      dataEnvioMalote: checked
                                        ? it.dataEnvioMalote || today()
                                        : null,
                                    });
                                  }}
                                  className="w-4 h-4 shrink-0"
                                />
                                <span className="font-semibold text-slate-600 break-words">
                                  NF enviada ao malote
                                </span>
                              </label>

                              <input
                                value={it.recebidoPor || ""}
                                onChange={(e) =>
                                  atualizarItemLocal(sol.id, it.id, {
                                    recebidoPor: e.target.value,
                                  })
                                }
                                onBlur={(e) =>
                                  salvarItemAdmin(it.id, {
                                    recebidoPor: e.target.value,
                                  })
                                }
                                className="rounded-2xl border bg-white p-2 text-sm min-w-0"
                                placeholder="Recebido por"
                              />

                              <input
                                type="date"
                                value={it.dataRecebimento || ""}
                                onChange={(e) =>
                                  atualizarItemLocal(sol.id, it.id, {
                                    dataRecebimento: e.target.value,
                                  })
                                }
                                onBlur={(e) =>
                                  salvarItemAdmin(it.id, {
                                    dataRecebimento: e.target.value,
                                  })
                                }
                                className="rounded-2xl border bg-white p-2 text-sm min-w-0"
                              />

                              <input
                                value={it.obsRecebimento || ""}
                                onChange={(e) =>
                                  atualizarItemLocal(sol.id, it.id, {
                                    obsRecebimento: e.target.value,
                                  })
                                }
                                onBlur={(e) =>
                                  salvarItemAdmin(it.id, {
                                    obsRecebimento: e.target.value,
                                  })
                                }
                                className="rounded-2xl border bg-white p-2 text-sm min-w-0"
                                placeholder="Obs. recebimento"
                              />

                              <input
                                type="date"
                                value={it.dataEnvioMalote || ""}
                                onChange={(e) =>
                                  atualizarItemLocal(sol.id, it.id, {
                                    dataEnvioMalote: e.target.value,
                                  })
                                }
                                onBlur={(e) =>
                                  salvarItemAdmin(it.id, {
                                    dataEnvioMalote: e.target.value,
                                  })
                                }
                                className="rounded-2xl border bg-white p-2 text-sm min-w-0"
                                title="Data de envio ao malote"
                              />
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => aprovarItem(sol.id, it.id)}
                                className="px-3 py-2 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
                              >
                                <CheckCircle2 size={14} />
                                Aprovar
                              </button>

                              <button
                                onClick={() =>
                                  reprovarItem(sol.id, it.id, it.motivoReprovacao)
                                }
                                className="px-3 py-2 rounded-2xl bg-rose-600 text-white text-xs font-bold flex items-center gap-1"
                              >
                                <XCircle size={14} />
                                Reprovar
                              </button>

                              <button
                                onClick={() => marcarCompradoItem(sol.id, it.id, it)}
                                className="px-3 py-2 rounded-2xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-1"
                              >
                                <ShoppingCart size={14} />
                                Comprado
                              </button>

                              <button
                                onClick={() => marcarEntregueItem(sol.id, it.id, it)}
                                className="px-3 py-2 rounded-2xl bg-teal-600 text-white text-xs font-bold flex items-center gap-1"
                              >
                                <PackageCheck size={14} />
                                Entregue
                              </button>

                              <button
                                onClick={() => excluirItem(sol, it)}
                                className="px-3 py-2 rounded-2xl bg-white border border-rose-200 text-rose-600 text-xs font-bold flex items-center gap-1 hover:bg-rose-50"
                              >
                                <Trash2 size={14} />
                                Excluir item
                              </button>

                              <select
                                value={it.status || "Nova"}
                                onChange={(e) =>
                                  atualizarItem(sol.id, it.id, {
                                    status: e.target.value,
                                  })
                                }
                                className="rounded-2xl border p-2 text-xs bg-white"
                              >
                                {statusItem.map((s) => (
                                  <option key={s}>{s}</option>
                                ))}
                              </select>
                            </div>

                            <p className="text-xs font-semibold text-slate-500">
                              Total do item:{" "}
                              {brl(
                                Number(it.quantidade || 0) *
                                  dinheiroParaNumero(it.valorUnitario)
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
