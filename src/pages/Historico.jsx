import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Filter,
  History as HistoryIcon,
  RefreshCcw,
  Search,
  Trash2,
  User,
} from "lucide-react";
import {
  excluirHistoricoSupabase,
  limparHistoricoSupabase,
  listarHistoricoSupabase,
} from "../services/historicoSupabaseService";

function formatarData(data) {
  if (!data) return "-";

  try {
    return new Date(data).toLocaleString("pt-BR");
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

function BadgeTipo({ tipo }) {
  const t = normalizar(tipo);

  let estilo = "bg-slate-100 text-slate-700";

  if (t.includes("solicitacao") || t.includes("solicitação")) {
    estilo = "bg-blue-50 text-blue-700";
  } else if (t.includes("calculo") || t.includes("cálculo")) {
    estilo = "bg-amber-50 text-amber-700";
  } else if (t.includes("usuario") || t.includes("usuário")) {
    estilo = "bg-purple-50 text-purple-700";
  } else if (t.includes("gerador")) {
    estilo = "bg-amber-50 text-amber-700";
  } else if (t.includes("locatario") || t.includes("locatário")) {
    estilo = "bg-teal-50 text-teal-700";
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${estilo}`}>
      {tipo || "Geral"}
    </span>
  );
}

export default function Historico() {
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("Todos");
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

  const tipos = useMemo(() => {
    return [
      "Todos",
      ...Array.from(new Set(registros.map((r) => r.tipo).filter(Boolean))),
    ];
  }, [registros]);

  const registrosFiltrados = useMemo(() => {
    const termo = normalizar(busca);

    return registros.filter((r) => {
      const tipoOk = tipoFiltro === "Todos" || r.tipo === tipoFiltro;
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

      return tipoOk && dataOk && (!termo || texto.includes(termo));
    });
  }, [registros, busca, tipoFiltro, dataFiltro]);

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

  const hoje = new Date().toISOString().slice(0, 10);
  const registrosHoje = registros.filter(
    (r) => String(r.criado_em || "").slice(0, 10) === hoje
  ).length;

  return (
    <div className="space-y-6">
      {erro && (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm">
          {erro}
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
              <HistoryIcon className="text-blue-700" size={24} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Histórico do Sistema
              </h2>
              <p className="text-sm text-slate-500">
                Registros de ações salvos no Supabase.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={carregarHistorico}
              className="px-4 py-2 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2 text-sm font-semibold"
            >
              <RefreshCcw size={16} />
              Atualizar
            </button>

            <button
              onClick={limparTudo}
              className="px-4 py-2 rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center gap-2 text-sm font-semibold"
            >
              <Trash2 size={16} />
              Limpar histórico
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
          <p className="text-sm text-slate-500">Total de registros</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            {registros.length}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
          <p className="text-sm text-slate-500">Registros hoje</p>
          <p className="text-3xl font-bold text-blue-700 mt-2">
            {registrosHoje}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
          <p className="text-sm text-slate-500">Tipos encontrados</p>
          <p className="text-3xl font-bold text-teal-700 mt-2">
            {Math.max(tipos.length - 1, 0)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
        <div className="flex flex-col lg:flex-row gap-3 mb-5">
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-500">Pesquisar</label>

            <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2">
              <Search size={18} className="text-slate-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por descrição, tipo, usuário, item, status..."
                className="w-full outline-none text-sm"
              />
            </div>
          </div>

          <div className="lg:w-72">
            <label className="text-xs font-bold text-slate-500">Tipo</label>

            <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2">
              <Filter size={18} className="text-slate-400" />
              <select
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value)}
                className="w-full outline-none text-sm bg-transparent"
              >
                {tipos.map((tipo) => (
                  <option key={tipo}>{tipo}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="lg:w-56">
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

          {(busca || tipoFiltro !== "Todos" || dataFiltro) && (
            <button
              onClick={() => {
                setBusca("");
                setTipoFiltro("Todos");
                setDataFiltro("");
              }}
              className="self-end px-4 py-2 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold"
            >
              Limpar filtros
            </button>
          )}
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
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-3 pr-4">Data</th>
                  <th className="py-3 pr-4">Tipo</th>
                  <th className="py-3 pr-4">Ação</th>
                  <th className="py-3 pr-4">Usuário</th>
                  <th className="py-3 pr-4">Descrição</th>
                  <th className="py-3 pr-4">Detalhes</th>
                  <th className="py-3 pr-4 text-right">Excluir</th>
                </tr>
              </thead>

              <tbody>
                {registrosFiltrados.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 align-top">
                    <td className="py-3 pr-4 whitespace-nowrap text-slate-600">
                      {formatarData(r.criado_em)}
                    </td>

                    <td className="py-3 pr-4">
                      <BadgeTipo tipo={r.tipo} />
                    </td>

                    <td className="py-3 pr-4 font-semibold text-slate-800 min-w-[180px]">
                      {r.acao || "-"}
                    </td>

                    <td className="py-3 pr-4 text-slate-600 min-w-[160px]">
                      <span className="inline-flex items-center gap-1">
                        <User size={14} />
                        {r.usuario || "-"}
                      </span>
                    </td>

                    <td className="py-3 pr-4 text-slate-700 min-w-[260px]">
                      {r.descricao || "-"}
                    </td>

                    <td className="py-3 pr-4 text-slate-500 min-w-[320px]">
                      <pre className="whitespace-pre-wrap font-sans text-xs bg-slate-50 rounded-2xl p-3 max-h-40 overflow-auto">
                        {textoDados(r.dados) || "-"}
                      </pre>
                    </td>

                    <td className="py-3 pr-4 text-right">
                      <button
                        onClick={() => excluirRegistro(r.id)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold"
                      >
                        <Trash2 size={14} />
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
