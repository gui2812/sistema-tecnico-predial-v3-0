import {
  ArrowDown,
  ArrowUp,
  Brain,
  CheckCircle2,
  Download,
  FileArchive,
  FileImage,
  FileText,
  Files,
  Loader2,
  Merge,
  Plus,
  RotateCw,
  Scissors,
  Shield,
  Trash2,
  UploadCloud,
  Wand2,
  X,
} from "lucide-react";
import {
  useMemo,
  useRef,
  useState,
} from "react";
import {
  PDFDocument,
} from "pdf-lib";

function formatarTamanho(bytes = 0) {
  if (!bytes) {
    return "0 KB";
  }

  const unidades = [
    "B",
    "KB",
    "MB",
    "GB",
  ];

  let tamanho = bytes;
  let indice = 0;

  while (
    tamanho >= 1024 &&
    indice < unidades.length - 1
  ) {
    tamanho = tamanho / 1024;
    indice += 1;
  }

  return `${tamanho.toFixed(
    tamanho >= 10 ? 1 : 2
  )} ${unidades[indice]}`;
}

function gerarIdArquivo() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function baixarBlob(
  blob,
  nomeArquivo
) {
  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download = nomeArquivo;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

async function lerPaginasPdf(file) {
  const buffer =
    await file.arrayBuffer();

  const pdf =
    await PDFDocument.load(buffer, {
      ignoreEncryption: true,
    });

  return pdf.getPageCount();
}

async function adicionarPdfAoDocumento(
  pdfFinal,
  file
) {
  const buffer =
    await file.arrayBuffer();

  const pdfOrigem =
    await PDFDocument.load(buffer, {
      ignoreEncryption: true,
    });

  const indices =
    pdfOrigem
      .getPageIndices();

  const paginas =
    await pdfFinal.copyPages(
      pdfOrigem,
      indices
    );

  paginas.forEach((pagina) => {
    pdfFinal.addPage(pagina);
  });

  return indices.length;
}

const categorias = [
  {
    titulo: "Conversão",
    descricao:
      "Transforme documentos e imagens em PDF ou exporte PDF para outros formatos.",
    icone: FileArchive,
    ferramentas: [
      "Imagem para PDF",
      "Office para PDF",
      "PDF para imagem",
      "PDF para Word / Excel",
    ],
    status: "Em breve",
  },
  {
    titulo: "Edição",
    descricao:
      "Recursos para escrever, assinar, marcar, preencher e proteger documentos.",
    icone: Wand2,
    ferramentas: [
      "Editar PDF",
      "Assinatura",
      "Marca d’água",
      "Preencher formulário",
    ],
    status: "Em breve",
  },
  {
    titulo: "Organização",
    descricao:
      "Ferramentas para juntar, dividir, reorganizar, girar e compactar arquivos.",
    icone: Files,
    ferramentas: [
      "Juntar PDF",
      "Dividir PDF",
      "Girar páginas",
      "Compactar PDF",
    ],
    status: "Ativo",
  },
  {
    titulo: "IA",
    descricao:
      "Resumo, tradução, perguntas e extração inteligente de informações.",
    icone: Brain,
    ferramentas: [
      "Resumo por IA",
      "Traduzir documento",
      "Perguntar ao PDF",
      "OCR inteligente",
    ],
    status: "Em breve",
  },
];

export default function FerramentasPDF({
  user,
}) {
  const inputRef = useRef(null);

  const [
    arquivos,
    setArquivos,
  ] = useState([]);

  const [
    carregando,
    setCarregando,
  ] = useState(false);

  const [
    gerando,
    setGerando,
  ] = useState(false);

  const [
    mensagem,
    setMensagem,
  ] = useState("");

  const [
    erro,
    setErro,
  ] = useState("");

  const [
    nomeSaida,
    setNomeSaida,
  ] = useState(
    "PDF unificado"
  );

  const totalPaginas =
    useMemo(() => {
      return arquivos.reduce(
        (total, item) =>
          total +
          Number(
            item.paginas || 0
          ),
        0
      );
    }, [arquivos]);

  const tamanhoTotal =
    useMemo(() => {
      return arquivos.reduce(
        (total, item) =>
          total +
          Number(
            item.tamanho || 0
          ),
        0
      );
    }, [arquivos]);

  async function selecionarArquivos(
    event
  ) {
    const files =
      Array.from(
        event.target.files || []
      );

    event.target.value = "";

    if (!files.length) {
      return;
    }

    setErro("");
    setMensagem("");
    setCarregando(true);

    try {
      const novos = [];

      for (const file of files) {
        const ehPdf =
          file.type ===
            "application/pdf" ||
          file.name
            .toLowerCase()
            .endsWith(".pdf");

        if (!ehPdf) {
          novos.push({
            id: gerarIdArquivo(),
            file,
            nome: file.name,
            tamanho: file.size,
            paginas: 0,
            invalido: true,
            erro:
              "Arquivo ignorado: envie somente PDF nesta primeira versão.",
          });

          continue;
        }

        let paginas = 0;
        let invalido = false;
        let erroArquivo = "";

        try {
          paginas =
            await lerPaginasPdf(
              file
            );
        } catch (err) {
          invalido = true;
          erroArquivo =
            "Não foi possível ler este PDF. Ele pode estar protegido, corrompido ou criptografado.";
        }

        novos.push({
          id: gerarIdArquivo(),
          file,
          nome: file.name,
          tamanho: file.size,
          paginas,
          invalido,
          erro: erroArquivo,
        });
      }

      setArquivos(
        (atuais) => [
          ...atuais,
          ...novos,
        ]
      );
    } catch (err) {
      setErro(
        err?.message ||
          "Erro ao carregar os arquivos."
      );
    } finally {
      setCarregando(false);
    }
  }

  function removerArquivo(id) {
    setArquivos((atuais) =>
      atuais.filter(
        (item) => item.id !== id
      )
    );
  }

  function limparArquivos() {
    setArquivos([]);
    setErro("");
    setMensagem("");
  }

  function moverArquivo(
    id,
    direcao
  ) {
    setArquivos((atuais) => {
      const lista = [
        ...atuais,
      ];

      const indice =
        lista.findIndex(
          (item) => item.id === id
        );

      if (indice < 0) {
        return lista;
      }

      const novoIndice =
        direcao === "cima"
          ? indice - 1
          : indice + 1;

      if (
        novoIndice < 0 ||
        novoIndice >= lista.length
      ) {
        return lista;
      }

      const item =
        lista[indice];

      lista.splice(
        indice,
        1
      );

      lista.splice(
        novoIndice,
        0,
        item
      );

      return lista;
    });
  }

  async function juntarPDFs() {
    setErro("");
    setMensagem("");

    const validos =
      arquivos.filter(
        (item) => !item.invalido
      );

    if (validos.length < 2) {
      setErro(
        "Adicione pelo menos 2 PDFs válidos para juntar."
      );

      return;
    }

    setGerando(true);

    try {
      const pdfFinal =
        await PDFDocument.create();

      let paginasAdicionadas = 0;

      for (const item of validos) {
        const paginas =
          await adicionarPdfAoDocumento(
            pdfFinal,
            item.file
          );

        paginasAdicionadas += paginas;
      }

      const bytes =
        await pdfFinal.save();

      const blob =
        new Blob([bytes], {
          type: "application/pdf",
        });

      const nomeLimpo =
        String(
          nomeSaida ||
            "PDF unificado"
        )
          .replace(
            /[\\/:*?"<>|]/g,
            "-"
          )
          .trim();

      baixarBlob(
        blob,
        `${nomeLimpo}.pdf`
      );

      setMensagem(
        `PDF gerado com sucesso: ${paginasAdicionadas} página(s) unificada(s).`
      );
    } catch (err) {
      setErro(
        err?.message ||
          "Erro ao juntar os PDFs."
      );
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Files size={28} />
            </div>

            <div>
              <p className="text-sm font-semibold text-blue-700">
                Central de documentos
              </p>

              <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
                Ferramentas PDF
              </h1>

              <p className="text-sm text-slate-500 mt-2 max-w-3xl">
                Área para juntar, organizar, converter, editar e analisar PDFs dentro do sistema, sem depender de sites externos.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              inputRef.current?.click()
            }
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition"
          >
            <UploadCloud size={18} />
            Selecionar PDFs
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {categorias.map(
          (categoria) => {
            const Icone =
              categoria.icone;

            const ativo =
              categoria.status ===
              "Ativo";

            return (
              <div
                key={
                  categoria.titulo
                }
                className={`rounded-[1.6rem] border p-5 bg-white shadow-sm ${
                  ativo
                    ? "border-blue-200 ring-2 ring-blue-50"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                      ativo
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Icone size={22} />
                  </div>

                  <span
                    className={`text-[11px] font-black px-3 py-1 rounded-full ${
                      ativo
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {categoria.status}
                  </span>
                </div>

                <h2 className="font-black text-slate-900 mt-4">
                  {categoria.titulo}
                </h2>

                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  {categoria.descricao}
                </p>

                <div className="mt-4 space-y-2">
                  {categoria.ferramentas.map(
                    (item) => (
                      <div
                        key={item}
                        className="text-xs text-slate-600 flex items-center gap-2"
                      >
                        <CheckCircle2
                          size={14}
                          className={
                            ativo
                              ? "text-blue-600"
                              : "text-slate-300"
                          }
                        />
                        {item}
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>

      <div className="grid xl:grid-cols-[1fr_360px] gap-6">
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2 text-blue-700 font-black">
                <Merge size={20} />
                Juntar / Mesclar PDF
              </div>

              <p className="text-sm text-slate-500 mt-1">
                Selecione os PDFs, organize a ordem e gere um único arquivo final.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  inputRef.current?.click()
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <Plus size={16} />
                Adicionar
              </button>

              <button
                type="button"
                onClick={limparArquivos}
                disabled={!arquivos.length}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <Trash2 size={16} />
                Limpar
              </button>
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept="application/pdf,.pdf"
            onChange={
              selecionarArquivos
            }
            className="hidden"
          />

          {carregando ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="animate-spin mb-3" />
              <p className="font-bold">
                Lendo arquivos...
              </p>
            </div>
          ) : arquivos.length === 0 ? (
            <button
              type="button"
              onClick={() =>
                inputRef.current?.click()
              }
              className="w-full mt-5 border-2 border-dashed border-slate-200 rounded-[1.5rem] p-10 md:p-14 text-center hover:border-blue-300 hover:bg-blue-50/30 transition"
            >
              <UploadCloud
                size={42}
                className="mx-auto text-blue-600"
              />

              <h3 className="font-black text-slate-900 mt-4">
                Arraste ou selecione PDFs
              </h3>

              <p className="text-sm text-slate-500 mt-2">
                Nesta primeira versão, a ferramenta junta arquivos PDF em um único documento.
              </p>
            </button>
          ) : (
            <div className="mt-5 space-y-3">
              {arquivos.map(
                (item, index) => (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 flex flex-col md:flex-row md:items-center gap-4 ${
                      item.invalido
                        ? "border-red-200 bg-red-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                          item.invalido
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        <FileText size={22} />
                      </div>

                      <div className="min-w-0">
                        <p className="font-black text-slate-900 truncate">
                          {index + 1}. {item.nome}
                        </p>

                        <p className="text-xs text-slate-500 mt-1">
                          {item.invalido
                            ? item.erro
                            : `${item.paginas} página(s) • ${formatarTamanho(
                                item.tamanho
                              )}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 md:justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          moverArquivo(
                            item.id,
                            "cima"
                          )
                        }
                        disabled={
                          index === 0
                        }
                        className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30"
                        title="Mover para cima"
                      >
                        <ArrowUp size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          moverArquivo(
                            item.id,
                            "baixo"
                          )
                        }
                        disabled={
                          index ===
                          arquivos.length - 1
                        }
                        className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30"
                        title="Mover para baixo"
                      >
                        <ArrowDown size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          removerArquivo(
                            item.id
                          )
                        }
                        className="w-10 h-10 rounded-xl border border-red-100 text-red-600 flex items-center justify-center hover:bg-red-50"
                        title="Remover"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {erro ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {erro}
            </div>
          ) : null}

          {mensagem ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
              {mensagem}
            </div>
          ) : null}
        </div>

        <aside className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-5 md:p-6 h-fit">
          <h3 className="font-black text-slate-900">
            Saída do arquivo
          </h3>

          <p className="text-sm text-slate-500 mt-1">
            Defina o nome do PDF unificado antes de baixar.
          </p>

          <label className="block mt-5">
            <span className="text-xs font-black text-slate-600">
              Nome do arquivo
            </span>

            <input
              value={nomeSaida}
              onChange={(event) =>
                setNomeSaida(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              placeholder="Ex: Propostas - Bomba Jockey"
            />
          </label>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs text-slate-500">
                Arquivos
              </p>

              <p className="text-xl font-black text-slate-900 mt-1">
                {arquivos.length}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
              <p className="text-xs text-slate-500">
                Páginas
              </p>

              <p className="text-xl font-black text-slate-900 mt-1">
                {totalPaginas}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 col-span-2">
              <p className="text-xs text-slate-500">
                Tamanho total original
              </p>

              <p className="text-xl font-black text-slate-900 mt-1">
                {formatarTamanho(
                  tamanhoTotal
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={juntarPDFs}
            disabled={
              gerando ||
              arquivos.filter(
                (item) => !item.invalido
              ).length < 2
            }
            className="mt-5 w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-blue-600 text-white font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition disabled:opacity-40"
          >
            {gerando ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Gerando PDF...
              </>
            ) : (
              <>
                <Download size={18} />
                Juntar e baixar PDF
              </>
            )}
          </button>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <h4 className="font-black text-slate-900 text-sm">
              Próximas ferramentas
            </h4>

            <div className="mt-3 space-y-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Scissors
                  size={16}
                  className="text-slate-400"
                />
                Dividir PDF por páginas
              </div>

              <div className="flex items-center gap-2">
                <RotateCw
                  size={16}
                  className="text-slate-400"
                />
                Girar páginas
              </div>

              <div className="flex items-center gap-2">
                <FileImage
                  size={16}
                  className="text-slate-400"
                />
                Imagem para PDF
              </div>

              <div className="flex items-center gap-2">
                <Shield
                  size={16}
                  className="text-slate-400"
                />
                Proteger com senha
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
