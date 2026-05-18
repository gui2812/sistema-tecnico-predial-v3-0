import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Fuel,
  PackageCheck,
  PackagePlus,
  RefreshCcw,
  ShoppingCart,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import CardResumo from "../components/CardResumo";
import { getItem } from "../services/storageService";
import { listarSolicitacoesSupabase } from "../services/solicitacoesSupabaseService";
import { brl, today } from "../utils/formatters";

function dinheiroParaNumero(v) {
  return Number(String(v || "0").replace(/\./g, "").replace(",", ".")) || 0;
}

function dataNoMesAtual(data) {
  if (!data) return false;

  const agora = new Date();
  const anoAtual = agora.getFullYear();
  const mesAtual = String(agora.getMonth() + 1).padStart(2, "0");
  const ref = `${anoAtual}-${mesAtual}`;

  return String(data).startsWith(ref);
}

function mesAtualTexto() {
  const meses = [
    "JANEIRO",
    "FEVEREIRO",
    "MARÇO",
    "ABRIL",
    "MAIO",
    "JUNHO",
    "JULHO",
    "AGOSTO",
    "SETEMBRO",
    "OUTUBRO",
    "NOVEMBRO",
    "DEZEMBRO",
  ];

  const agora = new Date();
  return `${meses[agora.getMonth()]}/${agora.getFullYear()}`;
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
    enviadoMalote:
      item.enviadoMalote ?? item.enviado_malote ?? item.maloteEnviado ?? false,
    dataEnvioMalote:
      item.dataEnvioMalote || item.data_envio_malote || item.dataMalote || "",
  };
}

function normalizarSolicitacao(sol) {
  return {
    id: sol.id,
    numero: sol.numero,
    data: sol.data || (sol.criado_em ? String(sol.criado_em).slice(0, 10) : today()),
    setor: sol.area_solicitante || sol.setor || "Sem setor",
    solicitante: sol.solicitante_nome || sol.solicitante || "",
    prioridade: sol.prioridade || "Normal",
    status: sol.status || "Nova",
    itens: Array.isArray(sol.itens) ? sol.itens.map(normalizarItem) : [],
  };
}

function totalItem(it) {
  return Number(it.quantidade || 0) * dinheiroParaNumero(it.valorUnitario);
}

function LinhaPendencia({ titulo, descricao, detalhe, cor = "amber", icon: Icon = AlertTriangle }) {
  const estilos = {
    amber: "bg-amber-50 border-amber-100 text-amber-800",
    rose: "bg-rose-50 border-rose-100 text-rose-800",
    blue: "bg-blue-50 border-blue-100 text-blue-800",
    teal: "bg-teal-50 border-teal-100 text-teal-800",
    slate: "bg-slate-50 border-slate-100 text-slate-700",
  };

  return (
    <div className={`rounded-2xl border p-4 ${estilos[cor] || estilos.amber}`}>
      <div className="flex gap-3">
        <Icon size={20} className="shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-bold break-words">{titulo}</p>
          {descricao && <p className="text-sm mt-1 break-words">{descricao}</p>}
          {detalhe && <p className="text-xs mt-2 opacity-80 break-words">{detalhe}</p>}
        </div>
      </div>
    </div>
  );
}

function SecaoPendencias({ titulo, subtitulo, children }) {
  return (
    <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="font-black text-slate-900">{titulo}</h3>
        {subtitulo && <p className="text-sm text-slate-500 mt-1">{subtitulo}</p>}
      </div>

      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function Pendencias({ user }) {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const medicoes = getItem("medicoes", []);
  const rateios = getItem("rateios_agua", []);
  const geradores = getItem("geradores", []);
  const dieselTecnico = getItem("tecnicos_diesel", []);

  async function carregar() {
    setCarregando(true);
    setErro("");

    try {
      const lista = await listarSolicitacoesSupabase();
      setSolicitacoes(lista.map(normalizarSolicitacao));
    } catch (err) {
      console.error(err);
      setErro("Não foi possível carregar as pendências de solicitações.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const dados = useMemo(() => {
    const itens = solicitacoes.flatMap((sol) =>
      (sol.itens || []).map((it) => ({
        ...it,
        solicitacaoId: sol.id,
        solicitacaoNumero: sol.numero,
        dataSolicitacao: sol.data,
        setor: sol.setor,
        solicitante: sol.solicitante,
        prioridade: sol.prioridade,
      }))
    );

    const aguardandoAnalise = itens.filter((i) =>
      ["Nova", "Em análise"].includes(i.status)
    );

    const aprovadosAguardandoCompra = itens.filter((i) => i.status === "Aprovada");

    const compradosAguardandoEntrega = itens.filter((i) => i.status === "Comprada");

    const entreguesMalotePendente = itens.filter(
      (i) => i.status === "Entregue" && !i.enviadoMalote
    );

    const energiaLancadaMes = medicoes.some((m) =>
      dataNoMesAtual(m.dataMedicao || m.data || m.mes)
    );

    const ultimaMedicao = medicoes[0];

    const medidoresVirados = (ultimaMedicao?.linhas || []).filter((l) => l.virou);

    const consumosZerados = (ultimaMedicao?.linhas || []).filter(
      (l) => Number(l.consumo || 0) === 0
    );

    const rateioLancadoMes =
      rateios.some((r) => dataNoMesAtual(r.data)) ||
      rateios.some((r) =>
        String(r.mesReferencia || "")
          .toUpperCase()
          .includes(mesAtualTexto())
      );

    const dieselLancadoMes =
      geradores.some((g) => dataNoMesAtual(g.data)) ||
      dieselTecnico.some((d) => dataNoMesAtual(d.data || d.data_calculo));

    return {
      itens,
      aguardandoAnalise,
      aprovadosAguardandoCompra,
      compradosAguardandoEntrega,
      entreguesMalotePendente,
      energiaLancadaMes,
      medidoresVirados,
      consumosZerados,
      rateioLancadoMes,
      dieselLancadoMes,
    };
  }, [solicitacoes, medicoes, rateios, geradores, dieselTecnico]);

  const totalPendencias =
    dados.aguardandoAnalise.length +
    dados.aprovadosAguardandoCompra.length +
    dados.compradosAguardandoEntrega.length +
    dados.entreguesMalotePendente.length +
    (!dados.energiaLancadaMes ? 1 : 0) +
    dados.medidoresVirados.length +
    dados.consumosZerados.length +
    (!dados.rateioLancadoMes ? 1 : 0) +
    (!dados.dieselLancadoMes ? 1 : 0);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white p-6 md:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="text-teal-200 font-semibold mb-2">Controle operacional</p>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight">
              Pendências
            </h1>
            <p className="text-slate-300 mt-3 max-w-3xl">
              Acompanhe tudo que precisa de ação: materiais, malote, medições,
              rateio de água e diesel.
            </p>
          </div>

          <button
            onClick={carregar}
            className="px-4 py-3 rounded-2xl bg-white/10 border border-white/10 text-white font-semibold flex items-center gap-2"
          >
            <RefreshCcw size={16} />
            Atualizar
          </button>
        </div>
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-sm">
          {erro}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <CardResumo
          titulo="Pendências totais"
          valor={totalPendencias}
          cor={totalPendencias ? "amber" : "teal"}
          icon={AlertTriangle}
          subtitulo={totalPendencias ? "Itens que precisam de ação" : "Tudo em dia"}
        />

        <CardResumo
          titulo="Aguardando análise"
          valor={dados.aguardandoAnalise.length}
          cor="blue"
          icon={PackagePlus}
          subtitulo="Itens novos ou em análise"
        />

        <CardResumo
          titulo="Aguardando compra"
          valor={dados.aprovadosAguardandoCompra.length}
          cor="amber"
          icon={ShoppingCart}
          subtitulo="Itens aprovados"
        />

        <CardResumo
          titulo="Aguardando entrega"
          valor={dados.compradosAguardandoEntrega.length}
          cor="purple"
          icon={PackageCheck}
          subtitulo="Itens comprados"
        />

        <CardResumo
          titulo="NF pendente de malote"
          valor={dados.entreguesMalotePendente.length}
          cor="rose"
          icon={AlertTriangle}
          subtitulo="Entregues sem malote"
        />
      </div>

      {carregando ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-8 text-center text-slate-400">
          Carregando pendências...
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SecaoPendencias
            titulo="Materiais"
            subtitulo="Itens que precisam de análise, compra, entrega ou envio ao malote."
          >
            {dados.aguardandoAnalise.length === 0 &&
              dados.aprovadosAguardandoCompra.length === 0 &&
              dados.compradosAguardandoEntrega.length === 0 &&
              dados.entreguesMalotePendente.length === 0 && (
                <LinhaPendencia
                  titulo="Nenhuma pendência de material"
                  descricao="Não há itens aguardando ação no momento."
                  cor="teal"
                  icon={CheckCircle2}
                />
              )}

            {dados.aguardandoAnalise.slice(0, 8).map((it) => (
              <LinhaPendencia
                key={`analise-${it.id}`}
                titulo={`${it.quantidade} ${it.unidade} • ${it.descricao}`}
                descricao={`Aguardando análise • ${it.setor} • Solicitante: ${it.solicitante || "-"}`}
                detalhe={`Solicitação #${String(it.solicitacaoNumero || it.solicitacaoId).slice(-4).toUpperCase()} • Prioridade: ${it.prioridade}`}
                cor="blue"
                icon={PackagePlus}
              />
            ))}

            {dados.aprovadosAguardandoCompra.slice(0, 8).map((it) => (
              <LinhaPendencia
                key={`compra-${it.id}`}
                titulo={`${it.quantidade} ${it.unidade} • ${it.descricao}`}
                descricao={`Aprovado aguardando compra • Valor estimado: ${brl(totalItem(it))}`}
                detalhe={`Setor: ${it.setor} • Solicitação #${String(it.solicitacaoNumero || it.solicitacaoId).slice(-4).toUpperCase()}`}
                cor="amber"
                icon={ShoppingCart}
              />
            ))}

            {dados.compradosAguardandoEntrega.slice(0, 8).map((it) => (
              <LinhaPendencia
                key={`entrega-${it.id}`}
                titulo={`${it.quantidade} ${it.unidade} • ${it.descricao}`}
                descricao={`Comprado aguardando entrega • Fornecedor: ${it.fornecedor || "-"}`}
                detalhe={`Setor: ${it.setor} • Solicitação #${String(it.solicitacaoNumero || it.solicitacaoId).slice(-4).toUpperCase()}`}
                cor="slate"
                icon={PackageCheck}
              />
            ))}

            {dados.entreguesMalotePendente.slice(0, 8).map((it) => (
              <LinhaPendencia
                key={`malote-${it.id}`}
                titulo={`${it.quantidade} ${it.unidade} • ${it.descricao}`}
                descricao={`Entregue, mas NF ainda não foi enviada ao malote.`}
                detalhe={`NF: ${it.numeroNotaFiscal || "Não informada"} • Recebido por: ${it.recebidoPor || "-"}`}
                cor="rose"
                icon={AlertTriangle}
              />
            ))}
          </SecaoPendencias>

          <SecaoPendencias
            titulo="Rotinas mensais"
            subtitulo="Conferência rápida das principais rotinas do mês."
          >
            {dados.energiaLancadaMes ? (
              <LinhaPendencia
                titulo="Energia dos locatários lançada neste mês"
                descricao="Existe medição salva para o mês atual."
                cor="teal"
                icon={Zap}
              />
            ) : (
              <LinhaPendencia
                titulo="Energia dos locatários pendente"
                descricao="Ainda não foi encontrada medição salva para o mês atual."
                detalhe="Acesse Energia dos Locatários, calcule e salve a medição."
                cor="amber"
                icon={Zap}
              />
            )}

            {dados.medidoresVirados.map((l) => (
              <LinhaPendencia
                key={`virou-${l.unidade}`}
                titulo={`Medidor virou: unidade ${l.unidade}`}
                descricao={`Consumo calculado: ${l.consumo || 0} kWh`}
                detalhe="Conferir se a leitura está correta."
                cor="amber"
                icon={AlertTriangle}
              />
            ))}

            {dados.consumosZerados.map((l) => (
              <LinhaPendencia
                key={`zerado-${l.unidade}`}
                titulo={`Consumo zerado: unidade ${l.unidade}`}
                descricao="A unidade aparece com consumo igual a zero."
                detalhe="Conferir leitura atual e anterior."
                cor="rose"
                icon={AlertTriangle}
              />
            ))}

            {dados.rateioLancadoMes ? (
              <LinhaPendencia
                titulo="Rateio de água lançado neste mês"
                descricao="Existe rateio de água salvo para o mês atual."
                cor="teal"
                icon={Droplets}
              />
            ) : (
              <LinhaPendencia
                titulo="Rateio de água pendente"
                descricao="Ainda não foi encontrado rateio salvo para o mês atual."
                detalhe="Acesse Rateio de Água, gere o cálculo e salve no histórico."
                cor="amber"
                icon={Droplets}
              />
            )}

            {dados.dieselLancadoMes ? (
              <LinhaPendencia
                titulo="Diesel/geradores atualizado neste mês"
                descricao="Existe registro de diesel ou gerador para o mês atual."
                cor="teal"
                icon={Fuel}
              />
            ) : (
              <LinhaPendencia
                titulo="Diesel/geradores pendente"
                descricao="Não foi encontrado registro de diesel ou gerador para o mês atual."
                detalhe="Acesse Geradores ou Cálculos Técnicos e salve o lançamento."
                cor="amber"
                icon={Fuel}
              />
            )}
          </SecaoPendencias>
        </div>
      )}
    </div>
  );
}
