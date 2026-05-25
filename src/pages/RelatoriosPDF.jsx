import {
  Building2,
  CalendarDays,
  ClipboardList,
  Droplets,
  FileText,
  Flame,
  Fuel,
  PackagePlus,
  RefreshCcw,
  Snowflake,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getItem } from "../services/storageService";
import {
  pdfCalculosEletricos,
  pdfDieselTecnico,
  pdfFancoil,
  pdfGas,
  pdfGeradores,
  pdfGeral,
  pdfLocatarios,
  pdfRateioAgua,
  pdfSolicitacao,
} from "../services/pdfService";
import {
  listarCalculosTecnicosSupabase,
  separarCalculosTecnicosPorTipo,
} from "../services/calculosTecnicosSupabaseService";
import { listarMedicoesLocatariosSupabase } from "../services/medicoesLocatariosSupabaseService";
import { brl, int, month, num, today } from "../utils/formatters";

function inicioDoMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function filtrarPorData(lista, inicio, fim, campo = "data") {
  return (lista || []).filter((item) => {
    const data = item?.[campo];
    if (!data) return true;
    if (inicio && data < inicio) return false;
    if (fim && data > fim) return false;
    return true;
  });
}

function normalizarMesMedicao(medicao) {
  return (
    medicao?.mes ||
    medicao?.mesReferencia ||
    medicao?.mes_referencia ||
    medicao?.referencia ||
    ""
  );
}

function filtrarMedicaoPorMes(medicoes, mesReferencia) {
  if (!medicoes?.length) return null;

  const encontrada = medicoes.find((m) => normalizarMesMedicao(m) === mesReferencia);

  return encontrada || medicoes[0];
}

function calcularResumoMedicao(medicao) {
  const linhas = medicao?.linhas || [];

  const total = linhas.reduce((soma, linha) => {
    return soma + Number(linha.consumo || 0);
  }, 0);

  const quantidade = linhas.length;

  const media = quantidade > 0 ? total / quantidade : 0;

  const maior = linhas.reduce((maiorLinha, linha) => {
    if (!maiorLinha) return linha;

    return Number(linha.consumo || 0) > Number(maiorLinha.consumo || 0)
      ? linha
      : maiorLinha;
  }, null);

  return {
    quantidade,
    total,
    media,
    maior,
  };
}

function RelatorioCard({
  title,
  desc,
  icon: Icon,
  count,
  footer,
  onClick,
  color = "blue",
}) {
  const colorClass =
    {
      blue: "bg-blue-50 text-blue-600",
      teal: "bg-teal-50 text-teal-600",
      amber: "bg-amber-50 text-amber-600",
      purple: "bg-purple-50 text-purple-600",
      slate: "bg-slate-100 text-slate-700",
    }[color] || "bg-blue-50 text-blue-600";

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col">
      <div
        className={`w-12 h-12 rounded-2xl ${colorClass} flex items-center justify-center mb-4`}
      >
        <Icon />
      </div>

      <h3 className="font-bold text-lg text-slate-900">{title}</h3>

      <p className="text-sm text-slate-500 mt-2 min-h-12">{desc}</p>

      <div className="mt-4 text-xs text-slate-400">{count}</div>

      {footer && (
        <div className="mt-1 text-xs font-semibold text-slate-600">
          {footer}
        </div>
      )}

      <button
        onClick={onClick}
        className="mt-5 w-full rounded-2xl bg-slate-950 text-white py-3 font-semibold hover:bg-slate-800 transition"
      >
        Gerar PDF
      </button>
    </div>
  );
}

export default function RelatoriosPDF() {
  const [dataInicio, setDataInicio] = useState(inicioDoMes());
  const [dataFim, setDataFim] = useState(today());
  const [mesReferencia, setMesReferencia] = useState(month());
  const [dataEmissao, setDataEmissao] = useState(today());

  const [calculosTecnicos, setCalculosTecnicos] = useState([]);
  const [carregandoTecnicos, setCarregandoTecnicos] = useState(false);

  const [medicoesSupabase, setMedicoesSupabase] = useState([]);
  const [carregandoMedicoes, setCarregandoMedicoes] = useState(false);

  const geradores = getItem("geradores", []);
  const solicitacoes = getItem("solicitacoes", []);
  const rateiosAgua = getItem("rateios_agua", []);
  const calculos = getItem("calculos", []);

  const periodo = { dataInicio, dataFim, dataEmissao };
  const periodoMes = { mesReferencia, dataEmissao };

  async function carregarCalculosTecnicos() {
    setCarregandoTecnicos(true);

    try {
      const lista = await listarCalculosTecnicosSupabase({
        dataInicio,
        dataFim,
      });

      setCalculosTecnicos(lista);
    } catch (err) {
      console.error(err);
      alert("Não foi possível carregar os cálculos técnicos do Supabase.");
    } finally {
      setCarregandoTecnicos(false);
    }
  }

  async function carregarMedicoesLocatarios() {
    setCarregandoMedicoes(true);

    try {
      const lista = await listarMedicoesLocatariosSupabase();
      setMedicoesSupabase(lista || []);
    } catch (err) {
      console.error(err);
      alert("Não foi possível carregar as medições dos locatários do Supabase.");
    } finally {
      setCarregandoMedicoes(false);
    }
  }

  async function atualizarTudo() {
    await Promise.all([
      carregarCalculosTecnicos(),
      carregarMedicoesLocatarios(),
    ]);
  }

  useEffect(() => {
    atualizarTudo();
  }, []);

  const dados = useMemo(() => {
    const geradoresFiltrados = filtrarPorData(
      geradores,
      dataInicio,
      dataFim,
      "data"
    );

    const solicitacoesFiltradas = filtrarPorData(
      solicitacoes,
      dataInicio,
      dataFim,
      "data"
    );

    const calculosFiltrados = filtrarPorData(
      calculos,
      dataInicio,
      dataFim,
      "data"
    );

    const rateiosAguaFiltrados = filtrarPorData(
      rateiosAgua,
      dataInicio,
      dataFim,
      "data"
    );

    const medicaoSelecionada = filtrarMedicaoPorMes(
      medicoesSupabase,
      mesReferencia
    );

    const resumoMedicaoSelecionada = calcularResumoMedicao(medicaoSelecionada);

    const tecnicosSeparados =
      separarCalculosTecnicosPorTipo(calculosTecnicos);

    return {
      geradoresFiltrados,
      solicitacoesFiltradas,
      calculosFiltrados,
      rateiosAguaFiltrados,
      medicaoSelecionada,
      resumoMedicaoSelecionada,
      dieselFiltrado: tecnicosSeparados.diesel,
      fancoilFiltrado: tecnicosSeparados.fancoil,
      gasFiltrado: tecnicosSeparados.gas,
    };
  }, [
    geradores,
    solicitacoes,
    calculos,
    rateiosAgua,
    medicoesSupabase,
    dataInicio,
    dataFim,
    mesReferencia,
    calculosTecnicos,
  ]);

  const totalGeradores = dados.geradoresFiltrados.reduce(
    (s, r) => s + Number(r.litros || 0),
    0
  );

  const totalDieselTecnico = dados.dieselFiltrado.reduce(
    (s, r) => s + Number(r.total || 0),
    0
  );

  const totalGas = dados.gasFiltrado.reduce(
    (s, r) => s + Number(r.totalKg || 0),
    0
  );

  const totalFancoil = dados.fancoilFiltrado.reduce(
    (s, r) => s + Number(r.custo || 0),
    0
  );

  const totalRateioAgua = dados.rateiosAguaFiltrados.reduce(
    (s, r) => s + Number(r.valorTotal || 0),
    0
  );

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <CalendarDays />
          </div>

          <div>
            <h3 className="font-bold text-lg text-slate-900">
              Período dos relatórios
            </h3>

            <p className="text-sm text-slate-500">
              Escolha a data antes de gerar. Assim você pode tirar relatório de
              outro mês ou de um intervalo específico.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Data inicial
            </label>

            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 p-3"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Data final
            </label>

            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 p-3"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Mês da energia dos locatários
            </label>

            <input
              type="month"
              value={mesReferencia}
              onChange={(e) => setMesReferencia(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 p-3"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Data de emissão
            </label>

            <input
              type="date"
              value={dataEmissao}
              onChange={(e) => setDataEmissao(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 p-3"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={atualizarTudo}
              className="w-full rounded-2xl border border-slate-200 text-slate-700 p-3 font-semibold hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              <RefreshCcw size={17} />
              Atualizar dados
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <RelatorioCard
          title="Relatório de Diesel Mensal"
          desc="Relatório apenas do racional de diesel mensal dos GMGs."
          icon={Fuel}
          color="teal"
          count={`${dados.dieselFiltrado.length} registro(s) no período`}
          footer={`${num(totalDieselTecnico, 3)} L`}
          onClick={() => pdfDieselTecnico(dados.dieselFiltrado, periodo)}
        />

        <RelatorioCard
          title="Relatório de Gás"
          desc="Relatório apenas do consumo de gás, área comum e área privativa."
          icon={Flame}
          color="amber"
          count={`${dados.gasFiltrado.length} registro(s) no período`}
          footer={`${num(totalGas)} kg`}
          onClick={() => pdfGas(dados.gasFiltrado, periodo)}
        />

        <RelatorioCard
          title="Relatório de Rateio de Água"
          desc="Relatório do fechamento mensal das medições de água e tarifa por m³."
          icon={Droplets}
          color="blue"
          count={`${dados.rateiosAguaFiltrados.length} registro(s) no período`}
          footer={brl(totalRateioAgua)}
          onClick={() => pdfRateioAgua(dados.rateiosAguaFiltrados, periodo)}
        />

        <RelatorioCard
          title="Relatório de Cálculos Elétricos"
          desc="Lei de Ohm, potência elétrica, fator de potência, motores e queda de tensão."
          icon={Zap}
          color="amber"
          count={`${dados.calculosFiltrados.length} cálculo(s) no período`}
          footer="Calculadora Elétrica"
          onClick={() => pdfCalculosEletricos(dados.calculosFiltrados, periodo)}
        />

        <RelatorioCard
          title="Relatório de Fancoil"
          desc="Relatório apenas do consumo estimado e custo mensal do fancoil."
          icon={Snowflake}
          color="teal"
          count={`${dados.fancoilFiltrado.length} registro(s) no período`}
          footer={brl(totalFancoil)}
          onClick={() => pdfFancoil(dados.fancoilFiltrado, periodo)}
        />

        <RelatorioCard
          title="Relatório de Geradores"
          desc="Horas, horímetros, diesel consumido, custo e registros."
          icon={Building2}
          color="blue"
          count={`${dados.geradoresFiltrados.length} registro(s) no período`}
          footer={`${num(totalGeradores)} L`}
          onClick={() => pdfGeradores(dados.geradoresFiltrados, periodo)}
        />

        <RelatorioCard
          title="Relatório de Energia dos Locatários"
          desc="Medição anterior, atual, consumo e medidores que viraram."
          icon={ClipboardList}
          color="purple"
          count={
            dados.medicaoSelecionada
              ? `${dados.resumoMedicaoSelecionada.quantidade} unidade(s)`
              : "Nenhuma medição salva"
          }
          footer={
            dados.medicaoSelecionada
              ? `${int(dados.resumoMedicaoSelecionada.total)} kWh consumido`
              : "-"
          }
          onClick={() => {
            if (!dados.medicaoSelecionada) {
              alert("Nenhuma medição encontrada para gerar o relatório.");
              return;
            }

            pdfLocatarios(dados.medicaoSelecionada, periodoMes);
          }}
        />

        <RelatorioCard
          title="Relatório Geral Técnico"
          desc="Resumo geral dos principais indicadores do período escolhido."
          icon={FileText}
          color="slate"
          count="Geradores, energia dos locatários, diesel, gás e fancoil"
          footer="Consolidado"
          onClick={() =>
            pdfGeral(
              {
                geradores: dados.geradoresFiltrados,
                medicao: dados.medicaoSelecionada,
                diesel: dados.dieselFiltrado,
                fancoil: dados.fancoilFiltrado,
                gas: dados.gasFiltrado,
              },
              periodo
            )
          }
        />

        <RelatorioCard
          title="Última Solicitação de Material"
          desc="Gera PDF da última solicitação cadastrada no período."
          icon={PackagePlus}
          color="blue"
          count={`${dados.solicitacoesFiltradas.length} solicitação(ões) no período`}
          footer={dados.solicitacoesFiltradas[0]?.solicitante || "-"}
          onClick={() => {
            if (!dados.solicitacoesFiltradas[0]) {
              alert("Nenhuma solicitação encontrada para gerar o relatório.");
              return;
            }

            pdfSolicitacao(dados.solicitacoesFiltradas[0], periodo);
          }}
        />
      </section>

      <div className="bg-blue-50 border border-blue-100 rounded-3xl p-5 text-sm text-blue-900">
        Para sair relatório de gás, diesel mensal ou fancoil, primeiro vá em{" "}
        <strong>Cálculos Técnicos</strong> e clique em{" "}
        <strong>Salvar para relatório</strong>. Os novos registros técnicos já
        são lidos do Supabase por período.{" "}
        {carregandoTecnicos || carregandoMedicoes
          ? "Carregando dados..."
          : ""}
      </div>
    </div>
  );
}
