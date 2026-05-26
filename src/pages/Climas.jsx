import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CloudRain,
  Droplets,
  FileDown,
  FileSpreadsheet,
  FileText,
  Gauge,
  Loader2,
  Printer,
  RefreshCcw,
  Upload,
  Waves,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const EDIFICIO = "Edifício JK 1455";

const TABS = [
  { id: "energia", label: "Energia ENEL", icon: Zap },
  { id: "pocos", label: "Poços artesianos", icon: Droplets },
  { id: "sabesp", label: "SABESP", icon: Waves },
  { id: "pluvial", label: "Águas pluviais", icon: CloudRain },
  { id: "consolidado", label: "Consolidado ESG", icon: BarChart3 },
];

const MESES_PLUVIAL = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function mesAtualNome() {
  return new Date().toLocaleDateString("pt-BR", { month: "long" }).toLowerCase();
}

function anoAtualNumero() {
  return String(new Date().getFullYear());
}

function parseNumeroBR(valor) {
  if (valor === null || valor === undefined) return 0;

  const texto = String(valor)
    .replace(/[^\d.,-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const numero = Number(texto);

  return Number.isFinite(numero) ? numero : 0;
}

function formatarNumeroBR(valor, casas = 2) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

function formatarKwh(valor) {
  return formatarNumeroBR(valor, 3);
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

function normalizarChave(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
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

function hojeBR() {
  return new Date().toLocaleDateString("pt-BR");
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

function extrairPocosDoDemonstrativo(textoOriginal) {
  const texto = normalizarTexto(textoOriginal);

  const numero = "[0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{1,2}|[0-9]+(?:,[0-9]{1,2})?";

  const encontrados = [];

  const regexLinhaCompleta = new RegExp(
    `(Pot[aá]vel\\/?Po[cç]o(?:\\s+Hidr[oô]metro)?)\\s+` +
      `(\\d{2}\\/\\d{2}\\/\\d{2,4})\\s+` +
      `(${numero})\\s+` +
      `(\\d{2}\\/\\d{2}\\/\\d{2,4})\\s+` +
      `(${numero})\\s+` +
      `(${numero})`,
    "gi"
  );

  let match;
  while ((match = regexLinhaCompleta.exec(texto)) !== null) {
    encontrados.push({
      nome: encontrados.length === 0 ? "Poço 1" : `Poço ${encontrados.length + 1}`,
      tipo: match[1],
      dataAnterior: match[2],
      leituraAnterior: parseNumeroBR(match[3]),
      dataAtual: match[4],
      leituraAtual: parseNumeroBR(match[5]),
      consumo: parseNumeroBR(match[6]),
      origem: "PDF",
    });
  }

  if (encontrados.length) {
    return {
      pocos: encontrados,
      total: encontrados.reduce((soma, item) => soma + Number(item.consumo || 0), 0),
      encontrado: true,
      precisaConferencia: false,
    };
  }

  /*
    Plano B para PDF digital quebrado:
    tenta localizar números próximos a "quantidade medida em m3".
  */
  const quantidades = [...texto.matchAll(new RegExp(`Quantidade\\s+Medida\\s+em\\s+M3.*?(${numero})`, "gi"))]
    .map((m) => parseNumeroBR(m[1]))
    .filter((v) => v > 0);

  if (quantidades.length) {
    const pocos = quantidades.map((consumo, index) => ({
      nome: index === 0 ? "Poço 1" : `Poço ${index + 1}`,
      tipo: "Potável/Poço",
      dataAnterior: "",
      leituraAnterior: 0,
      dataAtual: "",
      leituraAtual: 0,
      consumo,
      origem: "PDF",
    }));

    return {
      pocos,
      total: pocos.reduce((soma, item) => soma + Number(item.consumo || 0), 0),
      encontrado: true,
      precisaConferencia: true,
    };
  }

  return {
    pocos: [],
    total: 0,
    encontrado: false,
    precisaConferencia: true,
  };
}


async function extrairPocosPlanilha(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const sheetNames = workbook.SheetNames || [];

  const candidatos = [];

  sheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: false,
    });

    const headerIndex = rows.findIndex((row) => {
      const joined = row.map((cell) => normalizarChave(cell)).join(" ");
      return (
        joined.includes("leitura") &&
        (
          joined.includes("hidrometro") ||
          joined.includes("hidrômetro") ||
          joined.includes("quantidade medida") ||
          joined.includes("abastecimento")
        )
      );
    });

    if (headerIndex === -1) return;

    const headers = rows[headerIndex];

    const tipoCol = localizarColuna(headers, [
      "tipo de abastecimento",
      "abastecimento",
      "tipo",
      "fonte",
      "poco",
      "poço",
    ]);

    const dataAnteriorCol = localizarColuna(headers, [
      "data da leitura anterior",
      "data leitura anterior",
      "data anterior",
    ]);

    const leituraAnteriorCol = localizarColuna(headers, [
      "leitura anterior do hidrometro",
      "leitura anterior do hidrômetro",
      "leitura anterior",
      "anterior",
    ]);

    const dataAtualCol = localizarColuna(headers, [
      "data da leitura",
      "data leitura atual",
      "data atual",
      "data da leitura atual",
    ]);

    const leituraAtualCol = localizarColuna(headers, [
      "leitura atual do hidrometro",
      "leitura atual do hidrômetro",
      "leitura do hidrometro",
      "leitura atual",
      "atual",
    ]);

    const quantidadeCol = localizarColuna(headers, [
      "quantidade medida em m3",
      "quantidade medida",
      "medida em m3",
      "consumo",
      "volume",
      "m3",
    ]);

    rows.slice(headerIndex + 1).forEach((row) => {
      const tipo = String(valorCelula(row, tipoCol) || "").trim();
      const leituraAnterior = parseNumeroBR(valorCelula(row, leituraAnteriorCol));
      const leituraAtual = parseNumeroBR(valorCelula(row, leituraAtualCol));
      const quantidade = parseNumeroBR(valorCelula(row, quantidadeCol));

      const textoLinha = normalizarChave(row.join(" "));
      const parecePoco =
        textoLinha.includes("poco") ||
        textoLinha.includes("poço") ||
        textoLinha.includes("hidrometro") ||
        textoLinha.includes("hidrômetro") ||
        quantidade > 0 ||
        (leituraAnterior > 0 && leituraAtual > 0);

      if (!parecePoco) return;

      const consumo =
        quantidade > 0
          ? quantidade
          : leituraAtual >= leituraAnterior
            ? leituraAtual - leituraAnterior
            : 0;

      if (!consumo && !leituraAnterior && !leituraAtual) return;

      candidatos.push({
        nome: candidatos.length === 0 ? "Poço 1" : `Poço ${candidatos.length + 1}`,
        tipo: tipo || "Potável/Poço",
        dataAnterior: formatarDataPlanilha(valorCelula(row, dataAnteriorCol)),
        leituraAnterior,
        dataAtual: formatarDataPlanilha(valorCelula(row, dataAtualCol)),
        leituraAtual,
        consumo,
        origem: `Excel - ${sheetName}`,
      });
    });
  });

  const pocos = candidatos.slice(0, 10);
  const total = pocos.reduce((soma, item) => soma + Number(item.consumo || 0), 0);

  return {
    pocos,
    total,
    encontrado: pocos.length > 0 && total > 0,
    precisaConferencia: true,
  };
}

function extrairSabesp(textoOriginal) {
  const texto = normalizarTexto(textoOriginal);

  /*
    A fatura possui vários blocos no cadastro de ligações.
    Para evitar pegar POÇO ou PERDAS, esta função prioriza especificamente:
    64082490002 - LIGAÇÃO SABESP - ÁGUA E ESGOTO
  */
  const blocoPrincipalMatch = texto.match(
    /64082490002\s+LIGA[CÇ][AÃ]O\s+SABESP\s*-\s*[ÁA]GUA\s+E\s+ESGOTO([\s\S]*?)(?=\s+C[oó]digo\s+do\s+Fornecimento|\s+910032882001|\s+726099660001|\s+VIA\s+SABESP|$)/i
  );

  const blocoPrincipal = blocoPrincipalMatch?.[1] || "";

  let leituraAnterior = 0;
  let leituraAtual = 0;
  let consumo = 0;

  if (blocoPrincipal) {
    const leiturasComMedia = blocoPrincipal.match(
      /([0-9]{4,})\s+([0-9]{4,})\s+M[eé]dia\s+de\s+consumo\s*\(M[³3]\)\s*:\s*([0-9.,]+)/i
    );

    if (leiturasComMedia) {
      leituraAnterior = parseNumeroBR(leiturasComMedia[1]);
      leituraAtual = parseNumeroBR(leiturasComMedia[2]);
    }

    const consumoNoFim = blocoPrincipal.match(
      /Indica[cç][aã]o.*?desperd[ií]cio\s+([0-9.,]+)\s*$/i
    );

    if (consumoNoFim) {
      consumo = parseNumeroBR(consumoNoFim[1]);
    }

    if (!consumo && leituraAnterior && leituraAtual) {
      consumo = leituraAtual - leituraAnterior;
    }
  }

  if (!consumo) {
    const consumoCabecalho = texto.match(
      /Água:\s+\d{2}\/\d{2}\/\d{4}\s+\d{2}\/\d{2}\/\d{4}\s+([0-9]+)/i
    );

    consumo = consumoCabecalho ? parseNumeroBR(consumoCabecalho[1]) : 0;
  }

  const trechoFaturamento =
    texto.match(/DISCRIMINAÇÃO DO FATURAMENTO([\s\S]*?)TOTAL\s*:/i)?.[1] || texto;

  const valorAguaMatch = trechoFaturamento.match(
    /\bÁgua:\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2})/i
  );

  const valorEsgotoMatch = trechoFaturamento.match(
    /\bEsgoto:\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2})/i
  );

  const totalMatch =
    texto.match(/TOTAL:\s*R\$\s*\*+\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2})/i) ||
    texto.match(/Total\s+30\/04\/2026\s+R\$\s*\*+\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2})/i);

  const valorAgua = valorAguaMatch ? parseNumeroBR(valorAguaMatch[1]) : 0;
  const valorEsgoto = valorEsgotoMatch ? parseNumeroBR(valorEsgotoMatch[1]) : 0;
  const valorTotal = totalMatch ? parseNumeroBR(totalMatch[1]) : valorAgua + valorEsgoto;

  return {
    leituraAnterior,
    leituraAtual,
    consumo,
    volumeEfluente: consumo,
    valorAgua,
    valorEsgoto,
    valorTotal,
    encontrado: consumo > 0,
    blocoIdentificado: Boolean(blocoPrincipal),
  };
}

function valorCelula(row, index) {
  if (index === -1 || index === undefined || index === null) return "";
  return row[index] ?? "";
}

function localizarColuna(headers, termos) {
  const normalizados = headers.map((h) => normalizarChave(h));

  return normalizados.findIndex((header) =>
    termos.some((termo) => header.includes(normalizarChave(termo)))
  );
}

function formatarDataPlanilha(valor) {
  if (valor instanceof Date) return valor.toLocaleDateString("pt-BR");

  if (typeof valor === "number") {
    return String(valor);
  }

  return String(valor || "").trim();
}

async function extrairPlanilhaPluvial(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const sheetName =
    workbook.SheetNames.find((name) => normalizarChave(name).includes("irrigacao")) ||
    workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  const headerIndex = rows.findIndex((row) => {
    const joined = row.map((cell) => normalizarChave(cell)).join(" ");
    return (
      joined.includes("alimentacao via agua pluvial") ||
      joined.includes("agua pluvial")
    ) && joined.includes("consumo diario");
  });

  if (headerIndex === -1) {
    return {
      sheetName,
      linhasTodas: [],
      linhas: [],
      totalPluvial: 0,
      totalMix: 0,
      totalConsumo: 0,
      encontrado: false,
    };
  }

  const headers = rows[headerIndex];

  const dataCol = localizarColuna(headers, ["data"]);
  const mesCol = localizarColuna(headers, ["mes", "mês"]);
  const anoCol = localizarColuna(headers, ["ano"]);
  const consumoCol = localizarColuna(headers, ["consumo diario", "consumo diário"]);
  const mixCol = localizarColuna(headers, ["alimentacao via mix", "alimentação via mix", "mix"]);
  const pluvialCol = localizarColuna(headers, ["alimentacao via agua pluvial", "alimentação via água pluvial", "agua pluvial"]);

  const linhasTodas = rows
    .slice(headerIndex + 1)
    .map((row) => {
      const data = formatarDataPlanilha(valorCelula(row, dataCol));
      const mes = String(valorCelula(row, mesCol) || "").trim().toLowerCase();
      const ano = String(valorCelula(row, anoCol) || "").trim();
      const consumoDiario = parseNumeroBR(valorCelula(row, consumoCol));
      const mix = parseNumeroBR(valorCelula(row, mixCol));
      const pluvial = parseNumeroBR(valorCelula(row, pluvialCol));

      return {
        sheetName,
        data,
        mes,
        ano,
        consumoDiario,
        mix,
        pluvial,
      };
    })
    .filter((linha) => {
      return (
        linha.data ||
        linha.mes ||
        linha.ano ||
        linha.consumoDiario > 0 ||
        linha.mix > 0 ||
        linha.pluvial > 0
      );
    });

  return {
    sheetName,
    linhasTodas,
    linhas: linhasTodas,
    totalPluvial: linhasTodas.reduce((soma, linha) => soma + Number(linha.pluvial || 0), 0),
    totalMix: linhasTodas.reduce((soma, linha) => soma + Number(linha.mix || 0), 0),
    totalConsumo: linhasTodas.reduce((soma, linha) => soma + Number(linha.consumoDiario || 0), 0),
    encontrado: linhasTodas.length > 0,
  };
}

function filtrarPluvialPorMesAno(base, mesSelecionado, anoSelecionado) {
  const linhasTodas = Array.isArray(base?.linhasTodas)
    ? base.linhasTodas
    : Array.isArray(base?.linhas)
      ? base.linhas
      : [];

  const mesNormalizado = normalizarChave(mesSelecionado);
  const anoTexto = String(anoSelecionado || "").trim();

  const linhas = linhasTodas.filter((linha) => {
    const mesLinha = normalizarChave(linha.mes);
    const anoLinha = String(linha.ano || "").trim();

    return mesLinha === mesNormalizado && anoLinha === anoTexto;
  });

  const totalPluvial = linhas.reduce((soma, linha) => soma + Number(linha.pluvial || 0), 0);
  const totalMix = linhas.reduce((soma, linha) => soma + Number(linha.mix || 0), 0);
  const totalConsumo = linhas.reduce((soma, linha) => soma + Number(linha.consumoDiario || 0), 0);

  return {
    ...base,
    linhasTodas,
    linhas,
    totalPluvial,
    totalMix,
    totalConsumo,
    mesSelecionado,
    anoSelecionado,
    encontrado: linhas.length > 0,
  };
}

function brl(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
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
    cyan: {
      box: "bg-cyan-50 text-cyan-700 border-cyan-100",
      icon: "bg-cyan-100 text-cyan-700",
    },
  };

  const c = cores[cor] || cores.blue;

  return (
    <div className={`rounded-3xl border p-5 min-w-0 overflow-hidden ${c.box}`}>
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

function UploadBox({
  titulo,
  subtitulo,
  arquivo,
  accept,
  icon: Icon = FileText,
  onArquivo,
  onAnalisar,
  carregando,
  disabled,
  botao = "Analisar arquivo",
}) {
  const nomeArquivo = arquivo?.name || "";

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
          <Upload size={22} />
        </div>

        <div>
          <h3 className="font-black text-slate-900">{titulo}</h3>
          <p className="text-xs text-slate-500">{subtitulo}</p>
        </div>
      </div>

      <label className="block border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center cursor-pointer hover:bg-slate-50 transition">
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onArquivo(e.target.files?.[0] || null)}
        />

        <Icon className="mx-auto text-slate-400 mb-3" size={42} />

        <p className="font-bold text-slate-800 break-words">
          {nomeArquivo || "Clique para selecionar o arquivo"}
        </p>

        <p className="text-xs text-slate-400 mt-2">
          Arquivos digitais são lidos automaticamente. PDFs escaneados podem exigir conferência manual.
        </p>
      </label>

      <button
        onClick={onAnalisar}
        disabled={carregando || disabled || !arquivo}
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
            {botao}
          </>
        )}
      </button>
    </div>
  );
}

function TabButton({ active, item, onClick }) {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black whitespace-nowrap transition ${
        active
          ? "bg-slate-950 text-white shadow-lg shadow-slate-300/40"
          : "bg-white text-slate-600 border border-slate-100 hover:bg-slate-50"
      }`}
    >
      <Icon size={18} />
      {item.label}
    </button>
  );
}

function Aviso({ children, tipo = "amber" }) {
  const cores = {
    amber: "bg-amber-50 border-amber-100 text-amber-800",
    blue: "bg-blue-50 border-blue-100 text-blue-800",
    green: "bg-emerald-50 border-emerald-100 text-emerald-800",
    rose: "bg-rose-50 border-rose-100 text-rose-800",
  };

  return (
    <div className={`rounded-3xl border p-4 text-sm flex gap-2 ${cores[tipo] || cores.amber}`}>
      <AlertTriangle size={18} className="shrink-0 mt-0.5" />
      <div>{children}</div>
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
    cyan: "bg-cyan-50 border-cyan-100 text-cyan-700",
  };

  return (
    <div className={`rounded-2xl border p-4 min-w-0 overflow-hidden ${cores[cor] || cores.blue}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase font-black opacity-75 leading-tight">
            {titulo}
          </p>

          <p className="text-lg 2xl:text-xl font-black mt-2 leading-tight break-words">
            {valor}
          </p>

          <p className="text-[11px] font-semibold opacity-70 mt-1">
            {subtitulo}
          </p>
        </div>

        <div className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center shrink-0">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function MiniRelatorioEnergiaPreview({ resultado }) {
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

      <div className="grid grid-cols-1 2xl:grid-cols-[1fr_0.9fr_220px] gap-6 mt-6">
        <div>
          <h4 className="font-black text-slate-900 mb-4">Resumo executivo</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
            <MiniCard
              titulo="Mês referência"
              valor={resultado.mesReferencia || "-"}
              subtitulo="Conta"
              icon={CalendarDays}
              cor="blue"
            />

            <MiniCard
              titulo="Demanda"
              valor={formatarKwh(resultado.demandaKw)}
              subtitulo="kW"
              icon={Gauge}
              cor="slate"
            />

            <MiniCard
              titulo="Hora Ponta"
              valor={formatarKwh(resultado.horaPonta)}
              subtitulo="kWh"
              icon={Zap}
              cor="amber"
            />

            <MiniCard
              titulo="Hora Fora Ponta"
              valor={formatarKwh(resultado.foraPonta)}
              subtitulo="kWh"
              icon={Clock3}
              cor="purple"
            />

            <MiniCard
              titulo="Total"
              valor={formatarKwh(resultado.total)}
              subtitulo="kWh"
              icon={BarChart3}
              cor="green"
            />
          </div>

          <div className="mt-5 rounded-2xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-900">
            <strong>Cálculo realizado:</strong>{" "}
            {formatarKwh(resultado.horaPonta)} kWh +{" "}
            {formatarKwh(resultado.foraPonta)} kWh ={" "}
            <strong>{formatarKwh(resultado.total)} kWh</strong>
          </div>
        </div>

        <div className="border-l border-slate-200 2xl:pl-6">
          <h4 className="font-black text-slate-900 mb-4">
            Detalhamento do consumo
          </h4>

          <div className="flex flex-col sm:flex-row 2xl:flex-col items-center gap-5">
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
                    {formatarKwh(resultado.horaPonta)} kWh
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
                    {formatarKwh(resultado.foraPonta)} kWh
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
            {formatarKwh(resultado.total)}
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
          <p>Data de geração: {hojeBR()}</p>

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

function TabelaSimples({ columns, rows }) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-100">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="text-left px-4 py-3 font-black">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-slate-400"
              >
                Nenhum dado encontrado.
              </td>
            </tr>
          )}

          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-slate-700">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


function gerarRelatorioPluvial(pluvial) {
  if (!pluvial) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  const linhas = Array.isArray(pluvial.linhas) ? pluvial.linhas : [];
  const totalPluvial = Number(pluvial.totalPluvial || 0);
  const totalMix = Number(pluvial.totalMix || 0);
  const totalConsumo = Number(pluvial.totalConsumo || 0);

  doc.setFillColor(6, 23, 55);
  doc.rect(0, 0, pageWidth, 34, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Sistema Técnico Predial", 14, 14);

  doc.setTextColor(125, 211, 252);
  doc.setFontSize(10);
  doc.text(EDIFICIO, 14, 23);

  doc.setTextColor(15, 42, 90);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Relatório de Águas Pluviais", 14, 52);

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.8);
  doc.line(14, 57, 80, 57);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  doc.text(
    `Irrigação / Reuso • ${pluvial.mesSelecionado || "-"} de ${pluvial.anoSelecionado || "-"}`,
    14,
    66
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
      slate: {
        bg: [248, 250, 252],
        border: [203, 213, 225],
        text: [51, 65, 85],
      },
    };

    const c = cores[color] || cores.blue;

    doc.setFillColor(...c.bg);
    doc.setDrawColor(...c.border);
    doc.roundedRect(x, y, w, 26, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 64, 100);
    doc.text(title, x + 4, y + 8);

    doc.setFontSize(13);
    doc.setTextColor(...c.text);
    doc.text(value, x + 4, y + 17);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(subtitle, x + 4, y + 23);
  }

  cardPdf(14, 80, 55, "Consumo diário total", `${formatarNumeroBR(totalConsumo)} m³`, "Soma do mês", "slate");
  cardPdf(76, 80, 55, "Alimentação via MIX", `${formatarNumeroBR(totalMix)} m³`, "Reservatório", "blue");
  cardPdf(138, 80, 58, "Água pluvial", `${formatarNumeroBR(totalPluvial)} m³`, "Captada para reuso", "green");

  autoTable(doc, {
    startY: 122,
    margin: { left: 14, right: 14, bottom: 24 },
    head: [["Dia", "Mês", "Ano", "Consumo diário", "MIX / Reservatório", "Água pluvial"]],
    body: linhas.map((linha) => [
      linha.data || "-",
      linha.mes || "-",
      linha.ano || "-",
      `${formatarNumeroBR(linha.consumoDiario)} m³`,
      `${formatarNumeroBR(linha.mix)} m³`,
      `${formatarNumeroBR(linha.pluvial)} m³`,
    ]),
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
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const finalY = doc.lastAutoTable.finalY + 10;

  autoTable(doc, {
    startY: finalY,
    margin: { left: 14, right: 14, bottom: 24 },
    head: [["Resumo do mês", "Volume"]],
    body: [
      ["Consumo diário total", `${formatarNumeroBR(totalConsumo)} m³`],
      ["Alimentação via MIX / Reservatório", `${formatarNumeroBR(totalMix)} m³`],
      ["Alimentação via água pluvial", `${formatarNumeroBR(totalPluvial)} m³`],
    ],
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
  });

  const pageHeight = doc.internal.pageSize.height;
  doc.setFillColor(6, 23, 55);
  doc.rect(0, pageHeight - 9, pageWidth, 9, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Relatório gerado pelo Sistema Técnico Predial • ${hojeBR()}`, 14, pageHeight - 3.5);

  doc.save(`relatorio-aguas-pluviais-${pluvial.mesSelecionado || "mes"}-${pluvial.anoSelecionado || "ano"}.pdf`);
}


function gerarRelatorioHidrico({ energia, pocos, sabesp, pluvial }) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const hoje = hojeBR();

  const totalPocos = Number(pocos?.total || 0);
  const totalSabesp = Number(sabesp?.consumo || 0);
  const totalPluvial = Number(pluvial?.totalPluvial || 0);
  const totalControlado = totalPocos + totalSabesp + totalPluvial;

  const pctPocos = totalControlado ? (totalPocos / totalControlado) * 100 : 0;
  const pctSabesp = totalControlado ? (totalSabesp / totalControlado) * 100 : 0;
  const pctPluvial = totalControlado ? (totalPluvial / totalControlado) * 100 : 0;

  doc.setFillColor(6, 23, 55);
  doc.rect(0, 0, pageWidth, 34, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Sistema Técnico Predial", 14, 14);

  doc.setTextColor(125, 211, 252);
  doc.setFontSize(10);
  doc.text(EDIFICIO, 14, 23);

  doc.setTextColor(15, 42, 90);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Relatório Hídrico Consolidado", 14, 52);

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.8);
  doc.line(14, 57, 75, 57);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  doc.text(
    "Consolidado de água captada por poços, água consumida via concessionária e água pluvial reutilizada.",
    14,
    66,
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
      cyan: {
        bg: [236, 254, 255],
        border: [103, 232, 249],
        text: [8, 145, 178],
      },
    };

    const c = cores[color] || cores.blue;

    doc.setFillColor(...c.bg);
    doc.setDrawColor(...c.border);
    doc.roundedRect(x, y, w, 26, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 64, 100);
    doc.text(title, x + 4, y + 8);

    doc.setFontSize(13);
    doc.setTextColor(...c.text);
    doc.text(value, x + 4, y + 17);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(subtitle, x + 4, y + 23);
  }

  cardPdf(14, 80, 43, "Poços artesianos", `${formatarNumeroBR(totalPocos)} m³`, `${formatarPercentual(pctPocos)}%`, "blue");
  cardPdf(61, 80, 43, "SABESP", `${formatarNumeroBR(totalSabesp)} m³`, `${formatarPercentual(pctSabesp)}%`, "cyan");
  cardPdf(108, 80, 43, "Pluvial / reuso", `${formatarNumeroBR(totalPluvial)} m³`, `${formatarPercentual(pctPluvial)}%`, "green");
  cardPdf(155, 80, 41, "Total controlado", `${formatarNumeroBR(totalControlado)} m³`, "Poços + SABESP + Pluvial", "amber");

  autoTable(doc, {
    startY: 122,
    head: [["Indicador", "Volume", "Observação"]],
    body: [
      ["Volume de água captada a partir de poço artesiano", `${formatarNumeroBR(totalPocos)} m³`, `${pocos?.pocos?.length || 0} poço(s)`],
      ["Volume de água consumido via concessionária", `${formatarNumeroBR(totalSabesp)} m³`, "SABESP"],
      ["Volume de efluente para rede pública", `${formatarNumeroBR(sabesp?.volumeEfluente || totalSabesp)} m³`, "Conforme consumo da concessionária"],
      ["Volume de água captada da chuva para reuso", `${formatarNumeroBR(totalPluvial)} m³`, "Planilha de águas pluviais"],
      ["Total de água controlada", `${formatarNumeroBR(totalControlado)} m³`, "Consolidado ESG"],
    ],
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [0, 82, 204],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 12,
    head: [["Fonte", "Volume", "Participação"]],
    body: [
      ["Poços artesianos", `${formatarNumeroBR(totalPocos)} m³`, `${formatarPercentual(pctPocos)}%`],
      ["SABESP / Concessionária", `${formatarNumeroBR(totalSabesp)} m³`, `${formatarPercentual(pctSabesp)}%`],
      ["Água pluvial / Reuso", `${formatarNumeroBR(totalPluvial)} m³`, `${formatarPercentual(pctPluvial)}%`],
    ],
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  if (energia?.total) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 12,
      head: [["Energia ENEL", "Valor"]],
      body: [
        ["Mês referência", energia.mesReferencia || "-"],
        ["Hora Ponta", `${formatarKwh(energia.horaPonta)} kWh`],
        ["Hora Fora Ponta", `${formatarKwh(energia.foraPonta)} kWh`],
        ["Total consumido", `${formatarKwh(energia.total)} kWh`],
      ],
      styles: {
        fontSize: 8.5,
        cellPadding: 2.5,
        textColor: [15, 23, 42],
        lineColor: [226, 232, 240],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
    });
  }

  const pageHeight = doc.internal.pageSize.height;

  doc.setFillColor(6, 23, 55);
  doc.rect(0, pageHeight - 9, pageWidth, 9, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Relatório gerado pelo Sistema Técnico Predial • ${hoje}`, 14, pageHeight - 3.5);

  doc.save("relatorio-hidrico-consolidado.pdf");
}

function gerarMiniRelatorioEnergia(resultado, nomeArquivo = "") {
  if (!resultado) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const hoje = hojeBR();
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

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Sistema Técnico Predial", 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(125, 211, 252);
  doc.text(EDIFICIO, 14, 23);

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

  autoTable(doc, {
    startY: 92,
    margin: { left: 14, right: 14, bottom: 24 },
    head: [["Indicador", "Valor", "Participação"]],
    body: [
      ["Mês referência", resultado.mesReferencia || "-", "-"],
      ["Demanda", `${formatarKwh(resultado.demandaKw)} kW`, "-"],
      [
        "Consumo Hora Ponta",
        `${formatarKwh(resultado.horaPonta)} kWh`,
        `${formatarPercentual(percentualPonta)}%`,
      ],
      [
        "Consumo Hora Fora Ponta",
        `${formatarKwh(resultado.foraPonta)} kWh`,
        `${formatarPercentual(percentualForaPonta)}%`,
      ],
      ["Total consumido", `${formatarKwh(resultado.total)} kWh`, "100,00%"],
      ["Dias faturados", String(resultado.diasFaturados || "-"), "-"],
      ["Arquivo analisado", nomeArquivo || "-", "-"],
    ],
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
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
  const [aba, setAba] = useState("energia");

  const [arquivoEnergia, setArquivoEnergia] = useState(null);
  const [arquivoPocos, setArquivoPocos] = useState(null);
  const [arquivoSabesp, setArquivoSabesp] = useState(null);
  const [arquivoPluvial, setArquivoPluvial] = useState(null);

  const [carregandoEnergia, setCarregandoEnergia] = useState(false);
  const [carregandoPocos, setCarregandoPocos] = useState(false);
  const [carregandoSabesp, setCarregandoSabesp] = useState(false);
  const [carregandoPluvial, setCarregandoPluvial] = useState(false);

  const [energia, setEnergia] = useState(null);
  const [pocos, setPocos] = useState(null);
  const [sabesp, setSabesp] = useState(null);
  const [pluvial, setPluvial] = useState(null);
  const [pluvialBase, setPluvialBase] = useState(null);
  const [mesPluvial, setMesPluvial] = useState(mesAtualNome());
  const [anoPluvial, setAnoPluvial] = useState(anoAtualNumero());

  const [erroEnergia, setErroEnergia] = useState("");
  const [erroPocos, setErroPocos] = useState("");
  const [erroSabesp, setErroSabesp] = useState("");
  const [erroPluvial, setErroPluvial] = useState("");

  const [textoEnergia, setTextoEnergia] = useState("");
  const [textoPocos, setTextoPocos] = useState("");
  const [textoSabesp, setTextoSabesp] = useState("");
  const [mostrarTexto, setMostrarTexto] = useState("");

  const consolidado = useMemo(() => {
    const totalPocos = Number(pocos?.total || 0);
    const totalSabesp = Number(sabesp?.consumo || 0);
    const totalPluvial = Number(pluvial?.totalPluvial || 0);
    const total = totalPocos + totalSabesp + totalPluvial;

    return {
      totalPocos,
      totalSabesp,
      totalPluvial,
      total,
      pctPocos: total ? (totalPocos / total) * 100 : 0,
      pctSabesp: total ? (totalSabesp / total) * 100 : 0,
      pctPluvial: total ? (totalPluvial / total) * 100 : 0,
    };
  }, [pocos, sabesp, pluvial]);

  async function analisarEnergia() {
    if (!arquivoEnergia) {
      setErroEnergia("Selecione uma conta da ENEL em PDF antes de analisar.");
      return;
    }

    setCarregandoEnergia(true);
    setErroEnergia("");
    setEnergia(null);
    setTextoEnergia("");

    try {
      const texto = await extrairTextoPDF(arquivoEnergia);
      setTextoEnergia(texto);

      const dados = extrairConsumosEnel(texto);

      if (!dados.encontrado) {
        setErroEnergia(
          "Não consegui localizar automaticamente Hora Ponta e Hora Fora Ponta nesse PDF."
        );
        return;
      }

      setEnergia(dados);
    } catch (err) {
      console.error(err);
      setErroEnergia("Não foi possível ler o PDF da ENEL.");
    } finally {
      setCarregandoEnergia(false);
    }
  }

  async function analisarPocos() {
    if (!arquivoPocos) {
      setErroPocos("Selecione o demonstrativo dos poços em PDF ou Excel.");
      return;
    }

    setCarregandoPocos(true);
    setErroPocos("");
    setPocos(null);
    setTextoPocos("");

    try {
      const nome = String(arquivoPocos?.name || "").toLowerCase();
      const isExcel = nome.endsWith(".xlsx") || nome.endsWith(".xls") || nome.endsWith(".csv");
      const isPdf = nome.endsWith(".pdf") || arquivoPocos?.type === "application/pdf";

      let dados;

      if (isExcel) {
        dados = await extrairPocosPlanilha(arquivoPocos);
        setTextoPocos("");
      } else if (isPdf) {
        const texto = await extrairTextoPDF(arquivoPocos);
        setTextoPocos(texto);
        dados = extrairPocosDoDemonstrativo(texto);
      } else {
        setErroPocos("Formato não reconhecido. Envie PDF, XLSX, XLS ou CSV.");
        return;
      }

      if (!dados.encontrado) {
        setErroPocos(
          isExcel
            ? "Li a planilha, mas não encontrei as colunas/linhas dos poços. Confira se a aba tem leitura anterior, leitura atual e quantidade medida em m³."
            : "Não consegui ler automaticamente o PDF dos poços. Como esse demonstrativo costuma ser escaneado, preencha os valores manualmente nos campos abaixo."
        );

        setPocos({
          pocos: [
            {
              nome: "Poço 1",
              tipo: "Potável/Poço",
              dataAnterior: "",
              leituraAnterior: 0,
              dataAtual: "",
              leituraAtual: 0,
              consumo: 0,
              origem: "Manual",
            },
            {
              nome: "Poço 2",
              tipo: "Potável/Poço",
              dataAnterior: "",
              leituraAnterior: 0,
              dataAtual: "",
              leituraAtual: 0,
              consumo: 0,
              origem: "Manual",
            },
          ],
          total: 0,
          encontrado: false,
          precisaConferencia: true,
        });

        return;
      }

      setPocos(dados);
    } catch (err) {
      console.error(err);
      setErroPocos("Não foi possível ler o arquivo dos poços.");
    } finally {
      setCarregandoPocos(false);
    }
  }


  function iniciarPocosManual() {
    setErroPocos("");

    setPocos({
      pocos: [
        {
          nome: "Poço 1",
          tipo: "Potável/Poço Hidrômetro",
          dataAnterior: "01/04/26",
          leituraAnterior: 4392.45,
          dataAtual: "04/05/26",
          leituraAtual: 4888.25,
          consumo: 495.8,
          origem: "Manual",
        },
        {
          nome: "Poço 2",
          tipo: "Potável/Poço",
          dataAnterior: "01/04/26",
          leituraAnterior: 35416,
          dataAtual: "04/05/26",
          leituraAtual: 35660,
          consumo: 244,
          origem: "Manual",
        },
      ],
      total: 739.8,
      encontrado: true,
      precisaConferencia: true,
    });
  }

  function calcularPocosPelasLeituras() {
    setPocos((prev) => {
      const base = prev || {
        pocos: [],
        total: 0,
        encontrado: false,
        precisaConferencia: true,
      };

      const novosPocos = (base.pocos || []).map((item) => {
        const leituraAnterior = Number(item.leituraAnterior || 0);
        const leituraAtual = Number(item.leituraAtual || 0);
        const consumoCalculado =
          leituraAtual >= leituraAnterior ? leituraAtual - leituraAnterior : 0;

        return {
          ...item,
          consumo: consumoCalculado,
          origem: "Manual",
        };
      });

      const total = novosPocos.reduce((soma, item) => soma + Number(item.consumo || 0), 0);

      return {
        ...base,
        pocos: novosPocos,
        total,
        encontrado: total > 0,
        precisaConferencia: true,
      };
    });
  }

  async function analisarSabesp() {
    if (!arquivoSabesp) {
      setErroSabesp("Selecione a fatura SABESP em PDF.");
      return;
    }

    setCarregandoSabesp(true);
    setErroSabesp("");
    setSabesp(null);
    setTextoSabesp("");

    try {
      const texto = await extrairTextoPDF(arquivoSabesp);
      setTextoSabesp(texto);

      const dados = extrairSabesp(texto);

      if (!dados.encontrado) {
        setErroSabesp("Não consegui localizar o consumo SABESP automaticamente.");
        return;
      }

      setSabesp(dados);
    } catch (err) {
      console.error(err);
      setErroSabesp("Não foi possível ler o PDF da SABESP.");
    } finally {
      setCarregandoSabesp(false);
    }
  }

  async function analisarPluvial() {
    if (!arquivoPluvial) {
      setErroPluvial("Selecione a planilha de águas pluviais.");
      return;
    }

    setCarregandoPluvial(true);
    setErroPluvial("");
    setPluvial(null);

    try {
      const base = await extrairPlanilhaPluvial(arquivoPluvial);
      setPluvialBase(base);

      if (!base.encontrado && !base.linhasTodas?.length) {
        setErroPluvial(
          "Não consegui encontrar a aba IRRIGAÇÃO/colunas de água pluvial na planilha. Verifique se existem as colunas Data, Mês, Ano, Consumo Diário, Alimentação via MIX e Alimentação via Água Pluvial."
        );
        return;
      }

      const filtrado = filtrarPluvialPorMesAno(base, mesPluvial, anoPluvial);

      if (!filtrado.encontrado) {
        setErroPluvial(
          `A planilha foi lida, mas não encontrei registros para ${mesPluvial}/${anoPluvial}. Selecione outro mês/ano e clique em "Aplicar filtro".`
        );
      }

      setPluvial(filtrado);
    } catch (err) {
      console.error(err);
      setErroPluvial("Não foi possível ler a planilha de águas pluviais.");
    } finally {
      setCarregandoPluvial(false);
    }
  }

  function aplicarFiltroPluvial() {
    if (!pluvialBase) {
      setErroPluvial("Primeiro envie e analise a planilha TCTA/IRRIGAÇÃO.");
      return;
    }

    const filtrado = filtrarPluvialPorMesAno(pluvialBase, mesPluvial, anoPluvial);

    if (!filtrado.encontrado) {
      setErroPluvial(
        `Não encontrei registros para ${mesPluvial}/${anoPluvial}. Confira se a planilha tem esse mês e ano.`
      );
    } else {
      setErroPluvial("");
    }

    setPluvial(filtrado);
  }

  function atualizarPoco(index, campo, valor) {
    setPocos((prev) => {
      const base = prev || {
        pocos: [],
        total: 0,
        encontrado: false,
        precisaConferencia: true,
      };

      const novosPocos = [...(base.pocos || [])];
      novosPocos[index] = {
        ...novosPocos[index],
        [campo]: ["leituraAnterior", "leituraAtual", "consumo"].includes(campo)
          ? parseNumeroBR(valor)
          : valor,
        origem: "Manual",
      };

      const total = novosPocos.reduce((soma, item) => soma + Number(item.consumo || 0), 0);

      return {
        ...base,
        pocos: novosPocos,
        total,
        encontrado: total > 0,
        precisaConferencia: true,
      };
    });
  }

  function limparTudo() {
    setArquivoEnergia(null);
    setArquivoPocos(null);
    setArquivoSabesp(null);
    setArquivoPluvial(null);
    setEnergia(null);
    setPocos(null);
    setSabesp(null);
    setPluvial(null);
    setPluvialBase(null);
    setErroEnergia("");
    setErroPocos("");
    setErroSabesp("");
    setErroPluvial("");
    setTextoEnergia("");
    setTextoPocos("");
    setTextoSabesp("");
    setMostrarTexto("");
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
                Energia, água, poços, SABESP, pluvial e consolidado ESG.
              </p>
            </div>
          </div>

          <button
            onClick={limparTudo}
            className="px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 flex items-center gap-2"
          >
            <RefreshCcw size={17} />
            Limpar análises
          </button>
        </div>
      </section>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {TABS.map((item) => (
          <TabButton
            key={item.id}
            item={item}
            active={aba === item.id}
            onClick={() => setAba(item.id)}
          />
        ))}
      </div>

      {aba === "energia" && (
        <section className="grid grid-cols-1 2xl:grid-cols-[420px_1fr] gap-6">
          <UploadBox
            titulo="Upload da conta ENEL"
            subtitulo="Envie o PDF da conta para análise."
            arquivo={arquivoEnergia}
            accept="application/pdf,.pdf"
            onArquivo={(file) => {
              setArquivoEnergia(file);
              setEnergia(null);
              setErroEnergia("");
              setTextoEnergia("");
            }}
            onAnalisar={analisarEnergia}
            carregando={carregandoEnergia}
            botao="Analisar conta"
          />

          <div className="space-y-6 min-w-0">
            {!energia && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-center">
                <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto mb-4">
                  <FileText size={30} />
                </div>

                <h3 className="text-xl font-black text-slate-900">
                  Nenhuma conta analisada ainda
                </h3>

                <p className="text-sm text-slate-500 mt-2">
                  Envie uma conta ENEL em PDF e clique em analisar.
                </p>
              </div>
            )}

            {erroEnergia && <Aviso>{erroEnergia}</Aviso>}

            {energia && (
              <>
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                  <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <CheckCircle2 size={22} />
                      </div>

                      <div>
                        <h3 className="font-black text-slate-900">
                          Conta analisada
                        </h3>
                        <p className="text-xs text-slate-500">
                          Dados extraídos automaticamente do PDF.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => gerarMiniRelatorioEnergia(energia, arquivoEnergia?.name || "")}
                      className="rounded-2xl bg-slate-950 text-white px-5 py-3 font-black hover:bg-slate-800 flex items-center justify-center gap-2"
                    >
                      <FileDown size={18} />
                      Emitir mini relatório
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
                    <CardResumo
                      titulo="Mês referência"
                      valor={energia.mesReferencia || "-"}
                      subtitulo="Identificado na conta"
                      icon={CalendarDays}
                      cor="blue"
                    />

                    <CardResumo
                      titulo="Demanda"
                      valor={formatarKwh(energia.demandaKw)}
                      subtitulo="kW"
                      icon={Gauge}
                      cor="slate"
                    />

                    <CardResumo
                      titulo="Hora Ponta"
                      valor={formatarKwh(energia.horaPonta)}
                      subtitulo="kWh"
                      icon={Zap}
                      cor="amber"
                    />

                    <CardResumo
                      titulo="Hora Fora Ponta"
                      valor={formatarKwh(energia.foraPonta)}
                      subtitulo="kWh"
                      icon={Clock3}
                      cor="purple"
                    />

                    <CardResumo
                      titulo="Total consumido"
                      valor={formatarKwh(energia.total)}
                      subtitulo="Ponta + Fora Ponta"
                      icon={BarChart3}
                      cor="green"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-3xl p-5 text-sm text-blue-900">
                  <strong>Cálculo realizado:</strong>{" "}
                  {formatarKwh(energia.horaPonta)} kWh +{" "}
                  {formatarKwh(energia.foraPonta)} kWh ={" "}
                  <strong>{formatarKwh(energia.total)} kWh</strong>
                  {energia.diasFaturados ? (
                    <>
                      {" "}
                      • <strong>Dias faturados:</strong> {energia.diasFaturados}
                    </>
                  ) : null}
                </div>

                <MiniRelatorioEnergiaPreview resultado={energia} />
              </>
            )}

            {textoEnergia && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <button
                  onClick={() => setMostrarTexto(mostrarTexto === "energia" ? "" : "energia")}
                  className="text-sm font-black text-blue-700 hover:text-blue-900"
                >
                  {mostrarTexto === "energia"
                    ? "Ocultar texto extraído"
                    : "Ver texto extraído do PDF"}
                </button>

                {mostrarTexto === "energia" && (
                  <pre className="mt-4 max-h-72 overflow-auto rounded-2xl bg-slate-950 text-slate-100 p-4 text-xs whitespace-pre-wrap">
                    {textoEnergia}
                  </pre>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {aba === "pocos" && (
        <section className="grid grid-cols-1 2xl:grid-cols-[420px_1fr] gap-6">
          <UploadBox
            titulo="Upload demonstrativo dos poços"
            subtitulo="Envie PDF ou Excel dos dois poços artesianos."
            arquivo={arquivoPocos}
            accept="application/pdf,.pdf,.xlsx,.xls,.csv"
            icon={Droplets}
            onArquivo={(file) => {
              setArquivoPocos(file);
              setPocos(null);
              setErroPocos("");
              setTextoPocos("");
            }}
            onAnalisar={analisarPocos}
            carregando={carregandoPocos}
            botao="Analisar poços"
          />

          <div className="space-y-6">
            {erroPocos && <Aviso>{erroPocos}</Aviso>}

            {erroPocos && (
              <button
                onClick={iniciarPocosManual}
                className="rounded-2xl bg-blue-600 text-white px-5 py-3 font-black hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                Preencher exemplo do demonstrativo
              </button>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <CardResumo
                titulo="Volume poços"
                valor={`${formatarNumeroBR(pocos?.total || 0)} m³`}
                subtitulo="Poço 1 + Poço 2"
                icon={Droplets}
                cor="blue"
              />

              <CardResumo
                titulo="Quantidade de poços"
                valor={pocos?.pocos?.length || 0}
                subtitulo="Demonstrativos"
                icon={Gauge}
                cor="slate"
              />

              <CardResumo
                titulo="Status"
                valor={pocos?.encontrado ? "Lido" : "Pendente"}
                subtitulo={pocos?.precisaConferencia ? "Conferência recomendada" : "Automático"}
                icon={CheckCircle2}
                cor={pocos?.encontrado ? "green" : "amber"}
              />
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-black text-slate-900">
                    Volume de água captada a partir de poço artesiano
                  </h3>
                  <p className="text-sm text-slate-500">
                    Como alguns demonstrativos são escaneados, revise ou preencha manualmente se necessário.
                  </p>
                </div>
              </div>

              <button
                onClick={calcularPocosPelasLeituras}
                className="mb-4 rounded-2xl bg-slate-950 text-white px-5 py-3 font-black hover:bg-slate-800 flex items-center justify-center gap-2"
              >
                <RefreshCcw size={17} />
                Calcular consumo pelas leituras
              </button>

              <TabelaSimples
                columns={[
                  { key: "nome", label: "Poço" },
                  { key: "dataAnterior", label: "Data anterior" },
                  {
                    key: "leituraAnterior",
                    label: "Leitura anterior",
                    render: (r) => `${formatarNumeroBR(r.leituraAnterior)} m³`,
                  },
                  { key: "dataAtual", label: "Data atual" },
                  {
                    key: "leituraAtual",
                    label: "Leitura atual",
                    render: (r) => `${formatarNumeroBR(r.leituraAtual)} m³`,
                  },
                  {
                    key: "consumo",
                    label: "Volume captado",
                    render: (r) => `${formatarNumeroBR(r.consumo)} m³`,
                  },
                ]}
                rows={pocos?.pocos || []}
              />

              {(!pocos || pocos?.precisaConferencia) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {[0, 1].map((index) => {
                    const item = pocos?.pocos?.[index] || {
                      nome: `Poço ${index + 1}`,
                      dataAnterior: "",
                      leituraAnterior: 0,
                      dataAtual: "",
                      leituraAtual: 0,
                      consumo: 0,
                    };

                    return (
                      <div key={index} className="rounded-3xl border border-slate-100 p-4">
                        <h4 className="font-black text-slate-900 mb-3">
                          {item.nome}
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            value={item.dataAnterior || ""}
                            onChange={(e) => atualizarPoco(index, "dataAnterior", e.target.value)}
                            placeholder="Data anterior"
                            className="rounded-2xl border border-slate-200 p-3 text-sm"
                          />

                          <input
                            value={item.dataAtual || ""}
                            onChange={(e) => atualizarPoco(index, "dataAtual", e.target.value)}
                            placeholder="Data atual"
                            className="rounded-2xl border border-slate-200 p-3 text-sm"
                          />

                          <input
                            value={item.leituraAnterior || ""}
                            onChange={(e) => atualizarPoco(index, "leituraAnterior", e.target.value)}
                            placeholder="Leitura anterior"
                            className="rounded-2xl border border-slate-200 p-3 text-sm"
                          />

                          <input
                            value={item.leituraAtual || ""}
                            onChange={(e) => atualizarPoco(index, "leituraAtual", e.target.value)}
                            placeholder="Leitura atual"
                            className="rounded-2xl border border-slate-200 p-3 text-sm"
                          />

                          <input
                            value={item.consumo || ""}
                            onChange={(e) => atualizarPoco(index, "consumo", e.target.value)}
                            placeholder="Volume captado m³"
                            className="rounded-2xl border border-slate-200 p-3 text-sm sm:col-span-2"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {textoPocos && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <button
                  onClick={() => setMostrarTexto(mostrarTexto === "pocos" ? "" : "pocos")}
                  className="text-sm font-black text-blue-700 hover:text-blue-900"
                >
                  {mostrarTexto === "pocos"
                    ? "Ocultar texto extraído"
                    : "Ver texto extraído do PDF"}
                </button>

                {mostrarTexto === "pocos" && (
                  <pre className="mt-4 max-h-72 overflow-auto rounded-2xl bg-slate-950 text-slate-100 p-4 text-xs whitespace-pre-wrap">
                    {textoPocos}
                  </pre>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {aba === "sabesp" && (
        <section className="grid grid-cols-1 2xl:grid-cols-[420px_1fr] gap-6">
          <UploadBox
            titulo="Upload fatura SABESP"
            subtitulo="Envie a fatura completa da concessionária."
            arquivo={arquivoSabesp}
            accept="application/pdf,.pdf"
            icon={Waves}
            onArquivo={(file) => {
              setArquivoSabesp(file);
              setSabesp(null);
              setErroSabesp("");
              setTextoSabesp("");
            }}
            onAnalisar={analisarSabesp}
            carregando={carregandoSabesp}
            botao="Analisar SABESP"
          />

          <div className="space-y-6">
            {erroSabesp && <Aviso>{erroSabesp}</Aviso>}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <CardResumo
                titulo="Água via SABESP"
                valor={`${formatarNumeroBR(sabesp?.consumo || 0)} m³`}
                subtitulo="Concessionária"
                icon={Waves}
                cor="cyan"
              />

              <CardResumo
                titulo="Efluente rede pública"
                valor={`${formatarNumeroBR(sabesp?.volumeEfluente || 0)} m³`}
                subtitulo="Base: volume consumido"
                icon={Droplets}
                cor="purple"
              />

              <CardResumo
                titulo="Valor total"
                valor={brl(sabesp?.valorTotal || 0)}
                subtitulo="Conta SABESP"
                icon={Gauge}
                cor="green"
              />
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-black text-slate-900 mb-4">
                Volume de água consumido e gerando efluente para rede pública
              </h3>

              <TabelaSimples
                columns={[
                  {
                    key: "indicador",
                    label: "Indicador",
                  },
                  {
                    key: "valor",
                    label: "Valor",
                  },
                ]}
                rows={[
                  {
                    indicador: "Leitura anterior",
                    valor: `${formatarNumeroBR(sabesp?.leituraAnterior || 0)} m³`,
                  },
                  {
                    indicador: "Leitura atual",
                    valor: `${formatarNumeroBR(sabesp?.leituraAtual || 0)} m³`,
                  },
                  {
                    indicador: "Consumo via concessionária",
                    valor: `${formatarNumeroBR(sabesp?.consumo || 0)} m³`,
                  },
                  {
                    indicador: "Volume de efluente para rede pública",
                    valor: `${formatarNumeroBR(sabesp?.volumeEfluente || 0)} m³`,
                  },
                  {
                    indicador: "Valor água",
                    valor: brl(sabesp?.valorAgua || 0),
                  },
                  {
                    indicador: "Valor esgoto",
                    valor: brl(sabesp?.valorEsgoto || 0),
                  },
                  {
                    indicador: "Total da fatura",
                    valor: brl(sabesp?.valorTotal || 0),
                  },
                ]}
              />
            </div>

            {textoSabesp && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <button
                  onClick={() => setMostrarTexto(mostrarTexto === "sabesp" ? "" : "sabesp")}
                  className="text-sm font-black text-blue-700 hover:text-blue-900"
                >
                  {mostrarTexto === "sabesp"
                    ? "Ocultar texto extraído"
                    : "Ver texto extraído do PDF"}
                </button>

                {mostrarTexto === "sabesp" && (
                  <pre className="mt-4 max-h-72 overflow-auto rounded-2xl bg-slate-950 text-slate-100 p-4 text-xs whitespace-pre-wrap">
                    {textoSabesp}
                  </pre>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {aba === "pluvial" && (
        <section className="grid grid-cols-1 2xl:grid-cols-[420px_1fr] gap-6">
          <div className="space-y-6">
            <UploadBox
              titulo="Upload planilha TCTA / Irrigação"
              subtitulo="Envie a planilha .xlsx e selecione mês/ano."
              arquivo={arquivoPluvial}
              accept=".xlsx,.xls"
              icon={FileSpreadsheet}
              onArquivo={(file) => {
                setArquivoPluvial(file);
                setPluvial(null);
                setPluvialBase(null);
                setErroPluvial("");
              }}
              onAnalisar={analisarPluvial}
              carregando={carregandoPluvial}
              botao="Analisar planilha"
            />

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-black text-slate-900 mb-4">
                Filtro do relatório
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase">
                    Mês
                  </label>

                  <select
                    value={mesPluvial}
                    onChange={(e) => {
                      const novoMes = e.target.value;
                      setMesPluvial(novoMes);

                      if (pluvialBase) {
                        const filtrado = filtrarPluvialPorMesAno(
                          pluvialBase,
                          novoMes,
                          anoPluvial
                        );
                        setPluvial(filtrado);
                        setErroPluvial(filtrado.encontrado ? "" : `Não encontrei registros para ${novoMes}/${anoPluvial}.`);
                      }
                    }}
                    className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-sm bg-white"
                  >
                    {MESES_PLUVIAL.map((mes) => (
                      <option key={mes} value={mes}>
                        {mes.charAt(0).toUpperCase() + mes.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase">
                    Ano
                  </label>

                  <input
                    value={anoPluvial}
                    onChange={(e) => {
                      const novoAno = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setAnoPluvial(novoAno);

                      if (pluvialBase && novoAno.length === 4) {
                        const filtrado = filtrarPluvialPorMesAno(
                          pluvialBase,
                          mesPluvial,
                          novoAno
                        );
                        setPluvial(filtrado);
                        setErroPluvial(filtrado.encontrado ? "" : `Não encontrei registros para ${mesPluvial}/${novoAno}.`);
                      }
                    }}
                    placeholder="2026"
                    className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-sm"
                  />
                </div>
              </div>

              <button
                onClick={aplicarFiltroPluvial}
                className="mt-4 w-full rounded-2xl bg-blue-600 text-white py-3 font-black hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <RefreshCcw size={17} />
                Aplicar filtro mês/ano
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {erroPluvial && <Aviso>{erroPluvial}</Aviso>}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <CardResumo
                titulo="Água pluvial"
                valor={`${formatarNumeroBR(pluvial?.totalPluvial || 0)} m³`}
                subtitulo={`${pluvial?.mesSelecionado || mesPluvial}/${pluvial?.anoSelecionado || anoPluvial}`}
                icon={CloudRain}
                cor="green"
              />

              <CardResumo
                titulo="Alimentação MIX"
                valor={`${formatarNumeroBR(pluvial?.totalMix || 0)} m³`}
                subtitulo="Reservatório/MIX"
                icon={Droplets}
                cor="blue"
              />

              <CardResumo
                titulo="Consumo diário"
                valor={`${formatarNumeroBR(pluvial?.totalConsumo || 0)} m³`}
                subtitulo={`${pluvial?.linhas?.length || 0} dia(s)`}
                icon={Gauge}
                cor="slate"
              />
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-black text-slate-900">
                    Relatório de águas pluviais — Irrigação
                  </h3>

                  <p className="text-sm text-slate-500">
                    Dias do mês, consumo diário, alimentação via MIX e volume captado de água pluvial.
                  </p>
                </div>

                <button
                  onClick={() => gerarRelatorioPluvial(pluvial)}
                  disabled={!pluvial?.linhas?.length}
                  className="rounded-2xl bg-slate-950 text-white px-5 py-3 font-black hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FileDown size={18} />
                  Emitir relatório pluvial
                </button>
              </div>

              <TabelaSimples
                columns={[
                  { key: "data", label: "Dia/Data" },
                  { key: "mes", label: "Mês" },
                  { key: "ano", label: "Ano" },
                  {
                    key: "consumoDiario",
                    label: "Consumo diário",
                    render: (r) => `${formatarNumeroBR(r.consumoDiario)} m³`,
                  },
                  {
                    key: "mix",
                    label: "Alimentação via MIX",
                    render: (r) => `${formatarNumeroBR(r.mix)} m³`,
                  },
                  {
                    key: "pluvial",
                    label: "Alimentação via água pluvial",
                    render: (r) => `${formatarNumeroBR(r.pluvial)} m³`,
                  },
                ]}
                rows={pluvial?.linhas || []}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5 text-sm">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-slate-600 font-black">Total consumo diário</p>
                  <p className="text-xl font-black text-slate-900 mt-1">
                    {formatarNumeroBR(pluvial?.totalConsumo || 0)} m³
                  </p>
                </div>

                <div className="rounded-2xl bg-blue-50 p-4">
                  <p className="text-blue-700 font-black">Total via MIX</p>
                  <p className="text-xl font-black text-blue-800 mt-1">
                    {formatarNumeroBR(pluvial?.totalMix || 0)} m³
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-emerald-700 font-black">Total água pluvial</p>
                  <p className="text-xl font-black text-emerald-800 mt-1">
                    {formatarNumeroBR(pluvial?.totalPluvial || 0)} m³
                  </p>
                </div>
              </div>
            </div>

            {pluvialBase?.linhasTodas?.length ? (
              <Aviso tipo="blue">
                Planilha lida com {pluvialBase.linhasTodas.length} linha(s) da aba IRRIGAÇÃO.
                O relatório e o consolidado usam apenas o mês/ano selecionado.
              </Aviso>
            ) : null}
          </div>
        </section>
      )}

      {aba === "consolidado" && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <CardResumo
              titulo="Poços artesianos"
              valor={`${formatarNumeroBR(consolidado.totalPocos)} m³`}
              subtitulo={`${formatarPercentual(consolidado.pctPocos)}% do total`}
              icon={Droplets}
              cor="blue"
            />

            <CardResumo
              titulo="SABESP"
              valor={`${formatarNumeroBR(consolidado.totalSabesp)} m³`}
              subtitulo={`${formatarPercentual(consolidado.pctSabesp)}% do total`}
              icon={Waves}
              cor="cyan"
            />

            <CardResumo
              titulo="Água pluvial"
              valor={`${formatarNumeroBR(consolidado.totalPluvial)} m³`}
              subtitulo={`${formatarPercentual(consolidado.pctPluvial)}% do total`}
              icon={CloudRain}
              cor="green"
            />

            <CardResumo
              titulo="Total controlado"
              valor={`${formatarNumeroBR(consolidado.total)} m³`}
              subtitulo="Poços + SABESP + Pluvial"
              icon={BarChart3}
              cor="amber"
            />
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-5">
              <div>
                <h3 className="font-black text-slate-900">
                  Consolidado ESG hídrico
                </h3>
                <p className="text-sm text-slate-500">
                  Resumo dos volumes por fonte de abastecimento e reuso.
                </p>
              </div>

              <button
                onClick={() =>
                  gerarRelatorioHidrico({
                    energia,
                    pocos,
                    sabesp,
                    pluvial,
                  })
                }
                className="rounded-2xl bg-slate-950 text-white px-5 py-3 font-black hover:bg-slate-800 flex items-center justify-center gap-2"
              >
                <FileDown size={18} />
                Emitir relatório hídrico
              </button>
            </div>

            <TabelaSimples
              columns={[
                { key: "fonte", label: "Fonte" },
                { key: "volume", label: "Volume" },
                { key: "participacao", label: "Participação" },
                { key: "descricao", label: "Descrição" },
              ]}
              rows={[
                {
                  fonte: "Poços artesianos",
                  volume: `${formatarNumeroBR(consolidado.totalPocos)} m³`,
                  participacao: `${formatarPercentual(consolidado.pctPocos)}%`,
                  descricao: "Volume de água captada a partir de poço artesiano.",
                },
                {
                  fonte: "SABESP / Concessionária",
                  volume: `${formatarNumeroBR(consolidado.totalSabesp)} m³`,
                  participacao: `${formatarPercentual(consolidado.pctSabesp)}%`,
                  descricao: "Volume de água consumido via concessionária.",
                },
                {
                  fonte: "Água pluvial / Reuso",
                  volume: `${formatarNumeroBR(consolidado.totalPluvial)} m³`,
                  participacao: `${formatarPercentual(consolidado.pctPluvial)}%`,
                  descricao: "Volume de água captada a partir da chuva para reuso.",
                },
                {
                  fonte: "Total controlado",
                  volume: `${formatarNumeroBR(consolidado.total)} m³`,
                  participacao: "100,00%",
                  descricao: "Soma de poços, concessionária e pluvial.",
                },
              ]}
            />
          </div>

          <Aviso tipo="blue">
            Para o consolidado ficar completo, analise pelo menos um arquivo em
            <strong> Poços artesianos</strong>, um em <strong>SABESP</strong> e
            a planilha em <strong>Águas pluviais</strong>.
          </Aviso>
        </section>
      )}
    </div>
  );
}
