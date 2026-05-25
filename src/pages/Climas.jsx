import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

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

  /*
    Padrão mais confiável para a tabela de histórico:

    Mês/Ano | Demanda kW | Hora Ponta | Hora Fora Ponta | Nº Dias FAT

    Exemplo:
    ABR/26 900,000 32.453,820 208.816,020 30

    O sistema anterior estava confundindo ABR/26 com 26,000.
    Por isso agora a extração prioriza a linha completa do histórico.
  */

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

  /*
    Plano B:
    Caso o PDF venha com os textos quebrados, tenta achar a sequência depois de
    "Consumo Faturado kWh", mas ainda exigindo números com vírgula decimal.
  */

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
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
  };

  return (
    <div className={`rounded-3xl border p-5 ${cores[cor] || cores.blue}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase opacity-80">{titulo}</p>
          <p className="text-2xl font-black mt-2">{valor}</p>
          {subtitulo && (
            <p className="text-xs font-semibold mt-1 opacity-75">{subtitulo}</p>
          )}
        </div>

        <div className="w-12 h-12 rounded-2xl bg-white/70 flex items-center justify-center shrink-0">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
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
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Zap size={24} />
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900">Climas</h2>
                <p className="text-sm text-slate-500">
                  Análise automática da conta ENEL para consumo Hora Ponta e
                  Hora Fora Ponta.
                </p>
              </div>
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

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Upload size={22} />
            </div>

            <div>
              <h3 className="font-black text-slate-900">
                Upload da conta ENEL
              </h3>
              <p className="text-xs text-slate-500">
                Envie o PDF da conta para análise.
              </p>
            </div>
          </div>

          <label className="block border-2 border-dashed border-slate-200 rounded-3xl p-6 text-center cursor-pointer hover:bg-slate-50 transition">
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

            <FileText className="mx-auto text-slate-400 mb-3" size={34} />

            <p className="font-bold text-slate-800">
              {nomeArquivo || "Clique para selecionar o PDF"}
            </p>

            <p className="text-xs text-slate-400 mt-2">
              Funciona melhor com PDF digital. PDF escaneado pode precisar de
              OCR depois.
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

        <div className="xl:col-span-2 space-y-6">
          {!resultado && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-center">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto mb-4">
                <FileText size={30} />
              </div>

              <h3 className="text-xl font-black text-slate-900">
                Nenhuma conta analisada ainda
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Envie uma conta ENEL em PDF e clique em analisar para extrair o
                consumo.
              </p>
            </div>
          )}

          {resultado && (
            <>
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5">
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

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                  <CardResumo
                    titulo="Mês referência"
                    valor={resultado.mesReferencia || "-"}
                    subtitulo="Identificado na conta"
                    icon={FileText}
                    cor="blue"
                  />

                  <CardResumo
                    titulo="Demanda"
                    valor={formatarNumeroBR(resultado.demandaKw)}
                    subtitulo="kW"
                    icon={Zap}
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
                    icon={Zap}
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
                    • <strong>Dias faturados:</strong>{" "}
                    {resultado.diasFaturados}
                  </>
                ) : null}
              </div>
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
