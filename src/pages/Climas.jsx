import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileDown,
  FileText,
  Gauge,
  Loader2,
  Printer,
  Upload,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const EDIFICIO = "Edifício JK 1455";

function parseNumeroBR(valor) {
  if (valor === null || valor === undefined) return 0;

  const texto = String(valor)
    .replace(/[^\d.,-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const numero = Number(texto);

  return Number.isFinite(numero) ? numero : 0;
}

function formatarNumeroBR(valor, casas = 3) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

function formatarPercentual(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizarTexto(texto) {
  return String(texto || "")
    .replace(/\s+/g, " ")
    .replace(/–/g, "-")
    .replace(/—/g, "-")
    .trim();
}

function buscarMesReferencia(texto) {
  const meses = [
    "JAN",
    "FEV",
    "MAR",
    "ABR",
    "MAI",
    "JUN",
    "JUL",
    "AGO",
    "SET",
    "OUT",
    "NOV",
    "DEZ",
  ];

  const regex = new RegExp(`\\b(${meses.join("|")})\\/?\\d{2,4}\\b`, "i");
  const match = texto.match(regex);

  return match ? match[0].toUpperCase() : "";
}

function extrairConsumosEnel(textoOriginal) {
  const texto = normalizarTexto(textoOriginal);

  const meses = "JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ";

  const numeroDecimalBR =
    "[0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{1,3}|[0-9]+,[0-9]{1,3}";

  const regexLinhaHistorico = new RegExp(
    `\\b(${meses})\\/?(\\d{2,4})\\b\\s+` +
      `(${numeroDecimalBR})\\s+` +
      `(${numeroDecimalBR})\\s+` +
      `(${numeroDecimalBR})\\s+` +
      `(\\d{1,2})\\b`,
    "i"
  );

  const matchLinha = texto.match(regexLinhaHistorico);

  if (matchLinha) {
    const mesReferencia = `${matchLinha[1].toUpperCase()}/${matchLinha[2]}`;
    const demandaKw = parseNumeroBR(matchLinha[3]);
    const horaPonta = parseNumeroBR(matchLinha[4]);
    const foraPonta = parseNumeroBR(matchLinha[5]);
    const diasFaturados = Number(matchLinha[6] || 0);

    return {
      mesReferencia,
      demandaKw,
      horaPonta,
      foraPonta,
      diasFaturados,
      total: horaPonta + foraPonta,
      encontrado: horaPonta > 0 || foraPonta > 0,
    };
  }

  const regexSequencia = new RegExp(
    `consumo\\s*faturado\\s*kwh.*?hora\\s*ponta.*?(${numeroDecimalBR}).*?` +
      `hora\\s*fora\\s*ponta.*?(${numeroDecimalBR})`,
    "i"
  );

  const matchSequencia = texto.match(regexSequencia);

  if (matchSequencia) {
    const horaPonta = parseNumeroBR(matchSequencia[1]);
    const foraPonta = parseNumeroBR(matchSequencia[2]);

    return {
      mesReferencia: buscarMesReferencia(texto),
      demandaKw: 0,
      horaPonta,
      foraPonta,
      diasFaturados: 0,
      total: horaPonta + foraPonta,
      encontrado: horaPonta > 0 || foraPonta > 0,
    };
  }

  return {
    mesReferencia: buscarMesReferencia(texto),
    demandaKw: 0,
    horaPonta: 0,
    foraPonta: 0,
    diasFaturados: 0,
    total: 0,
    encontrado: false,
  };
}

async function extrairTextoPDF(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let textoFinal = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    const textoPagina = content.items.map((item) => item.str).join(" ");
    textoFinal += `\n${textoPagina}`;
  }

  return textoFinal;
}

function CardResumo({ titulo, valor, subtitulo, icon: Icon, cor = "blue" }) {
  const cores = {
    blue: {
      box: "bg-blue-50 text-blue-700 border-blue-100",
      icon: "bg-blue-100 text-blue-700",
    },
    green: {
      box: "bg-emerald-50 text-emerald-700 border-emerald-100",
      icon: "bg-emerald-100 text-emerald-700",
    },
    amber: {
      box: "bg-amber-50 text-amber-700 border-amber-100",
      icon: "bg-amber-100 text-amber-700",
    },
    purple: {
      box: "bg-purple-50 text-purple-700 border-purple-100",
      icon: "bg-purple-100 text-purple-700",
    },
    slate: {
      box: "bg-slate-50 text-slate-700 border-slate-100",
      icon: "bg-slate-100 text-slate-700",
    },
  };

  const c = cores[cor] || cores.blue;

  return (
    <div className={`rounded-3xl border p-5 min-w-0 ${c.box}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase opacity-80 leading-tight">
            {titulo}
          </p>

          <p className="text-[clamp(1.25rem,1.5vw,1.85rem)] font-black mt-2 leading-tight whitespace-nowrap">
            {valor}
          </p>

          {subtitulo && (
            <p className="text-xs font-semibold mt-1 opacity-75 leading-tight">
              {subtitulo}
            </p>
          )}
        </div>

        <div
          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${c.icon}`}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function MiniCard({ titulo, valor, subtitulo, icon: Icon, cor = "blue" }) {
  const cores = {
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    green: "bg-emerald-50 border-emerald-100 text-emerald-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    purple: "bg-purple-50 border-purple-100 text-purple-700",
    slate: "bg-slate-50 border-slate-100 text-slate-700",
  };

  return (
    <div className={`rounded-2xl border p-4 min-w-0 ${cores[cor] || cores.blue}`}>
      <Icon size={20} className="mb-3" />
      <p className="text-[10px] uppercase font-black opacity-75 leading-tight">
        {titulo}
      </p>
      <p className="text-base 2xl:text-lg font-black mt-1 whitespace-nowrap">
        {valor}
      </p>
      <p className="text-[11px] font-semibold opacity-70 mt-1">{subtitulo}</p>
    </div>
  );
}

function MiniRelatorioPreview({ resultado }) {
  if (!resultado) return null;

  const pctPonta =
    resultado.total > 0 ? (resultado.horaPonta / resultado.total) * 100 : 0;

  const pctFora =
    resultado.total > 0 ? (resultado.foraPonta / resultado.total) * 100 : 0;

  return (
    <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 overflow-hidden">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h3 className="text-2xl font-black text-slate-950">
            Relatório Resumido — Conta ENEL
          </h3>
          <div className="w-32 h-1 bg-blue-600 rounded-full mt-4" />
        </div>

        <div className="flex flex-wrap gap-5 text-sm">
          <div>
            <p className="font-black text-slate-900">Edifício JK 1455</p>
            <p className="text-slate-500">Sistema Técnico Predial</p>
          </div>

          <div className="h-10 w-px bg-slate-200 hidden sm:block" />

          <div>
            <p className="font-black text-slate-900">Mês referência</p>
            <p className="text-slate-600 font-bold">
              {resultado.mesReferencia || "-"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_1fr_220px] gap-6 mt-6">
        <div>
          <h4 className="font-black text-slate-900 mb-4">Resumo executivo</h4>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <MiniCard
              titulo="Mês referência"
              valor={resultado.mesReferencia || "-"}
              subtitulo="Conta"
              icon={CalendarDays}
              cor="blue"
            />

            <MiniCard
              titulo="Demanda"
              valor={formatarNumeroBR(resultado.demandaKw)}
              subtitulo="kW"
              icon={Gauge}
              cor="slate"
            />

            <MiniCard
              titulo="Hora Ponta"
              valor={formatarNumeroBR(resultado.horaPonta)}
              subtitulo="kWh"
              icon={Zap}
              cor="amber"
            />

            <MiniCard
              titulo="Hora Fora Ponta"
              valor={formatarNumeroBR(resultado.foraPonta)}
              subtitulo="kWh"
              icon={Clock3}
              cor="purple"
            />

            <MiniCard
              titulo="Total"
              valor={formatarNumeroBR(resultado.total)}
              subtitulo="kWh"
              icon={BarChart3}
              cor="green"
            />
          </div>

          <div className="mt-5 rounded-2xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-900">
            <strong>Cálculo realizado:</strong>{" "}
            {formatarNumeroBR(resultado.horaPonta)} kWh +{" "}
            {formatarNumeroBR(resultado.foraPonta)} kWh ={" "}
            <strong>{formatarNumeroBR(resultado.total)} kWh</strong>
          </div>
        </div>

        <div className="border-l border-slate-200 xl:pl-6">
          <h4 className="font-black text-slate-900 mb-4">
            Detalhamento do consumo
          </h4>

          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div
              className="w-32 h-32 rounded-full shrink-0"
              style={{
                background: `conic-gradient(#f97316 0 ${pctPonta}%, #8b5cf6 ${pctPonta}% 100%)`,
              }}
            >
              <div className="w-20 h-20 bg-white rounded-full mx-auto mt-6 shadow-inner" />
            </div>

            <div className="space-y-4 text-sm w-full">
              <div className="flex items-start gap-3">
                <span className="w-3 h-3 rounded-full bg-orange-500 mt-1" />
                <div className="flex-1">
                  <p className="font-bold text-slate-700">Hora Ponta</p>
                  <p className="text-slate-500">
                    {formatarNumeroBR(resultado.horaPonta)} kWh
                  </p>
                </div>
                <p className="font-bold text-slate-700">
                  {formatarPercentual(pctPonta)}%
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-3 h-3 rounded-full bg-violet-500 mt-1" />
                <div className="flex-1">
                  <p className="font-bold text-slate-700">Hora Fora Ponta</p>
                  <p className="text-slate-500">
                    {formatarNumeroBR(resultado.foraPonta)} kWh
                  </p>
                </div>
                <p className="font-bold text-slate-700">
                  {formatarPercentual(pctFora)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-emerald-50 border border-emerald-100 p-5 text-emerald-800">
          <p className="text-sm font-black">Total consumido</p>
          <p className="text-3xl font-black mt-2">
            {formatarNumeroBR(resultado.total)}
          </p>
          <p className="font-bold mt-1">kWh</p>

          <div className="h-px bg-emerald-200 my-5" />

          <p className="text-sm font-black">Dias faturados</p>
          <p className="text-2xl font-black mt-1">
            {resultado.diasFaturados || "-"}
          </p>
        </div>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500">
        <p>Relatório gerado pelo Sistema Técnico Predial</p>

        <div className="flex items-center gap-3">
          <p>Data de geração: {new Date().toLocaleDateString("pt-BR")}</p>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-700 flex items-center gap-2"
          >
            <Printer size={15} />
            Imprimir
          </button>
        </div>
      </div>
    </section>
  );
}

function gerarMiniRelatorioClimas(resultado, nomeArquivo = "") {
  if (!resultado) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const hoje = new Date().toLocaleDateString("pt-BR");
  const hora = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const percentualPonta =
    resultado.total > 0 ? (resultado.horaPonta / resultado.total) * 100 : 0;

  const percentualForaPonta =
    resultado.total > 0 ? (resultado.foraPonta / resultado.total) * 100 : 0;

  doc.setFillColor(6, 23, 55);
  doc.rect(0, 0, pageWidth, 34, "F");

  doc.setFillColor(10, 41, 90);
  doc.roundedRect(10, 8, 16, 16, 3, 3, "F");

  doc.setDrawColor(52, 211, 235);
  doc.setLineWidth(0.6);
  doc.roundedRect(10, 8, 16, 16, 3, 3, "S");

  doc.setTextColor(52, 211, 235);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("JK", 18, 18, { align: "center" });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("Sistema Técnico Predial", 31, 15);

  doc.setFontSize(10);
  doc.setTextColor(125, 211, 252);
  doc.text(EDIFICIO, 31, 23);

  function topoCard(x, label, value, w = 38) {
    doc.setDrawColor(96, 165, 250);
    doc.setFillColor(10, 41, 90);
    doc.roundedRect(x, 7, w, 20, 2.5, 2.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(219, 234, 254);
    doc.text(label, x + 5, 14);

    doc.setFontSize(10.5);
    doc.setTextColor(103, 232, 249);
    doc.text(String(value || "-"), x + 5, 22);
  }

  topoCard(pageWidth - 88, "Mês referência", resultado.mesReferencia || "-", 42);
  topoCard(pageWidth - 42, "Emissão", hoje, 36);

  doc.setTextColor(15, 42, 90);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text("Relatório Resumido", 14, 50);

  doc.setTextColor(25, 80, 180);
  doc.setFontSize(22);
  doc.text("Conta ENEL", 14, 62);

  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.7);
  doc.line(14, 66, 44, 66);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(
    "Resumo do consumo faturado em kWh extraído automaticamente da conta ENEL.",
    14,
    74,
    { maxWidth: 180 }
  );

  function cardPdf(x, y, w, title, value, subtitle, color) {
    const cores = {
      blue: {
        bg: [239, 246, 255],
        border: [147, 197, 253],
        text: [29, 78, 216],
      },
      green: {
        bg: [240, 253, 244],
        border: [134, 239, 172],
        text: [5, 150, 105],
      },
      amber: {
        bg: [255, 251, 235],
        border: [253, 224, 71],
        text: [217, 119, 6],
      },
      purple: {
        bg: [250, 245, 255],
        border: [216, 180, 254],
        text: [126, 34, 206],
      },
      slate: {
        bg: [248, 250, 252],
        border: [203, 213, 225],
        text: [51, 65, 85],
      },
    };

    const c = cores[color] || cores.blue;

    doc.setFillColor(...c.bg);
    doc.setDrawColor(...c.border);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, w, 25, 2.5, 2.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 64, 100);
    doc.text(title, x + 4, y + 8);

    doc.setFontSize(String(value).length > 12 ? 10.5 : 13);
    doc.setTextColor(...c.text);
    doc.text(String(value), x + 4, y + 17);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text(subtitle, x + 4, y + 22);
  }

  cardPdf(14, 86, 34, "Mês referência", resultado.mesReferencia || "-", "Conta ENEL", "blue");
  cardPdf(52, 86, 34, "Demanda", formatarNumeroBR(resultado.demandaKw), "kW", "slate");
  cardPdf(90, 86, 34, "Hora Ponta", formatarNumeroBR(resultado.horaPonta), "kWh", "amber");
  cardPdf(128, 86, 34, "Fora Ponta", formatarNumeroBR(resultado.foraPonta), "kWh", "purple");
  cardPdf(166, 86, 30, "Total", formatarNumeroBR(resultado.total), "kWh", "green");

  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(14, 122, 182, 18, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 64, 175);
  doc.text(
    `Cálculo: ${formatarNumeroBR(resultado.horaPonta)} kWh + ${formatarNumeroBR(
      resultado.foraPonta
    )} kWh = ${formatarNumeroBR(resultado.total)} kWh`,
    19,
    133
  );

  autoTable(doc, {
    startY: 152,
    margin: { left: 14, right: 14, bottom: 24 },
    head: [["Indicador", "Valor", "Participação"]],
    body: [
      ["Demanda", `${formatarNumeroBR(resultado.demandaKw)} kW`, "-"],
      [
        "Consumo Hora Ponta",
        `${formatarNumeroBR(resultado.horaPonta)} kWh`,
        `${formatarPercentual(percentualPonta)}%`,
      ],
      [
        "Consumo Hora Fora Ponta",
        `${formatarNumeroBR(resultado.foraPonta)} kWh`,
        `${formatarPercentual(percentualForaPonta)}%`,
      ],
      ["Total consumido", `${formatarNumeroBR(resultado.total)} kWh`, "100,00%"],
      ["Dias faturados", String(resultado.diasFaturados || "-"), "-"],
      ["Arquivo analisado", nomeArquivo || "-", "-"],
    ],
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [0, 82, 204],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { fontStyle: "bold" },
      1: { halign: "right" },
      2: { halign: "right" },
    },
  });

  const pageHeight = doc.internal.pageSize.height;

  doc.setDrawColor(226, 232, 240);
  doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

  doc.setFillColor(6, 23, 55);
  doc.rect(0, pageHeight - 9, pageWidth, 9, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text("Relatório gerado pelo Sistema Técnico Predial", 14, pageHeight - 3.5);

  doc.setTextColor(125, 211, 252);
  doc.text(`${EDIFICIO} • ${hoje} ${hora}`, pageWidth / 2, pageHeight - 3.5, {
    align: "center",
  });

  doc.setTextColor(255, 255, 255);
  doc.text("Página 1 de 1", pageWidth - 14, pageHeight - 3.5, {
    align: "right",
  });

  doc.save(`relatorio-climas-${resultado.mesReferencia || "enel"}.pdf`);
}

export default function Climas() {
  const [arquivo, setArquivo] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState("");
  const [textoExtraido, setTextoExtraido] = useState("");
  const [mostrarTexto, setMostrarTexto] = useState(false);

  const nomeArquivo = useMemo(() => arquivo?.name || "", [arquivo]);

  async function analisarConta() {
    if (!arquivo) {
      setErro("Selecione uma conta da ENEL em PDF antes de analisar.");
      return;
    }

    setCarregando(true);
    setErro("");
    setResultado(null);
    setTextoExtraido("");

    try {
      const texto = await extrairTextoPDF(arquivo);
      setTextoExtraido(texto);

      const dados = extrairConsumosEnel(texto);

      if (!dados.encontrado) {
        setErro(
          "Não consegui localizar automaticamente Hora Ponta e Hora Fora Ponta nesse PDF. O arquivo pode estar escaneado como imagem ou com texto fora do padrão."
        );
        setResultado(null);
        return;
      }

      setResultado(dados);
    } catch (err) {
      console.error(err);
      setErro(
        "Não foi possível ler o PDF. Confirme se o arquivo é uma conta em PDF digital."
      );
    } finally {
      setCarregando(false);
    }
  }

  function limpar() {
    setArquivo(null);
    setResultado(null);
    setErro("");
    setTextoExtraido("");
    setMostrarTexto(false);
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Zap size={24} />
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900">Climas</h2>
              <p className="text-sm text-slate-500">
                Análise automática da conta ENEL para consumo Hora Ponta e Hora Fora Ponta.
              </p>
            </div>
          </div>

          <button
            onClick={limpar}
            className="px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
          >
            Limpar análise
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 2xl:grid-cols-[420px_1fr] gap-6">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Upload size={22} />
            </div>

            <div>
              <h3 className="font-black text-slate-900">Upload da conta ENEL</h3>
              <p className="text-xs text-slate-500">Envie o PDF da conta para análise.</p>
            </div>
          </div>

          <label className="block border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center cursor-pointer hover:bg-slate-50 transition">
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setArquivo(file || null);
                setResultado(null);
                setErro("");
                setTextoExtraido("");
              }}
            />

            <FileText className="mx-auto text-slate-400 mb-3" size={42} />

            <p className="font-bold text-slate-800 break-words">
              {nomeArquivo || "Clique para selecionar o PDF"}
            </p>

            <p className="text-xs text-slate-400 mt-2">
              Funciona melhor com PDF digital. PDF escaneado pode precisar de OCR depois.
            </p>
          </label>

          <button
            onClick={analisarConta}
            disabled={carregando || !arquivo}
            className="mt-5 w-full rounded-2xl bg-slate-950 text-white py-3 font-black hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {carregando ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <BarChart3 size={18} />
                Analisar conta
              </>
            )}
          </button>

          {erro && (
            <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800 flex gap-2">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}
        </div>

        <div className="space-y-6 min-w-0">
          {!resultado && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-center">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto mb-4">
                <FileText size={30} />
              </div>

              <h3 className="text-xl font-black text-slate-900">
                Nenhuma conta analisada ainda
              </h3>

              <p className="text-sm text-slate-500 mt-2">
                Envie uma conta ENEL em PDF e clique em analisar para extrair o consumo.
              </p>
            </div>
          )}

          {resultado && (
            <>
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <CheckCircle2 size={22} />
                    </div>

                    <div>
                      <h3 className="font-black text-slate-900">Conta analisada</h3>
                      <p className="text-xs text-slate-500">
                        Dados extraídos automaticamente do PDF.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => gerarMiniRelatorioClimas(resultado, nomeArquivo)}
                    className="rounded-2xl bg-slate-950 text-white px-5 py-3 font-black hover:bg-slate-800 flex items-center justify-center gap-2"
                  >
                    <FileDown size={18} />
                    Emitir mini relatório
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
                  <CardResumo
                    titulo="Mês referência"
                    valor={resultado.mesReferencia || "-"}
                    subtitulo="Identificado na conta"
                    icon={CalendarDays}
                    cor="blue"
                  />

                  <CardResumo
                    titulo="Demanda"
                    valor={formatarNumeroBR(resultado.demandaKw)}
                    subtitulo="kW"
                    icon={Gauge}
                    cor="slate"
                  />

                  <CardResumo
                    titulo="Hora Ponta"
                    valor={formatarNumeroBR(resultado.horaPonta)}
                    subtitulo="kWh"
                    icon={Zap}
                    cor="amber"
                  />

                  <CardResumo
                    titulo="Hora Fora Ponta"
                    valor={formatarNumeroBR(resultado.foraPonta)}
                    subtitulo="kWh"
                    icon={Clock3}
                    cor="purple"
                  />

                  <CardResumo
                    titulo="Total consumido"
                    valor={formatarNumeroBR(resultado.total)}
                    subtitulo="Ponta + Fora Ponta"
                    icon={BarChart3}
                    cor="green"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-3xl p-5 text-sm text-blue-900">
                <strong>Cálculo realizado:</strong>{" "}
                {formatarNumeroBR(resultado.horaPonta)} kWh +{" "}
                {formatarNumeroBR(resultado.foraPonta)} kWh ={" "}
                <strong>{formatarNumeroBR(resultado.total)} kWh</strong>
                {resultado.diasFaturados ? (
                  <>
                    {" "}
                    • <strong>Dias faturados:</strong> {resultado.diasFaturados}
                  </>
                ) : null}
              </div>

              <MiniRelatorioPreview resultado={resultado} />
            </>
          )}

          {textoExtraido && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <button
                onClick={() => setMostrarTexto((v) => !v)}
                className="text-sm font-black text-blue-700 hover:text-blue-900"
              >
                {mostrarTexto
                  ? "Ocultar texto extraído"
                  : "Ver texto extraído do PDF"}
              </button>

              {mostrarTexto && (
                <pre className="mt-4 max-h-72 overflow-auto rounded-2xl bg-slate-950 text-slate-100 p-4 text-xs whitespace-pre-wrap">
                  {textoExtraido}
                </pre>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
