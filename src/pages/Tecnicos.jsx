import {
  CalendarDays,
  Flame,
  Fuel,
  RefreshCcw,
  Save,
  Search,
  Snowflake,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import CardResumo from "../components/CardResumo";
import { getSession } from "../services/storageService";
import {
  criarCalculoTecnicoSupabase,
  excluirCalculoTecnicoSupabase,
  excluirCalculosTecnicosEmLoteSupabase,
  listarCalculosTecnicosSupabase,
  normalizarCalculoTecnicoParaTela,
  verificarSenhaAdminSupabase,
} from "../services/calculosTecnicosSupabaseService";
import { registrarHistoricoSupabase } from "../services/historicoSupabaseService";
import { calcularDieselMensal } from "../utils/calculosGeradores";
import { calcularFancoil, calcularGas } from "../utils/calculosTecnicos";
import { brl, num, today } from "../utils/formatters";

function inicioDoMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function normalizarTexto(txt) {
  return String(txt || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatDateBR(value) {
  if (!value) return "-";
  const [y, m, d] = String(value).split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function tipoLabel(tipo) {
  const mapa = {
    diesel: "Diesel mensal",
    fancoil: "Fancoil",
    gas: "Gás",
    teste: "Teste",
  };

  return mapa[tipo] || tipo;
}

function resultadoPrincipal(item) {
  if (item.tipo === "diesel") return `${num(item.total, 3)} L`;
  if (item.tipo === "fancoil") return `${num(item.consumo)} kWh • ${brl(item.custo)}`;
  if (item.tipo === "gas") return `${num(item.totalKg)} kg`;
  return "-";
}

export default function Tecnicos({ user }) {
  const usuarioAtual = user || getSession();

  const [diesel, setDiesel] = useState({
    data: today(),
    consumoHoraGMGs: "145,8",
    tempo: "02:18:56",
    observacao: "",
  });

  const [fancoil, setFancoil] = useState({
    data: today(),
    kw: "11,0325",
    horasDia: "13",
    diasUteis: "22",
    precoKwh: "0,65",
    observacao: "",
  });

  const [gas, setGas] = useState({
    data: today(),
    consumoM3: "4085,414",
    fator: "0,78",
    observacao: "",
  });

  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [dataInicio, setDataInicio] = useState(inicioDoMes());
  const [dataFim, setDataFim] = useState(today());

  const d = calcularDieselMensal(diesel.consumoHoraGMGs, diesel.tempo);
  const f = calcularFancoil(fancoil);
  const g = calcularGas(gas);

  async function registrarHistoricoTecnico(acao, descricao, referenciaId = null, dados = {}) {
    try {
      await registrarHistoricoSupabase({
        tipo: "Cálculos Técnicos",
        modulo: "Cálculos Técnicos",
        acao,
        descricao,
        usuario: usuarioAtual?.nome || usuarioAtual?.usuario || "Sistema",
        usuario_id: usuarioAtual?.id || null,
        referencia_id: referenciaId,
        dados,
      });
    } catch (err) {
      console.error("Erro ao registrar histórico técnico:", err);
    }
  }

  async function carregarRegistros() {
    setCarregando(true);

    try {
      const lista = await listarCalculosTecnicosSupabase({
        dataInicio,
        dataFim,
        tipo: tipoFiltro === "todos" ? undefined : tipoFiltro,
      });

      setRegistros(lista.map(normalizarCalculoTecnicoParaTela));
    } catch (err) {
      console.error(err);
      alert("Não foi possível carregar os cálculos técnicos. " + (err?.message || ""));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarRegistros();
  }, []);

  async function salvarCalculo(payload) {
    setSalvando(true);

    try {
      const calculoCriado = await criarCalculoTecnicoSupabase({
        ...payload,
        usuario_nome: usuarioAtual?.nome || usuarioAtual?.usuario || "",
        usuario_id: usuarioAtual?.id || null,
      });

      await registrarHistoricoTecnico(
        "Cálculo salvo",
        `${payload.titulo || tipoLabel(payload.tipo)} salvo para relatório.`,
        calculoCriado?.id,
        {
          tipo: payload.tipo,
          titulo: payload.titulo,
          data: payload.data_calculo,
          resultado: payload.resultado,
        }
      );

      await carregarRegistros();
      alert("Cálculo salvo para relatório.");
    } catch (err) {
      console.error(err);
      alert("Não foi possível salvar o cálculo. " + (err?.message || ""));
    } finally {
      setSalvando(false);
    }
  }

  function salvarDiesel() {
    salvarCalculo({
      tipo: "diesel",
      titulo: "Racional de Cálculo de Diesel Mensal",
      data_calculo: diesel.data,
      mes_referencia: String(diesel.data).slice(0, 7),
      dados: {
        data: diesel.data,
        consumoHoraGMGs: diesel.consumoHoraGMGs,
        tempo: diesel.tempo,
      },
      resultado: {
        horas: d.horas,
        total: d.total,
      },
      observacao: diesel.observacao,
    });
  }

  function salvarFancoil() {
    salvarCalculo({
      tipo: "fancoil",
      titulo: "Cálculo Estimado de Consumo do Fancoil",
      data_calculo: fancoil.data,
      mes_referencia: String(fancoil.data).slice(0, 7),
      dados: {
        data: fancoil.data,
        kw: fancoil.kw,
        horasDia: fancoil.horasDia,
        diasUteis: fancoil.diasUteis,
        precoKwh: fancoil.precoKwh,
      },
      resultado: {
        consumo: f.consumo,
        custo: f.custo,
      },
      observacao: fancoil.observacao,
    });
  }

  function salvarGas() {
    salvarCalculo({
      tipo: "gas",
      titulo: "Racional de Consumo Total - Gás",
      data_calculo: gas.data,
      mes_referencia: String(gas.data).slice(0, 7),
      dados: {
        data: gas.data,
        consumoM3: gas.consumoM3,
        fator: gas.fator,
      },
      resultado: {
        totalKg: g.totalKg,
        comumKg: g.comumKg,
        privativoKg: g.privativoKg,
      },
      observacao: gas.observacao,
    });
  }

  async function validarSenhaAdmin() {
    const senha = window.prompt("Digite sua senha de administrador para confirmar:");

    if (!senha) {
      alert("Ação cancelada.");
      return false;
    }

    const senhaOk = await verificarSenhaAdminSupabase(usuarioAtual?.usuario, senha);

    if (!senhaOk) {
      alert("Senha incorreta ou usuário sem permissão de administrador.");
      return false;
    }

    return true;
  }

  async function excluirRegistro(item) {
    const confirmar = window.confirm(
      `Tem certeza que deseja excluir este cálculo?\n\n${tipoLabel(item.tipo)} • ${formatDateBR(item.data)}`
    );

    if (!confirmar) return;

    const senhaOk = await validarSenhaAdmin();
    if (!senhaOk) return;

    try {
      await excluirCalculoTecnicoSupabase(item.id);

      await registrarHistoricoTecnico(
        "Cálculo excluído",
        `${tipoLabel(item.tipo)} de ${formatDateBR(item.data)} excluído.`,
        item.id,
        { item }
      );

      await carregarRegistros();
      alert("Cálculo excluído com sucesso.");
    } catch (err) {
      console.error(err);
      alert("Não foi possível excluir o cálculo. " + (err?.message || ""));
    }
  }

  const registrosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);

    return registros.filter((item) => {
      const texto = normalizarTexto(
        [
          item.tipo,
          item.titulo,
          item.data,
          item.observacao,
          item.usuarioNome,
          JSON.stringify(item.dados || {}),
          JSON.stringify(item.resultado || {}),
        ].join(" ")
      );

      return !termo || texto.includes(termo);
    });
  }, [registros, busca]);

  async function zerarCalculosDoPeriodo() {
    if (!registrosFiltrados.length) {
      alert("Não há cálculos para zerar no filtro/período atual.");
      return;
    }

    const tipoTexto =
      tipoFiltro === "todos" ? "todos os tipos" : tipoLabel(tipoFiltro);

    const confirmar = window.confirm(
      `Deseja zerar os cálculos exibidos agora?\n\n` +
        `Período: ${formatDateBR(dataInicio)} até ${formatDateBR(dataFim)}\n` +
        `Tipo: ${tipoTexto}\n` +
        `Quantidade: ${registrosFiltrados.length} registro(s)\n\n` +
        `Essa ação vai excluir esses registros do banco.`
    );

    if (!confirmar) return;

    const senhaOk = await validarSenhaAdmin();
    if (!senhaOk) return;

    try {
      const ids = registrosFiltrados.map((item) => item.id);

      await excluirCalculosTecnicosEmLoteSupabase(ids);

      await registrarHistoricoTecnico(
        "Cálculos zerados",
        `${ids.length} cálculo(s) técnico(s) zerado(s) no período ${formatDateBR(
          dataInicio
        )} até ${formatDateBR(dataFim)}.`,
        null,
        {
          ids,
          tipoFiltro,
          dataInicio,
          dataFim,
          quantidade: ids.length,
        }
      );

      await carregarRegistros();
      alert("Cálculos zerados com sucesso.");
    } catch (err) {
      console.error(err);
      alert("Não foi possível zerar os cálculos. " + (err?.message || ""));
    }
  }

  const resumo = useMemo(() => {
    const dieselLista = registrosFiltrados.filter((i) => i.tipo === "diesel");
    const fancoilLista = registrosFiltrados.filter((i) => i.tipo === "fancoil");
    const gasLista = registrosFiltrados.filter((i) => i.tipo === "gas");

    return {
      total: registrosFiltrados.length,
      diesel: dieselLista.reduce((s, i) => s + Number(i.total || 0), 0),
      fancoil: fancoilLista.reduce((s, i) => s + Number(i.custo || 0), 0),
      gas: gasLista.reduce((s, i) => s + Number(i.totalKg || 0), 0),
    };
  }, [registrosFiltrados]);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <CardResumo titulo="Registros no período" valor={resumo.total} />
        <CardResumo titulo="Diesel mensal" valor={`${num(resumo.diesel, 3)} L`} icon={Fuel} />
        <CardResumo titulo="Custo fancoil" valor={brl(resumo.fancoil)} icon={Snowflake} cor="teal" />
        <CardResumo titulo="Gás convertido" valor={`${num(resumo.gas)} kg`} icon={Flame} cor="amber" />
      </section>

      <div className="bg-white rounded-3xl shadow-sm border border-rose-100 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="font-bold text-slate-900">Zerar cálculos acumulados</p>
          <p className="text-sm text-slate-500">
            Exclui os registros do período atual exibido nos cards. Use para limpar testes antes da apresentação.
          </p>
        </div>

        <button
          onClick={zerarCalculosDoPeriodo}
          className="px-5 py-3 rounded-2xl bg-rose-600 text-white font-semibold flex items-center justify-center gap-2 hover:bg-rose-700"
        >
          <Trash2 size={18} />
          Zerar cálculos
        </button>
      </div>

      <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
        <div className="flex gap-3 items-center mb-5">
          <Fuel className="text-blue-600" />
          <div>
            <h3 className="font-bold text-lg">Racional de Cálculo de Diesel Mensal</h3>
            <p className="text-sm text-slate-500">
              Consumo total mensal = consumo por hora dos 2 GMGs × tempo dos GMGs convertido em horas.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input type="date" value={diesel.data} onChange={(e) => setDiesel({ ...diesel, data: e.target.value })} className="rounded-2xl border p-3" />
          <input value={diesel.consumoHoraGMGs} onChange={(e) => setDiesel({ ...diesel, consumoHoraGMGs: e.target.value })} className="rounded-2xl border p-3" placeholder="Consumo hora dos 2 GMGs" />
          <input value={diesel.tempo} onChange={(e) => setDiesel({ ...diesel, tempo: e.target.value })} className="rounded-2xl border p-3" placeholder="HH:MM:SS" />
          <CardResumo titulo="Consumo total mensal" valor={`${num(d.total, 3)} L`} subtitulo={`${num(d.horas, 4)} horas`} icon={Fuel} />
        </div>

        <textarea value={diesel.observacao} onChange={(e) => setDiesel({ ...diesel, observacao: e.target.value })} className="mt-4 w-full rounded-2xl border p-3 h-20" placeholder="Observação opcional" />

        <button disabled={salvando} onClick={salvarDiesel} className="mt-5 px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold flex gap-2 disabled:opacity-60">
          <Save size={18} />
          Salvar para relatório
        </button>
      </section>

      <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
        <div className="flex gap-3 items-center mb-5">
          <Snowflake className="text-teal-600" />
          <div>
            <h3 className="font-bold text-lg">Cálculo Estimado de Consumo do Fancoil</h3>
            <p className="text-sm text-slate-500">Custo estimado mensal = consumo estimado × preço kWh.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input type="date" value={fancoil.data} onChange={(e) => setFancoil({ ...fancoil, data: e.target.value })} className="rounded-2xl border p-3" />
          {[
            ["kw", "Potência kW"],
            ["horasDia", "Horas por dia"],
            ["diasUteis", "Dias úteis"],
            ["precoKwh", "Preço kWh"],
          ].map(([k, l]) => (
            <input key={k} value={fancoil[k]} onChange={(e) => setFancoil({ ...fancoil, [k]: e.target.value })} className="rounded-2xl border p-3" placeholder={l} />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <CardResumo titulo="Consumo estimado mensal" valor={`${num(f.consumo)} kWh`} icon={Snowflake} cor="teal" />
          <CardResumo titulo="Custo estimado mensal" valor={brl(f.custo)} icon={Snowflake} cor="teal" />
        </div>

        <textarea value={fancoil.observacao} onChange={(e) => setFancoil({ ...fancoil, observacao: e.target.value })} className="mt-4 w-full rounded-2xl border p-3 h-20" placeholder="Observação opcional" />

        <button disabled={salvando} onClick={salvarFancoil} className="mt-5 px-5 py-3 rounded-2xl bg-teal-600 text-white font-semibold flex gap-2 disabled:opacity-60">
          <Save size={18} />
          Salvar para relatório
        </button>
      </section>

      <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
        <div className="flex gap-3 items-center mb-5">
          <Flame className="text-amber-600" />
          <div>
            <h3 className="font-bold text-lg">Racional de Consumo Total - Gás</h3>
            <p className="text-sm text-slate-500">Área comum = (m³ × fator) × 0,05 • Área privativa = (m³ × fator) × 0,95.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="date" value={gas.data} onChange={(e) => setGas({ ...gas, data: e.target.value })} className="rounded-2xl border p-3" />
          <input value={gas.consumoM3} onChange={(e) => setGas({ ...gas, consumoM3: e.target.value })} className="rounded-2xl border p-3" placeholder="Consumo mensal m³" />
          <input value={gas.fator} onChange={(e) => setGas({ ...gas, fator: e.target.value })} className="rounded-2xl border p-3" placeholder="Fator de conversão" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <CardResumo titulo="Total convertido" valor={`${num(g.totalKg)} kg`} icon={Flame} cor="amber" />
          <CardResumo titulo="Área comum" valor={`${num(g.comumKg)} kg`} icon={Flame} cor="amber" />
          <CardResumo titulo="Área privativa" valor={`${num(g.privativoKg)} kg`} icon={Flame} cor="amber" />
        </div>

        <textarea value={gas.observacao} onChange={(e) => setGas({ ...gas, observacao: e.target.value })} className="mt-4 w-full rounded-2xl border p-3 h-20" placeholder="Observação opcional" />

        <button disabled={salvando} onClick={salvarGas} className="mt-5 px-5 py-3 rounded-2xl bg-amber-500 text-white font-semibold flex gap-2 disabled:opacity-60">
          <Save size={18} />
          Salvar para relatório
        </button>
      </section>

      <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <CalendarDays className="text-slate-700" />
            <div>
              <h3 className="font-bold text-lg">Registros salvos para relatório</h3>
              <p className="text-sm text-slate-500">Filtre por período, pesquise, exclua ou zere os cálculos acumulados.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={carregarRegistros} className="px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2 text-sm font-semibold">
              <RefreshCcw size={16} />
              Atualizar
            </button>

            <button onClick={zerarCalculosDoPeriodo} className="px-4 py-3 rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center gap-2 text-sm font-semibold">
              <Trash2 size={16} />
              Zerar cálculos
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mb-5">
          <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="rounded-2xl border p-3" />
          <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="rounded-2xl border p-3" />
          <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} className="rounded-2xl border p-3">
            <option value="todos">Todos os tipos</option>
            <option value="diesel">Diesel mensal</option>
            <option value="fancoil">Fancoil</option>
            <option value="gas">Gás</option>
          </select>
          <div className="lg:col-span-2 flex items-center gap-2 rounded-2xl border border-slate-200 px-3">
            <Search size={18} className="text-slate-400" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar por tipo, data, usuário, observação..." className="w-full outline-none py-3 text-sm" />
          </div>
        </div>

        {carregando ? (
          <p className="text-center text-slate-400 py-8 text-sm">Carregando registros...</p>
        ) : registrosFiltrados.length === 0 ? (
          <p className="text-center text-slate-400 py-8 text-sm">Nenhum cálculo encontrado no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-3 px-3">Data</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-3">Resultado</th>
                  <th className="py-3 px-3">Usuário</th>
                  <th className="py-3 px-3">Observação</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="py-3 px-3 whitespace-nowrap">{formatDateBR(item.data)}</td>
                    <td className="py-3 px-3 font-semibold">{tipoLabel(item.tipo)}</td>
                    <td className="py-3 px-3 text-slate-700">{resultadoPrincipal(item)}</td>
                    <td className="py-3 px-3 text-slate-500">{item.usuarioNome || "-"}</td>
                    <td className="py-3 px-3 text-slate-500">{item.observacao || "-"}</td>
                    <td className="py-3 px-3">
                      <div className="flex justify-end">
                        <button onClick={() => excluirRegistro(item)} className="p-2 rounded-xl border border-rose-100 text-rose-600 hover:bg-rose-50" title="Excluir cálculo">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
