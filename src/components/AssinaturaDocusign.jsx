import {
  Check,
  ChevronDown,
  FileText,
  Mail,
  MousePointer2,
  Plus,
  Save,
  Signature,
  Trash2,
  UploadCloud,
  User,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const TIPOS_CAMPO = [
  {
    id: "assinatura",
    label: "Assinatura",
    icon: Signature,
    w: 180,
    h: 48,
  },
  {
    id: "rubrica",
    label: "Rubrica",
    icon: Signature,
    w: 120,
    h: 38,
  },
  {
    id: "data",
    label: "Data de assinatura",
    icon: FileText,
    w: 150,
    h: 34,
  },
  {
    id: "nome",
    label: "Nome",
    icon: User,
    w: 180,
    h: 34,
  },
  {
    id: "email",
    label: "E-mail",
    icon: Mail,
    w: 200,
    h: 34,
  },
  {
    id: "empresa",
    label: "Empresa",
    icon: FileText,
    w: 180,
    h: 34,
  },
  {
    id: "funcao",
    label: "Função",
    icon: FileText,
    w: 160,
    h: 34,
  },
  {
    id: "telefone",
    label: "Número de telefone",
    icon: FileText,
    w: 160,
    h: 34,
  },
  {
    id: "endereco",
    label: "Endereço",
    icon: FileText,
    w: 220,
    h: 34,
  },
  {
    id: "texto",
    label: "Texto",
    icon: FileText,
    w: 180,
    h: 34,
  },
  {
    id: "numero",
    label: "Número",
    icon: FileText,
    w: 100,
    h: 34,
  },
  {
    id: "checkbox",
    label: "Caixa de seleção",
    icon: Check,
    w: 34,
    h: 34,
  },
  {
    id: "lista",
    label: "Lista suspensa",
    icon: ChevronDown,
    w: 180,
    h: 34,
  },
  {
    id: "selecao",
    label: "Seleção",
    icon: Check,
    w: 140,
    h: 34,
  },
  {
    id: "pagamento",
    label: "Item de pagamento",
    icon: FileText,
    w: 180,
    h: 34,
  },
  {
    id: "desenho",
    label: "Desenho",
    icon: FileText,
    w: 180,
    h: 80,
  },
  {
    id: "formula",
    label: "Fórmula",
    icon: FileText,
    w: 160,
    h: 34,
  },
  {
    id: "anexo",
    label: "Anexo",
    icon: FileText,
    w: 160,
    h: 34,
  },
  {
    id: "observacao",
    label: "Observação",
    icon: FileText,
    w: 180,
    h: 60,
  },
  {
    id: "aprovar",
    label: "Aprovar",
    icon: Check,
    w: 120,
    h: 34,
  },
  {
    id: "recusar",
    label: "Recusar",
    icon: X,
    w: 120,
    h: 34,
  },
];

function gerarId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function limparNome(nome) {
  return String(nome || "documento-assinatura")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function baixarBlob(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = nomeArquivo;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

async function obterQuantidadePaginas(file) {
  const buffer = await file.arrayBuffer();

  const pdf = await PDFDocument.load(buffer, {
    ignoreEncryption: true,
  });

  return pdf.getPageCount();
}

export default function AssinaturaDocusign() {
  const inputRef = useRef(null);
  const canvasRef = useRef(null);
  const paginaRef = useRef(null);

  const [documentos, setDocumentos] = useState([]);
  const [documentoAtivoId, setDocumentoAtivoId] = useState("");
  const [paginaAtiva, setPaginaAtiva] = useState(1);

  const [destinatarios, setDestinatarios] = useState([
    {
      id: gerarId(),
      nome: "",
      email: "",
      assinaturaNecessaria: true,
    },
  ]);

  const [destinatarioAtivoId, setDestinatarioAtivoId] = useState("");
  const [tipoCampoAtivo, setTipoCampoAtivo] = useState("assinatura");
  const [campos, setCampos] = useState([]);

  const [carregando, setCarregando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [arrastandoCampo, setArrastandoCampo] = useState(null);

  const documentoAtivo = useMemo(() => {
    return documentos.find((doc) => doc.id === documentoAtivoId) || null;
  }, [documentos, documentoAtivoId]);

  const destinatarioAtivo = useMemo(() => {
    return (
      destinatarios.find((dest) => dest.id === destinatarioAtivoId) ||
      destinatarios[0] ||
      null
    );
  }, [destinatarios, destinatarioAtivoId]);

  const camposPagina = useMemo(() => {
    if (!documentoAtivo) {
      return [];
    }

    return campos.filter(
      (campo) =>
        campo.documentoId === documentoAtivo.id &&
        campo.pagina === paginaAtiva
    );
  }, [campos, documentoAtivo, paginaAtiva]);

  useEffect(() => {
    if (!destinatarioAtivoId && destinatarios[0]) {
      setDestinatarioAtivoId(destinatarios[0].id);
    }
  }, [destinatarios, destinatarioAtivoId]);

  useEffect(() => {
    renderizarPagina();
  }, [documentoAtivoId, paginaAtiva]);

  async function selecionarDocumentos(event) {
    const files = Array.from(event.target.files || []);

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
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf");

        if (!ehPdf) {
          continue;
        }

        const paginas = await obterQuantidadePaginas(file);

        novos.push({
          id: gerarId(),
          file,
          nome: file.name,
          paginas,
        });
      }

      if (!novos.length) {
        throw new Error("Selecione pelo menos um PDF válido.");
      }

      setDocumentos((atuais) => {
        const lista = [...atuais, ...novos];

        if (!documentoAtivoId) {
          setDocumentoAtivoId(lista[0].id);
          setPaginaAtiva(1);
        }

        return lista;
      });
    } catch (err) {
      setErro(err?.message || "Erro ao carregar documentos.");
    } finally {
      setCarregando(false);
    }
  }

  async function renderizarPagina() {
    if (!documentoAtivo || !canvasRef.current) {
      return;
    }

    try {
      const buffer = await documentoAtivo.file.arrayBuffer();

      const pdf = await pdfjsLib.getDocument({
        data: buffer.slice(0),
      }).promise;

      const pagina = await pdf.getPage(paginaAtiva);

      const viewportOriginal = pagina.getViewport({
        scale: 1,
      });

      const larguraMaxima = 900;
      const escala = Math.min(
        larguraMaxima / viewportOriginal.width,
        1.55
      );

      const viewport = pagina.getViewport({
        scale: escala,
      });

      const canvas = canvasRef.current;
      const contexto = canvas.getContext("2d");

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      await pagina.render({
        canvasContext: contexto,
        viewport,
      }).promise;
    } catch (err) {
      setErro("Não foi possível renderizar a página do PDF.");
    }
  }

  function adicionarDestinatario() {
    const novo = {
      id: gerarId(),
      nome: "",
      email: "",
      assinaturaNecessaria: true,
    };

    setDestinatarios((atuais) => [...atuais, novo]);
    setDestinatarioAtivoId(novo.id);
  }

  function atualizarDestinatario(id, patch) {
    setDestinatarios((atuais) =>
      atuais.map((dest) =>
        dest.id === id
          ? {
              ...dest,
              ...patch,
            }
          : dest
      )
    );
  }

  function removerDestinatario(id) {
    setDestinatarios((atuais) => {
      const filtrados = atuais.filter((dest) => dest.id !== id);

      if (destinatarioAtivoId === id && filtrados[0]) {
        setDestinatarioAtivoId(filtrados[0].id);
      }

      return filtrados.length ? filtrados : atuais;
    });
  }

  function adicionarCampoNaPagina(event) {
    if (!documentoAtivo || !paginaRef.current || !destinatarioAtivo) {
      return;
    }

    if (event.target.dataset?.campo === "posicionado") {
      return;
    }

    const tipo = TIPOS_CAMPO.find((item) => item.id === tipoCampoAtivo);

    if (!tipo) {
      return;
    }

    const rect = paginaRef.current.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const novoCampo = {
      id: gerarId(),
      documentoId: documentoAtivo.id,
      pagina: paginaAtiva,
      tipo: tipo.id,
      label: tipo.label,
      destinatarioId: destinatarioAtivo.id,
      xPct: Math.max(0, Math.min(100, (x / rect.width) * 100)),
      yPct: Math.max(0, Math.min(100, (y / rect.height) * 100)),
      wPct: Math.min(40, (tipo.w / rect.width) * 100),
      hPct: Math.min(20, (tipo.h / rect.height) * 100),
    };

    setCampos((atuais) => [...atuais, novoCampo]);
  }

  function iniciarArrasteCampo(event, campoId) {
    event.stopPropagation();

    if (!paginaRef.current) {
      return;
    }

    const rect = paginaRef.current.getBoundingClientRect();

    setArrastandoCampo({
      campoId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    });
  }

  function moverCampo(event) {
    if (!arrastandoCampo || !paginaRef.current) {
      return;
    }

    const rect = paginaRef.current.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setCampos((atuais) =>
      atuais.map((campo) => {
        if (campo.id !== arrastandoCampo.campoId) {
          return campo;
        }

        return {
          ...campo,
          xPct: Math.max(0, Math.min(95, (x / rect.width) * 100)),
          yPct: Math.max(0, Math.min(95, (y / rect.height) * 100)),
        };
      })
    );
  }

  function finalizarArrasteCampo() {
    setArrastandoCampo(null);
  }

  function removerCampo(id) {
    setCampos((atuais) => atuais.filter((campo) => campo.id !== id));
  }

  function corDestinatario(destinatarioId) {
    const index = destinatarios.findIndex((dest) => dest.id === destinatarioId);

    const cores = [
      "border-cyan-400 bg-cyan-100/80 text-cyan-950",
      "border-purple-400 bg-purple-100/80 text-purple-950",
      "border-emerald-400 bg-emerald-100/80 text-emerald-950",
      "border-amber-400 bg-amber-100/80 text-amber-950",
    ];

    return cores[index % cores.length] || cores[0];
  }

  async function gerarPdfPreparado() {
    setErro("");
    setMensagem("");

    if (!documentos.length) {
      setErro("Adicione pelo menos um PDF.");
      return;
    }

    if (!campos.length) {
      setErro("Adicione pelo menos um campo no documento.");
      return;
    }

    setGerando(true);

    try {
      const pdfFinal = await PDFDocument.create();
      const font = await pdfFinal.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfFinal.embedFont(StandardFonts.HelveticaBold);

      for (const doc of documentos) {
        const buffer = await doc.file.arrayBuffer();

        const pdfOrigem = await PDFDocument.load(buffer, {
          ignoreEncryption: true,
        });

        const indices = pdfOrigem.getPageIndices();
        const paginasCopiadas = await pdfFinal.copyPages(pdfOrigem, indices);

        paginasCopiadas.forEach((pagina, index) => {
          const paginaNumero = index + 1;

          const camposDaPagina = campos.filter(
            (campo) =>
              campo.documentoId === doc.id &&
              campo.pagina === paginaNumero
          );

          const { width, height } = pagina.getSize();

          camposDaPagina.forEach((campo) => {
            const x = (campo.xPct / 100) * width;
            const boxW = (campo.wPct / 100) * width;
            const boxH = (campo.hPct / 100) * height;
            const y = height - (campo.yPct / 100) * height - boxH;

            const destinatario = destinatarios.find(
              (dest) => dest.id === campo.destinatarioId
            );

            pagina.drawRectangle({
              x,
              y,
              width: boxW,
              height: boxH,
              color: rgb(0.88, 0.97, 1),
              borderColor: rgb(0.08, 0.52, 0.78),
              borderWidth: 1,
              opacity: 0.72,
            });

            pagina.drawText(campo.label, {
              x: x + 6,
              y: y + Math.max(8, boxH / 2 - 4),
              size: Math.min(10, Math.max(7, boxH * 0.28)),
              font: fontBold,
              color: rgb(0.05, 0.17, 0.3),
            });

            if (destinatario?.nome) {
              pagina.drawText(destinatario.nome, {
                x: x + 6,
                y: y + 4,
                size: 7,
                font,
                color: rgb(0.18, 0.18, 0.18),
              });
            }
          });

          pdfFinal.addPage(pagina);
        });
      }

      const bytes = await pdfFinal.save();

      baixarBlob(
        new Blob([bytes], {
          type: "application/pdf",
        }),
        `${limparNome("documento-preparado-para-assinatura")}.pdf`
      );

      setMensagem("PDF preparado com os campos de assinatura.");
    } catch (err) {
      setErro(err?.message || "Erro ao preparar PDF.");
    } finally {
      setGerando(false);
    }
  }

  const tipoAtivo = TIPOS_CAMPO.find((item) => item.id === tipoCampoAtivo);

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            Preparar assinatura
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Modelo visual inspirado no fluxo de preparação de assinatura: documentos, destinatários e campos posicionáveis.
          </p>
        </div>

        <button
          type="button"
          onClick={gerarPdfPreparado}
          disabled={gerando}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-950 text-white font-black hover:bg-slate-800 disabled:opacity-40"
        >
          {gerando ? (
            <>
              <Save size={18} className="animate-pulse" />
              Gerando...
            </>
          ) : (
            <>
              <Save size={18} />
              Gerar PDF preparado
            </>
          )}
        </button>
      </div>

      <div className="grid xl:grid-cols-[260px_1fr_340px] min-h-[720px]">
        <aside className="border-r border-slate-200 bg-slate-50 p-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700"
          >
            <UploadCloud size={18} />
            Fazer upload
          </button>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept="application/pdf,.pdf"
            onChange={selecionarDocumentos}
            className="hidden"
          />

          <div className="mt-5">
            <p className="text-xs font-black text-slate-500 uppercase">
              Documentos
            </p>

            <div className="mt-3 space-y-2">
              {documentos.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => {
                    setDocumentoAtivoId(doc.id);
                    setPaginaAtiva(1);
                  }}
                  className={`w-full text-left rounded-2xl border p-3 ${
                    documentoAtivoId === doc.id
                      ? "border-blue-400 bg-white ring-2 ring-blue-100"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <p className="font-black text-sm text-slate-900 truncate">
                    {doc.nome}
                  </p>

                  <p className="text-xs text-slate-500 mt-1">
                    {doc.paginas} página(s)
                  </p>
                </button>
              ))}

              {!documentos.length ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                  Nenhum PDF enviado.
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-black text-slate-500 uppercase">
              Campos padrão
            </p>

            <div className="mt-3 space-y-2 max-h-[430px] overflow-y-auto pr-1">
              {TIPOS_CAMPO.map((tipo) => {
                const Icon = tipo.icon;

                return (
                  <button
                    key={tipo.id}
                    type="button"
                    onClick={() => setTipoCampoAtivo(tipo.id)}
                    className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      tipoCampoAtivo === tipo.id
                        ? "border-cyan-400 bg-cyan-50 text-cyan-900"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Icon size={16} />
                    {tipo.label}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="bg-slate-100 p-5 overflow-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <p className="text-sm font-black text-slate-900">
                Campo selecionado: {tipoAtivo?.label}
              </p>

              <p className="text-xs text-slate-500">
                Clique no documento para adicionar o campo. Depois arraste para ajustar a posição.
              </p>
            </div>

            {documentoAtivo ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={paginaAtiva <= 1}
                  onClick={() => setPaginaAtiva((p) => Math.max(1, p - 1))}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold disabled:opacity-40"
                >
                  Anterior
                </button>

                <span className="text-sm font-black text-slate-700">
                  Página {paginaAtiva} de {documentoAtivo.paginas}
                </span>

                <button
                  type="button"
                  disabled={paginaAtiva >= documentoAtivo.paginas}
                  onClick={() =>
                    setPaginaAtiva((p) =>
                      Math.min(documentoAtivo.paginas, p + 1)
                    )
                  }
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            ) : null}
          </div>

          {!documentoAtivo ? (
            <div className="min-h-[560px] rounded-3xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-center p-8">
              <UploadCloud size={42} className="text-blue-600" />

              <h3 className="font-black text-slate-900 mt-4">
                Envie um PDF para preparar assinatura
              </h3>

              <p className="text-sm text-slate-500 mt-2">
                Depois do upload, você poderá posicionar assinatura, rubrica, data, nome, e-mail e outros campos.
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
              <div
                ref={paginaRef}
                onClick={adicionarCampoNaPagina}
                onMouseMove={moverCampo}
                onMouseUp={finalizarArrasteCampo}
                onMouseLeave={finalizarArrasteCampo}
                className="relative bg-white shadow-xl border border-slate-300 cursor-crosshair"
              >
                <canvas ref={canvasRef} />

                {camposPagina.map((campo) => {
                  const destinatario = destinatarios.find(
                    (dest) => dest.id === campo.destinatarioId
                  );

                  return (
                    <div
                      key={campo.id}
                      data-campo="posicionado"
                      onMouseDown={(event) => iniciarArrasteCampo(event, campo.id)}
                      className={`absolute rounded-lg border-2 px-2 py-1 text-[11px] font-black shadow-sm cursor-move select-none ${corDestinatario(
                        campo.destinatarioId
                      )}`}
                      style={{
                        left: `${campo.xPct}%`,
                        top: `${campo.yPct}%`,
                        width: `${campo.wPct}%`,
                        height: `${campo.hPct}%`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate">
                          {campo.label}
                        </span>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removerCampo(campo.id);
                          }}
                          className="shrink-0"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      {destinatario?.nome ? (
                        <p className="font-semibold text-[10px] truncate opacity-80">
                          {destinatario.nome}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {erro ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {erro}
            </div>
          ) : null}

          {mensagem ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
              {mensagem}
            </div>
          ) : null}
        </main>

        <aside className="border-l border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900">
                Destinatários
              </h3>

              <p className="text-xs text-slate-500 mt-1">
                Defina quem precisa preencher ou assinar.
              </p>
            </div>

            <button
              type="button"
              onClick={adicionarDestinatario}
              className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center"
            >
              <Plus size={17} />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {destinatarios.map((dest, index) => {
              const ativo = destinatarioAtivoId === dest.id;

              return (
                <div
                  key={dest.id}
                  className={`rounded-2xl border p-4 ${
                    ativo
                      ? "border-cyan-400 bg-cyan-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setDestinatarioAtivoId(dest.id)}
                      className="text-sm font-black text-slate-900"
                    >
                      Destinatário {index + 1}
                    </button>

                    {destinatarios.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removerDestinatario(dest.id)}
                        className="text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    ) : null}
                  </div>

                  <label className="block mt-3">
                    <span className="text-xs font-black text-slate-600">
                      Nome
                    </span>

                    <input
                      value={dest.nome}
                      onChange={(event) =>
                        atualizarDestinatario(dest.id, {
                          nome: event.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                      placeholder="Nome do destinatário"
                    />
                  </label>

                  <label className="block mt-3">
                    <span className="text-xs font-black text-slate-600">
                      E-mail
                    </span>

                    <input
                      value={dest.email}
                      onChange={(event) =>
                        atualizarDestinatario(dest.id, {
                          email: event.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                      placeholder="email@empresa.com"
                    />
                  </label>

                  <label className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-600">
                    <input
                      type="checkbox"
                      checked={dest.assinaturaNecessaria}
                      onChange={(event) =>
                        atualizarDestinatario(dest.id, {
                          assinaturaNecessaria: event.target.checked,
                        })
                      }
                    />
                    A assinatura é necessária
                  </label>
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="flex items-center gap-2 font-black text-slate-900">
              <MousePointer2 size={16} />
              Como usar
            </div>

            <p className="mt-2">
              Escolha um destinatário, selecione um campo na lateral esquerda e clique na página para posicionar.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
