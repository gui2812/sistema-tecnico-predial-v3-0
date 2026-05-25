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

function buscarNumeroDepoisDe(texto, termos = []) {
  const textoNormalizado = normalizarTexto(texto);

  for (const termo of termos) {
    const regex = new RegExp(`${termo}.{0,80}?([0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{1,3}|[0-9]+,[0-9]{1,3}|[0-9]+)`, "i");
    const match = textoNormalizado.match(regex);

    if (match?.[1]) {
      return parseNumeroBR(match[1]);
    }
  }

  return 0;
}

function extrairConsumosEnel(textoOriginal) {
  const texto = normalizarTexto(textoOriginal);

  const mesReferencia = buscarMesReferencia(texto);

  let horaPonta = buscarNumeroDepoisDe(texto, [
    "hora\\s*ponta",
    "ponta",
    "consumo\\s*faturado\\s*kwh\\s*hora\\s*ponta",
  ]);

  let foraPonta = buscarNumeroDepoisDe(texto, [
    "fora\\s*ponta",
    "consumo\\s*faturado\\s*kwh\\s*fora\\s*ponta",
  ]);

  /*
    Plano B:
    Em algumas contas, o texto vem em sequência:
    "Consumo Faturado kWh Hora Ponta 32.453,820 Fora Ponta 208.816,020"
  */
  if (!horaPonta || !foraPonta) {
    const regexSequencia =
      /consumo\s*faturado\s*kwh.*?hora\s*ponta.*?([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{1,3}|[0-9]+,[0-9]{1,3}|[0-9]+).*?fora\s*ponta.*?([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{1,3}|[0-9]+,[0-9]{1,3}|[0-9]+)/i;

    const match = texto.match(regexSequencia);

    if (match?.[1]) horaPonta = parseNumeroBR(match[1]);
    if (match?.[2]) foraPonta = parseNumeroBR(match[2]);
  }

  const total = horaPonta + foraPonta;

  return {
    mesReferencia,
    horaPonta,
    foraPonta,
    total,
    encontrado: horaPonta > 0 || foraPonta > 0,
  };
}

async function extrairTextoPDF(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let textoFinal = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    const textoPagina = content.items
      .map((item) => item.str)
      .join(" ");

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
  };

  return (
    <div className={`rounded-3xl border p-5 ${cores[cor] || cores.blue}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase opacity-80">{titulo}</p>
          <p className="text-2xl font-black mt-2">{valor}</p>
          {subtitulo && <p className="text-xs font-semibold mt-1 opacity-75">{subtitulo}</p>}
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
          "Não consegui localizar automaticamente Hora Ponta e Fora Ponta nesse PDF. O arquivo pode estar escaneado como imagem ou com texto fora do padrão."
        );
        setResultado(null);
        return;
      }

      setResultado(dados);
    } catch (err) {
      console.error(err);
      setErro("Não foi possível ler o PDF. Confirme se o arquivo é uma conta em PDF digital.");
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
                  Análise automática da conta ENEL para consumo Hora Ponta e Fora Ponta.
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
              <h3 className="font-black text-slate-900">Upload da conta ENEL</h3>
              <p className="text-xs text-slate-500">Envie o PDF da conta para análise.</p>
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

        <div className="xl:col-span-2 space-y-6">
          {!resultado && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-center">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto mb-4">
                <FileText size={30} />
              </div>

              <h3 className="text-xl font-black text-slate-900">Nenhuma conta analisada ainda</h3>
              <p className="text-sm text-slate-500 mt-2">
                Envie uma conta ENEL em PDF e clique em analisar para extrair o consumo.
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
                    <h3 className="font-black text-slate-900">Conta analisada</h3>
                    <p className="text-xs text-slate-500">
                      Dados extraídos automaticamente do PDF.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <CardResumo
                    titulo="Mês referência"
                    valor={resultado.mesReferencia || "-"}
                    subtitulo="Identificado na conta"
                    icon={FileText}
                    cor="blue"
                  />

                  <CardResumo
                    titulo="Hora Ponta"
                    valor={formatarNumeroBR(resultado.horaPonta)}
                    subtitulo="kWh"
                    icon={Zap}
                    cor="amber"
                  />

                  <CardResumo
                    titulo="Fora Ponta"
                    valor={formatarNumeroBR(resultado.foraPonta)}
                    subtitulo="kWh"
                    icon={Zap}
                    cor="purple"
                  />

                  <CardResumo
                    titulo="Total consumido"
                    valor={formatarNumeroBR(resultado.total)}
                    subtitulo="Hora Ponta + Fora Ponta"
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
              </div>
            </>
          )}

          {textoExtraido && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <button
                onClick={() => setMostrarTexto((v) => !v)}
                className="text-sm font-black text-blue-700 hover:text-blue-900"
              >
                {mostrarTexto ? "Ocultar texto extraído" : "Ver texto extraído do PDF"}
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
