import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  Database,
  Droplets,
  Filter,
  Fuel,
  History as HistoryIcon,
  Mail,
  PackagePlus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  User,
  Zap,
} from "lucide-react";
import {
  excluirHistoricoSupabase,
  limparHistoricoSupabase,
  listarHistoricoSupabase,
} from "../services/historicoSupabaseService";

function formatarData(data) {
  if (!data) return "-";

  try {
    return new Date(data).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return data;
  }
}

function dataCurta(data) {
  if (!data) return "-";

  try {
    return new Date(data).toLocaleDateString("pt-BR");
  } catch {
    return data;
  }
}

function normalizar(txt) {
  return String(txt || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function textoDados(dados) {
  if (!dados) return "";

  if (typeof dados === "string") return dados;

  try {
    return JSON.stringify(dados, null, 2);
  } catch {
    return "";
  }
}

function obterModulo(r) {
  return r.modulo || r.tipo || "Geral";
}

function obterAcao(r) {
  return r.acao || "Registro";
}

function estiloModulo(modulo) {
  const m = normalizar(modulo);

  if (m.includes("solicitacao") || m.includes("material")) {
    return {
      badge: "bg-blue-50 text-blue-700 border-blue-100",
      iconBg: "bg-blue-50 text-blue-700",
      icon: PackagePlus,
    };
  }

  if (m.includes("energia") || m.includes("locatario")) {
    return {
      badge: "bg-teal-50 text-teal-700 border-teal-100",
      iconBg: "bg-teal-50 text-teal-700",
      icon: Zap,
    };
  }

  if (m.includes("agua") || m.includes("rateio")) {
    return {
      badge: "bg-purple-50 text-purple-700 border-purple-100",
      iconBg: "bg-purple-50 text-purple-700",
      icon: Droplets,
    };
  }

  if (m.includes("gerador") || m.includes("diesel")) {
    return {
      badge: "bg-amber-50 text-amber-700 border-amber-100",
      iconBg: "bg-amber-50 text-amber-700",
      icon: Fuel,
    };
  }

  if (m.includes("malote")) {
    return {
      badge: "bg-indigo-50 text-indigo-700 border-indigo-100",
      iconBg: "bg-indigo-50 text-indigo-700",
      icon: Mail,
    };
  }

  if (m.includes("usuario") || m.includes("permiss")) {
    return {
      badge: "bg-rose-50 text-rose-700 border-rose-100",
      iconBg: "bg-rose-50 text-rose-700",
      icon: ShieldCheck,
    };
  }

  return {
    badge: "bg-slate-50 text-slate-700 border-slate-100",
    iconBg: "bg-slate-50 text-slate-700",
    icon: Activity,
  };
}

function BadgeModulo({ modulo }) {
  const estilo = estiloModulo(modulo);

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-black ${estilo.badge}`}
    >
      {modulo || "Geral"}
    </span>
  );
}

function CardResumoHistorico({ titulo, valor, subtitulo, icon: Icon, cor = "blue" }) {
  const cores = {
    blue: "bg-blue-50 text-blue-700",
    teal: "bg-teal-50 text-teal-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    slate: "bg-slate-50 text-slate-700",
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{titulo}</p>
          <p className="text-3xl font-black text-slate-900 mt-2">{valor}</p>
          {subtitulo && <p className="text-xs text-slate-400 mt-1">{subtitulo}</p>}
        </div>

        {Icon && (
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${cores[cor] || cores.blue}`}>
            <Icon size={21} />
          </div>
        )}
      </div>
    </div>
  );
}

function LinhaTempo({ registro, onExcluir }) {
  const modulo = obterModulo(registro);
  const acao = obterAcao(registro);
  const estilo = estiloModulo(modulo);
  const Icon = estilo.icon;
  const [aberto, setAberto] = useState(false);
  const detalhes = textoDados(registro.dados);

  return (
    <div className="relative pl-12">
      <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-100" />

      <div className={`absolute left-0 top-1 w-10 h-10 rounded-2xl flex items-center justify-center ${estilo.iconBg}`}>
        <Icon size={19} />
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 overflow-hidden">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <BadgeModulo modulo={modulo} />
              <span className="text-xs font-semibold text-slate-400">
                {formatarData(registro.criado_em)}
              </span>
            </div>

            <h3 className="font-black text-slate-900 break-words">
              {acao}
            </h3>

            <p className="text-sm text-slate-600 mt-2 break-words">
              {registro.descricao || "Sem descrição informada."}
            </p>

            <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <User size={14} />
                {registro.usuario || "Sistema"}
              </span>

              {registro.referencia_id && (
                <span className="inline-flex items-center gap-1">
                  <Database size={14} />
                  Ref.: {String(registro.referencia_id).slice(-8)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {detalhes && (
              <button
                onClick={() => setAberto(!aberto)}
                className="px-3 py-2 rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold"
              >
                {aberto ? "Ocultar detalhes" : "Ver detalhes"}
              </button>
            )}

            <button
              onClick={() => onExcluir(registro.id)}
              className="px-3 py-2 rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1"
            >
              <Trash2 size={14} />
              Excluir
            </button>
          </div>
        </div>

        {aberto && detalhes && (
          <pre className="mt-4 whitespace-pre-wrap font-sans text-xs bg-slate-50 rounded-2xl p-4 max-h-72 overflow-auto text-slate-600 border border-slate-100">
            {detalhes}
          </pre>
        )}
      </div>
    </div>
  );
}

export default function Historico() {
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [moduloFiltro, setModuloFiltro] = useState("Todos");
  const [acaoFiltro, setAcaoFiltro] = useState("Todos");
  const [usuarioFiltro, setUsuarioFiltro] = useState("Todos");
  const [dataFiltro, setDataFiltro] = useState("");
  const [erro, setErro] = useState("");

  async function carregarHistorico() {
    setCarregando(true);
    setErro("");

    try {
      const lista = await listarHistoricoSupabase();
      setRegistros(Array.isArray(lista) ? lista : []);
    } catch (err) {
      console.error(err);
      setErro("Não foi possível carregar o histórico do Supabase. " + (err?.message || ""));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarHistorico();
  }, []);

  const modulos = useMemo(() => {
    return [
      "Todos",
      ...Array.from(new Set(registros.map((r) => obterModulo(r)).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      ),
    ];
  }, [registros]);

  const acoes = useMemo(() => {
    return [
      "Todos",
      ...Array.from(new Set(registros.map((r) => obterAcao(r)).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      ),
    ];
  }, [registros]);

  const usuarios = useMemo(() => {
    return [
      "Todos",
      ...Array.from(new Set(registros.map((r) => r.usuario).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      ),
    ];
  }, [registros]);

  const registrosFiltrados = useMemo(() => {
    const termo = normalizar(busca);

    return registros.filter((r) => {
      const modulo = obterModulo(r);
      const acao = obterAcao(r);

      const moduloOk = moduloFiltro === "Todos" || modulo === moduloFiltro;
      const acaoOk = acaoFiltro === "Todos" || acao === acaoFiltro;
      const usuarioOk = usuarioFiltro === "Todos" || r.usuario === usuarioFiltro;

      const dataOk =
        !dataFiltro || String(r.criado_em || "").slice(0, 10) === dataFiltro;

      const texto = normalizar(
        [
          r.tipo,
          r.modulo,
          r.acao,
          r.descricao,
          r.usuario,
          r.referencia_id,
          formatarData(r.criado_em),
          textoDados(r.dados),
        ].join(" ")
      );

      return moduloOk && acaoOk && usuarioOk && dataOk && (!termo || texto.includes(termo));
    });
  }, [registros, busca, moduloFiltro, acaoFiltro, usuarioFiltro, dataFiltro]);

  async function excluirRegistro(id) {
    const confirmar = window.confirm("Deseja excluir este registro do histórico?");
    if (!confirmar) return;

    try {
      await excluirHistoricoSupabase(id);
      await carregarHistorico();
    } catch (err) {
      console.error(err);
      alert("Não foi possível excluir o registro. " + (err?.message || ""));
    }
  }

  async function limparTudo() {
    const confirmar = window.confirm(
      "Deseja apagar TODO o histórico? Essa ação não pode ser desfeita."
    );

    if (!confirmar) return;

    const confirmar2 = window.confirm(
      "Confirma novamente? Todo o histórico será apagado do Supabase."
    );

    if (!confirmar2) return;

    try {
      await limparHistoricoSupabase();
      await carregarHistorico();
    } catch (err) {
      console.error(err);
      alert("Não foi possível limpar o histórico. " + (err?.message || ""));
    }
  }

  function limparFiltros() {
    setBusca("");
    setModuloFiltro("Todos");
    setAcaoFiltro("Todos");
    setUsuarioFiltro("Todos");
    setDataFiltro("");
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const registrosHoje = registros.filter(
    (r) => String(r.criado_em || "").slice(0, 10) === hoje
  ).length;

  const ultimoRegistro = registros[0];

  const modulosMaisAtivos = useMemo(() => {
    const mapa = new Map();

    registros.forEach((r) => {
      const modulo = obterModulo(r);
      mapa.set(modulo, (mapa.get(modulo) || 0) + 1);
    });

    return Array.from(mapa.entries())
      .map(([modulo, total]) => ({ modulo, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [registros]);

  return (
    <div className="space-y-6">
      {erro && (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm">
          {erro}
        </div>
      )}

      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white p-6 md:p-8 shadow-xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="text-teal-200 font-semibold mb-2">Rastreabilidade</p>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight">
              Histórico inteligente
            </h1>
            <p className="text-slate-300 mt-3 max-w-3xl">
              Consulte ações do sistema, alterações de status, exclusões, aprovações,
              medições, rateios e registros salvos no Supabase.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={carregarHistorico}
              className="px-4 py-3 rounded-2xl bg-white/10 border border-white/10 text-white hover:bg-white/20 flex items-center gap-2 text-sm font-semibold"
            >
              <RefreshCcw size={16} />
              Atualizar
            </button>

            <button
              onClick={limparTudo}
              className="px-4 py-3 rounded-2xl bg-rose-500/15 border border-rose-300/20 text-rose-100 hover:bg-rose-500/25 flex items-center gap-2 text-sm font-semibold"
            >
              <Trash2 size={16} />
              Limpar histórico
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CardResumoHistorico
          titulo="Total de registros"
          valor={registros.length}
          subtitulo="Ações salvas no histórico"
          icon={HistoryIcon}
          cor="blue"
        />

        <CardResumoHistorico
          titulo="Registros hoje"
          valor={registrosHoje}
          subtitulo="Movimentações do dia"
          icon={CalendarDays}
          cor="teal"
        />

        <CardResumoHistorico
          titulo="Módulos encontrados"
          valor={Math.max(modulos.length - 1, 0)}
          subtitulo="Áreas com histórico"
          icon={Filter}
          cor="amber"
        />

        <CardResumoHistorico
          titulo="Último registro"
          valor={ultimoRegistro ? dataCurta(ultimoRegistro.criado_em) : "-"}
          subtitulo={ultimoRegistro ? obterAcao(ultimoRegistro) : "Nenhum registro"}
          icon={Activity}
          cor="slate"
        />
      </div>

      {modulosMaisAtivos.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-black text-slate-900 mb-1">Módulos mais ativos</h3>
          <p className="text-sm text-slate-500 mb-4">
            Principais áreas com movimentações registradas.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {modulosMaisAtivos.map((m) => (
              <div key={m.modulo} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <BadgeModulo modulo={m.modulo} />
                <p className="text-2xl font-black text-slate-900 mt-3">{m.total}</p>
                <p className="text-xs text-slate-500">registro(s)</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 mb-5">
          <div className="xl:col-span-4">
            <label className="text-xs font-bold text-slate-500">Pesquisar</label>

            <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2">
              <Search size={18} className="text-slate-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por descrição, usuário, item, status..."
                className="w-full outline-none text-sm"
              />
            </div>
          </div>

          <div className="xl:col-span-2">
            <label className="text-xs font-bold text-slate-500">Módulo</label>

            <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2">
              <Filter size={18} className="text-slate-400" />
              <select
                value={moduloFiltro}
                onChange={(e) => setModuloFiltro(e.target.value)}
                className="w-full outline-none text-sm bg-transparent"
              >
                {modulos.map((modulo) => (
                  <option key={modulo}>{modulo}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="xl:col-span-2">
            <label className="text-xs font-bold text-slate-500">Ação</label>

            <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2">
              <Activity size={18} className="text-slate-400" />
              <select
                value={acaoFiltro}
                onChange={(e) => setAcaoFiltro(e.target.value)}
                className="w-full outline-none text-sm bg-transparent"
              >
                {acoes.map((acao) => (
                  <option key={acao}>{acao}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="xl:col-span-2">
            <label className="text-xs font-bold text-slate-500">Usuário</label>

            <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2">
              <User size={18} className="text-slate-400" />
              <select
                value={usuarioFiltro}
                onChange={(e) => setUsuarioFiltro(e.target.value)}
                className="w-full outline-none text-sm bg-transparent"
              >
                {usuarios.map((usuario) => (
                  <option key={usuario}>{usuario}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="xl:col-span-2">
            <label className="text-xs font-bold text-slate-500">Data</label>

            <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2">
              <CalendarDays size={18} className="text-slate-400" />
              <input
                type="date"
                value={dataFiltro}
                onChange={(e) => setDataFiltro(e.target.value)}
                className="w-full outline-none text-sm bg-transparent"
              />
            </div>
          </div>
        </div>

        {(busca ||
          moduloFiltro !== "Todos" ||
          acaoFiltro !== "Todos" ||
          usuarioFiltro !== "Todos" ||
          dataFiltro) && (
          <div className="flex justify-end mb-5">
            <button
              onClick={limparFiltros}
              className="px-4 py-2 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold"
            >
              Limpar filtros
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="font-black text-slate-900">Linha do tempo</h3>
            <p className="text-sm text-slate-500">
              {registrosFiltrados.length} registro(s) encontrado(s).
            </p>
          </div>
        </div>

        {carregando ? (
          <p className="text-sm text-slate-400 text-center py-8">
            Carregando histórico...
          </p>
        ) : registrosFiltrados.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            Nenhum registro encontrado.
          </p>
        ) : (
          <div className="space-y-4">
            {registrosFiltrados.map((registro) => (
              <LinhaTempo
                key={registro.id}
                registro={registro}
                onExcluir={excluirRegistro}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
