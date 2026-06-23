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

function limparNomeArquivo(nome) {
  const nomeLimpo = String(
    nome || "PDF unificado"
  )
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return nomeLimpo || "PDF unificado";
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
    pdfOrigem.getPageIndices();

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

const categoriasFiltro = [
  {
    id: "todos",
    label: "Todas",
  },
  {
    id: "organizacao",
    label: "Organização",
  },
  {
    id: "conversao",
    label: "Conversão",
  },
  {
    id: "edicao",
    label: "Edição",
  },
  {
    id: "seguranca",
    label: "Segurança",
  },
  {
    id: "ia",
    label: "IA",
  },
  {
    id: "backend",
    label: "Backend",
  },
];

const ferramentas = [
  {
    id: "juntar-pdf",
    titulo: "Juntar PDF",
    descricao:
      "Unir vários PDFs em um único arquivo final.",
    categoria: "organizacao",
    icone: Merge,
    status: "Ativo",
    modo: "Navegador",
    recursos: [
      "Selecionar vários PDFs",
      "Reordenar arquivos",
      "Remover arquivos",
      "Baixar PDF unificado",
    ],
  },
  {
    id: "dividir-pdf",
    titulo: "Dividir PDF",
    descricao:
      "Separar um PDF em arquivos menores.",
    categoria: "organizacao",
    icone: Scissors,
    status: "Em breve",
    modo: "Navegador",
    recursos: [
      "Dividir por intervalo",
      "Separar página por página",
      "Gerar vários PDFs",
    ],
  },
  {
    id: "comprimir-pdf",
    titulo: "Comprimir PDF",
    descricao:
      "Reduzir o tamanho do PDF para envio por e-mail.",
    categoria: "backend",
    icone: FileArchive,
    status: "Backend",
    modo: "Backend",
    recursos: [
      "Compressão leve",
      "Compressão média",
      "Compressão forte",
    ],
  },
  {
    id: "editar-pdf",
    titulo: "Editar PDF",
    descricao:
      "Adicionar textos, marcações, formas e observações.",
    categoria: "edicao",
    icone: Wand2,
    status: "Em breve",
    modo: "Navegador",
    recursos: [
      "Adicionar texto",
      "Adicionar formas",
      "Inserir observações",
    ],
  },
  {
    id: "assinar-pdf",
    titulo: "Assinar PDF",
    descricao:
      "Inserir assinatura simples em documentos PDF.",
    categoria: "edicao",
    icone: FileText,
    status: "Em breve",
    modo: "Navegador",
    recursos: [
      "Desenhar assinatura",
      "Inserir imagem da assinatura",
      "Posicionar assinatura",
    ],
  },
  {
    id: "conversor-pdf",
    titulo: "Conversor PDF",
    descricao:
      "Central para converter documentos para outros formatos.",
    categoria: "conversao",
    icone: FileArchive,
    status: "Backend",
    modo: "Backend",
    recursos: [
      "PDF para Word",
      "PDF para Excel",
      "PDF para imagem",
      "Office para PDF",
    ],
  },
  {
    id: "imagens-para-pdf",
    titulo: "Imagens para PDF",
    descricao:
      "Transformar JPG, PNG e imagens em um PDF.",
    categoria: "conversao",
    icone: FileImage,
    status: "Em breve",
    modo: "Navegador",
    recursos: [
      "JPG para PDF",
      "PNG para PDF",
      "Várias imagens em um PDF",
    ],
  },
  {
    id: "pdf-para-imagens",
    titulo: "PDF para imagens",
    descricao:
      "Exportar páginas do PDF como imagens.",
    categoria: "conversao",
    icone: FileImage,
    status: "Backend",
    modo: "Backend",
    recursos: [
      "PDF para PNG",
      "PDF para JPG",
      "Exportar página específica",
    ],
  },
  {
    id: "extrair-imagens",
    titulo: "Extrair imagens",
    descricao:
      "Capturar imagens existentes dentro de arquivos PDF.",
    categoria: "conversao",
    icone: FileImage,
    status: "Backend",
    modo: "Backend",
    recursos: [
      "Extrair imagens internas",
      "Baixar imagens separadas",
      "Compactar em ZIP",
    ],
  },
  {
    id: "proteger-pdf",
    titulo: "Proteger PDF",
    descricao:
      "Adicionar senha e restrições ao arquivo PDF.",
    categoria: "seguranca",
    icone: Shield,
    status: "Backend",
    modo: "Backend",
    recursos: [
      "Senha de abertura",
      "Senha de edição",
      "Controle de impressão",
    ],
  },
  {
    id: "desbloquear-pdf",
    titulo: "Desbloquear PDF",
    descricao:
      "Remover restrições de PDFs quando permitido.",
    categoria: "seguranca",
    icone: Shield,
    status: "Backend",
    modo: "Backend",
    recursos: [
      "Remover senha conhecida",
      "Remover restrições simples",
      "Gerar PDF liberado",
    ],
  },
  {
    id: "rotacionar-paginas",
    titulo: "Rotacionar páginas",
    descricao:
      "Girar páginas do PDF para esquerda ou direita.",
    categoria: "organizacao",
    icone: RotateCw,
    status: "Em breve",
    modo: "Navegador",
    recursos: [
      "Girar 90 graus",
      "Girar 180 graus",
      "Aplicar em todas as páginas",
    ],
  },
  {
    id: "remover-paginas",
    titulo: "Remover páginas",
    descricao:
      "Excluir páginas específicas de um PDF.",
    categoria: "organizacao",
    icone: Trash2,
    status: "Em breve",
    modo: "Navegador",
    recursos: [
      "Selecionar páginas",
      "Remover páginas indesejadas",
      "Baixar PDF final",
    ],
  },
  {
    id: "extrair-paginas",
    titulo: "Extrair páginas",
    descricao:
      "Criar um novo PDF apenas com páginas escolhidas.",
    categoria: "organizacao",
    icone: Scissors,
    status: "Em breve",
    modo: "Navegador",
    recursos: [
      "Extrair página única",
      "Extrair intervalo",
      "Gerar PDF separado",
    ],
  },
  {
    id: "reorganizar-paginas",
    titulo: "Reorganizar páginas",
    descricao:
      "Alterar a ordem das páginas de forma visual.",
    categoria: "organizacao",
    icone: Files,
    status: "Em breve",
    modo: "Navegador",
    recursos: [
      "Visualizar páginas",
      "Arrastar para reorganizar",
      "Salvar nova ordem",
    ],
  },
  {
    id: "marca-dagua",
    titulo: "Marca d’água",
    descricao:
      "Adicionar texto ou imagem de marca d’água no PDF.",
    categoria: "edicao",
    icone: Wand2,
    status: "Em breve",
    modo: "Navegador",
    recursos: [
      "Texto como marca d’água",
      "Imagem como marca d’água",
      "Controle de posição",
    ],
  },
  {
    id: "numeracao",
    titulo: "Numeração",
    descricao:
      "Adicionar número de página no documento PDF.",
    categoria: "edicao",
    icone: FileText,
    status: "Em breve",
    modo: "Navegador",
    recursos: [
      "Numeração no rodapé",
      "Numeração no cabeçalho",
      "Prefixo personalizado",
    ],
  },
  {
    id: "ocr",
    titulo: "OCR",
    descricao:
      "Reconhecer texto em PDFs ou imagens.",
    categoria: "ia",
    icone: Brain,
    status: "IA",
    modo: "Backend/IA",
    recursos: [
      "Ler PDF escaneado",
      "Extrair texto",
      "Gerar texto pesquisável",
    ],
  },
  {
    id: "ia-para-pdf",
    titulo: "IA para PDF",
    descricao:
      "Resumir, traduzir e conversar com documentos.",
    categoria: "ia",
    icone: Brain,
    status: "IA",
    modo: "Backend/IA",
    recursos: [
      "Resumo automático",
      "Perguntar ao PDF",
      "Traduzir conteúdo",
    ],
  },
  {
    id: "comprimir-pdf-real",
    titulo: "Comprimir PDF de verdade",
    descricao:
      "Compressão avançada com redução real de peso.",
    categoria: "backend",
    icone: FileArchive,
    status: "Backend",
    modo: "Backend",
    recursos: [
      "Redução de imagens",
      "Otimização interna",
      "Controle de qualidade",
    ],
  },
  {
    id: "ocr-escaneado",
    titulo: "OCR de PDF escaneado",
    descricao:
      "Reconhecimento de caracteres em documentos digitalizados.",
    categoria: "ia",
    icone: Brain,
    status: "IA",
    modo: "Backend/IA",
    recursos: [
      "PDF escaneado",
      "Imagem para texto",
      "Texto pesquisável",
    ],
  },
  {
    id: "pdf-para-word",
    titulo: "PDF para Word",
    descricao:
      "Converter PDF para documento editável.",
    categoria: "backend",
    icone: FileText,
    status: "Backend",
    modo: "Backend",
    recursos: [
      "PDF para DOCX",
      "Preservar texto",
      "Preservar estrutura",
    ],
  },
  {
    id: "pdf-para-excel",
    titulo: "PDF para Excel",
    descricao:
      "Converter tabelas de PDF para planilha.",
    categoria: "backend",
    icone: FileText,
    status: "Backend",
    modo: "Backend",
    recursos: [
      "Extrair tabelas",
      "Gerar XLSX",
      "Separar abas",
    ],
  },
  {
    id: "pdf-para-powerpoint",
    titulo: "PDF para PowerPoint",
    descricao:
      "Converter PDF em apresentação.",
    categoria: "backend",
    icone: FileText,
    status: "Backend",
    modo: "Backend",
    recursos: [
      "Cada página como slide",
      "Exportar PPTX",
      "Preservar layout visual",
    ],
  },
  {
    id: "office-para-pdf",
    titulo: "Word / Excel / PowerPoint para PDF",
    descricao:
      "Converter arquivos Office em PDF.",
    categoria: "backend",
    icone: FileArchive,
    status: "Backend",
    modo: "Backend",
    recursos: [
      "Word para PDF",
      "Excel para PDF",
      "PowerPoint para PDF",
    ],
  },
  {
    id: "desbloquear-protegido",
    titulo: "Desbloquear PDF protegido",
    descricao:
      "Remover proteção de PDF mediante senha correta.",
    categoria: "seguranca",
    icone: Shield,
    status: "Backend",
    modo: "Backend",
    recursos: [
      "Informar senha",
      "Abrir PDF protegido",
      "Gerar cópia desbloqueada",
    ],
  },
  {
    id: "comparar-pdfs",
    titulo: "Comparar PDFs",
    descricao:
      "Comparar dois documentos e identificar diferenças.",
    categoria: "backend",
    icone: Files,
    status: "Backend",
    modo: "Backend",
    recursos: [
      "Comparar texto",
      "Comparar páginas",
      "Relatório de diferenças",
    ],
  },
  {
    id: "censurar-pdf",
    titulo: "Censurar PDF",
    descricao:
      "Ocultar informações sensíveis do documento.",
    categoria: "backend",
    icone: Shield,
    status: "Backend",
    modo: "Backend",
    recursos: [
      "Tarjar texto",
      "Remover visualmente informações",
      "Gerar PDF censurado",
    ],
  },
  {
    id: "otimizar-web",
    titulo: "Otimizar PDF para web",
    descricao:
      "Preparar PDF para abrir mais rápido online.",
    categoria: "backend",
    icone: FileArchive,
    status: "Backend",
    modo: "Backend",
    recursos: [
      "Otimização de carregamento",
      "Redução estrutural",
      "PDF mais leve para web",
    ],
  },
];

function statusClasses(status) {
  if (status === "Ativo") {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }

  if (status === "IA") {
    return "bg-purple-50 text-purple-700 border-purple-100";
  }

  if (status === "Backend") {
    return "bg-amber-50 text-amber-700 border-amber-100";
  }

  return "bg-slate-100 text-slate-600 border-slate-200";
}

function categoriaLabel(categoria) {
  const item =
    categoriasFiltro.find(
      (cat) => cat.id === categoria
    );

  return item?.label || categoria;
}

export default function FerramentasPDF() {
  const inputRef =
    useRef(null);

  const [
    ferramentaAtiva,
    setFerramentaAtiva,
  ] = useState("juntar-pdf");

  const [
    filtroAtivo,
    setFiltroAtivo,
  ] = useState("todos");

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
    arrastando,
    setArrastando,
  ] = useState(false);

  const [
    nomeSaida,
    setNomeSaida,
  ] = useState(
    "PDF unificado"
  );

  const ferramentaSelecionada =
    useMemo(() => {
      return (
        ferramentas.find(
          (item) =>
            item.id ===
            ferramentaAtiva
        ) || ferramentas[0]
      );
    }, [ferramentaAtiva]);

  const ferramentasFiltradas =
    useMemo(() => {
      if (filtroAtivo === "todos") {
        return ferramentas;
      }

      return ferramentas.filter(
        (item) =>
          item.categoria ===
          filtroAtivo
      );
    }, [filtroAtivo]);

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

  const arquivosValidos =
    useMemo(() => {
      return arquivos.filter(
        (item) => !item.invalido
      );
    }, [arquivos]);

  function abrirSeletorJuntar() {
    setFerramentaAtiva(
      "juntar-pdf"
    );

    window.setTimeout(() => {
      inputRef.current?.click();
    }, 50);
  }

  async function processarArquivos(files) {
    const listaFiles =
      Array.from(files || []);

    if (!listaFiles.length) {
      return;
    }

    setErro("");
    setMensagem("");
    setCarregando(true);

    try {
      const novos = [];

      for (const file of listaFiles) {
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
              "Arquivo ignorado: envie somente PDF nesta ferramenta.",
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

  async function selecionarArquivos(event) {
    const files =
      event.target.files || [];

    event.target.value = "";

    await processarArquivos(files);
  }

  async function soltarArquivos(event) {
    event.preventDefault();
    event.stopPropagation();

    setArrastando(false);

    const files =
      event.dataTransfer?.files || [];

    await processarArquivos(files);
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
          (item) =>
            item.id === id
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

    if (arquivosValidos.length < 2) {
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

      for (const item of arquivosValidos) {
        const paginas =
          await adicionarPdfAoDocumento(
            pdfFinal,
            item.file
          );

        paginasAdicionadas += paginas;
      }

      if (
        paginasAdicionadas === 0
      ) {
        throw new Error(
          "Nenhuma página válida foi encontrada nos PDFs selecionados."
        );
      }

      const bytes =
        await pdfFinal.save();

      const blob =
        new Blob([bytes], {
          type: "application/pdf",
        });

      baixarBlob(
        blob,
        `${limparNomeArquivo(
          nomeSaida
        )}.pdf`
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

  function renderPainelJuntar() {
    return (
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
              onClick={abrirSeletorJuntar}
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
          onChange={selecionarArquivos}
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
            onClick={abrirSeletorJuntar}
            onDragOver={(event) => {
              event.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() =>
              setArrastando(false)
            }
            onDrop={soltarArquivos}
            className={`w-full mt-5 border-2 border-dashed rounded-[1.5rem] p-10 md:p-14 text-center transition ${
              arrastando
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/30"
            }`}
          >
            <UploadCloud
              size={42}
              className="mx-auto text-blue-600"
            />

            <h3 className="font-black text-slate-900 mt-4">
              Arraste ou selecione PDFs
            </h3>

            <p className="text-sm text-slate-500 mt-2">
              Esta ferramenta junta arquivos PDF em um único documento.
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
                      disabled={index === 0}
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
    );
  }

  function renderPainelEmBreve() {
    const Icone =
      ferramentaSelecionada.icone;

    return (
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Icone size={28} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black text-slate-900">
                {ferramentaSelecionada.titulo}
              </h2>

              <span
                className={`text-xs font-black px-3 py-1 rounded-full border ${statusClasses(
                  ferramentaSelecionada.status
                )}`}
              >
                {ferramentaSelecionada.status}
              </span>
            </div>

            <p className="text-sm text-slate-500 mt-2 max-w-3xl">
              {ferramentaSelecionada.descricao}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6">
          <p className="text-sm font-black text-slate-900">
            Ferramenta cadastrada no sistema
          </p>

          <p className="text-sm text-slate-500 mt-2">
            Esta opção já aparece na central de ferramentas. A próxima etapa é ativar o processamento dela.
          </p>

          <div className="mt-5 grid md:grid-cols-3 gap-3">
            {ferramentaSelecionada.recursos.map(
              (recurso) => (
                <div
                  key={recurso}
                  className="rounded-2xl bg-white border border-slate-200 p-4 text-sm text-slate-600 flex items-center gap-2"
                >
                  <CheckCircle2
                    size={16}
                    className="text-blue-600 shrink-0"
                  />
                  {recurso}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderPainelLateral() {
    if (
      ferramentaSelecionada.id ===
      "juntar-pdf"
    ) {
      return (
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
              arquivosValidos.length < 2
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
        </aside>
      );
    }

    return (
      <aside className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-5 md:p-6 h-fit">
        <h3 className="font-black text-slate-900">
          Status da ferramenta
        </h3>

        <div className="mt-5 space-y-3">
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-xs text-slate-500">
              Categoria
            </p>

            <p className="text-base font-black text-slate-900 mt-1">
              {categoriaLabel(
                ferramentaSelecionada.categoria
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-xs text-slate-500">
              Processamento
            </p>

            <p className="text-base font-black text-slate-900 mt-1">
              {ferramentaSelecionada.modo}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-xs text-slate-500">
              Situação
            </p>

            <p className="text-base font-black text-slate-900 mt-1">
              {ferramentaSelecionada.status}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          Essa ferramenta já está no menu. Vamos ativar uma por uma para não quebrar o build.
        </div>
      </aside>
    );
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
                Área para juntar, dividir, comprimir, converter, editar, proteger e analisar PDFs dentro do sistema.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={abrirSeletorJuntar}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition"
          >
            <UploadCloud size={18} />
            Selecionar PDFs
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="rounded-[1.6rem] bg-white border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500">
            Total de ferramentas
          </p>

          <p className="text-3xl font-black text-slate-900 mt-2">
            {ferramentas.length}
          </p>
        </div>

        <div className="rounded-[1.6rem] bg-white border border-emerald-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500">
            Ativas agora
          </p>

          <p className="text-3xl font-black text-emerald-700 mt-2">
            {
              ferramentas.filter(
                (item) =>
                  item.status ===
                  "Ativo"
              ).length
            }
          </p>
        </div>

        <div className="rounded-[1.6rem] bg-white border border-amber-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500">
            Precisam de backend
          </p>

          <p className="text-3xl font-black text-amber-700 mt-2">
            {
              ferramentas.filter(
                (item) =>
                  item.status ===
                  "Backend"
              ).length
            }
          </p>
        </div>

        <div className="rounded-[1.6rem] bg-white border border-purple-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500">
            IA / OCR
          </p>

          <p className="text-3xl font-black text-purple-700 mt-2">
            {
              ferramentas.filter(
                (item) =>
                  item.status ===
                  "IA"
              ).length
            }
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="font-black text-slate-900">
              Todas as ferramentas
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Clique em uma ferramenta para abrir o painel correspondente.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {categoriasFiltro.map(
              (categoria) => (
                <button
                  key={categoria.id}
                  type="button"
                  onClick={() =>
                    setFiltroAtivo(
                      categoria.id
                    )
                  }
                  className={`px-4 py-2 rounded-xl text-xs font-black border transition ${
                    filtroAtivo ===
                    categoria.id
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {categoria.label}
                </button>
              )
            )}
          </div>
        </div>

        <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {ferramentasFiltradas.map(
            (item) => {
              const Icone =
                item.icone;

              const ativo =
                ferramentaAtiva ===
                item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setFerramentaAtiva(
                      item.id
                    )
                  }
                  className={`relative text-left rounded-2xl border p-4 min-h-[118px] transition hover:-translate-y-0.5 hover:shadow-md ${
                    ativo
                      ? "border-blue-400 bg-blue-50 ring-2 ring-blue-100"
                      : "border-slate-200 bg-white hover:border-blue-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                        ativo
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Icone size={20} />
                    </div>

                    <span
                      className={`text-[10px] font-black px-2 py-1 rounded-full border ${statusClasses(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <p className="font-black text-slate-900 mt-3 text-sm leading-tight">
                    {item.titulo}
                  </p>

                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {item.descricao}
                  </p>
                </button>
              );
            }
          )}
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_360px] gap-6">
        {ferramentaSelecionada.id ===
        "juntar-pdf"
          ? renderPainelJuntar()
          : renderPainelEmBreve()}

        {renderPainelLateral()}
      </div>
    </div>
  );
}
