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
  StandardFonts,
  degrees,
  rgb,
} from "pdf-lib";
import JSZip from "jszip";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

function formatarTamanho(bytes = 0) {
  if (!bytes) {
    return "0 KB";
  }

  const unidades = ["B", "KB", "MB", "GB"];

  let tamanho = bytes;
  let indice = 0;

  while (tamanho >= 1024 && indice < unidades.length - 1) {
    tamanho = tamanho / 1024;
    indice += 1;
  }

  return `${tamanho.toFixed(tamanho >= 10 ? 1 : 2)} ${unidades[indice]}`;
}

function gerarIdArquivo() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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

function limparNomeArquivo(nome) {
  const nomeLimpo = String(nome || "Arquivo")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return nomeLimpo || "Arquivo";
}

function removerExtensao(nome = "") {
  return String(nome).replace(/\.[^/.]+$/, "");
}

function canvasParaBlob(canvas, tipo = "image/png") {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Não foi possível gerar a imagem da página."));
      }
    }, tipo);
  });
}

function parsePaginas(texto, total, permitirVazio = true) {
  const valor = String(texto || "").trim();

  if (!valor) {
    return permitirVazio
      ? Array.from({ length: total }, (_, index) => index)
      : [];
  }

  const partes = valor
    .split(",")
    .map((parte) => parte.trim())
    .filter(Boolean);

  const resultado = [];

  for (const parte of partes) {
    if (parte.includes("-")) {
      const [inicioRaw, fimRaw] = parte.split("-");
      const inicio = Number(inicioRaw);
      const fim = Number(fimRaw);

      if (!Number.isFinite(inicio) || !Number.isFinite(fim)) {
        continue;
      }

      const menor = Math.max(1, Math.min(inicio, fim));
      const maior = Math.min(total, Math.max(inicio, fim));

      for (let pagina = menor; pagina <= maior; pagina += 1) {
        resultado.push(pagina - 1);
      }

      continue;
    }

    const pagina = Number(parte);

    if (
      Number.isFinite(pagina) &&
      pagina >= 1 &&
      pagina <= total
    ) {
      resultado.push(pagina - 1);
    }
  }

  return Array.from(new Set(resultado));
}

async function lerPaginasPdf(file) {
  const buffer = await file.arrayBuffer();

  const pdf = await PDFDocument.load(buffer, {
    ignoreEncryption: true,
  });

  return pdf.getPageCount();
}

async function carregarPdf(file) {
  const buffer = await file.arrayBuffer();

  return PDFDocument.load(buffer, {
    ignoreEncryption: true,
  });
}

async function adicionarPdfAoDocumento(pdfFinal, file) {
  const pdfOrigem = await carregarPdf(file);
  const indices = pdfOrigem.getPageIndices();

  const paginas = await pdfFinal.copyPages(pdfOrigem, indices);

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
    descricao: "Unir vários PDFs em um único arquivo final.",
    categoria: "organizacao",
    icone: Merge,
    status: "Ativo",
    tipoArquivo: "pdf",
    modo: "Navegador",
  },
  {
    id: "dividir-pdf",
    titulo: "Dividir PDF",
    descricao: "Separar um PDF em arquivos individuais por página.",
    categoria: "organizacao",
    icone: Scissors,
    status: "Ativo",
    tipoArquivo: "pdf",
    modo: "Navegador",
  },
  {
    id: "extrair-paginas",
    titulo: "Extrair páginas",
    descricao: "Criar um novo PDF apenas com páginas escolhidas.",
    categoria: "organizacao",
    icone: Scissors,
    status: "Ativo",
    tipoArquivo: "pdf",
    modo: "Navegador",
  },
  {
    id: "remover-paginas",
    titulo: "Remover páginas",
    descricao: "Excluir páginas específicas de um PDF.",
    categoria: "organizacao",
    icone: Trash2,
    status: "Ativo",
    tipoArquivo: "pdf",
    modo: "Navegador",
  },
  {
    id: "reorganizar-paginas",
    titulo: "Reorganizar páginas",
    descricao: "Gerar um PDF com as páginas em nova ordem.",
    categoria: "organizacao",
    icone: Files,
    status: "Ativo",
    tipoArquivo: "pdf",
    modo: "Navegador",
  },
  {
    id: "rotacionar-paginas",
    titulo: "Rotacionar páginas",
    descricao: "Girar páginas do PDF para esquerda ou direita.",
    categoria: "organizacao",
    icone: RotateCw,
    status: "Ativo",
    tipoArquivo: "pdf",
    modo: "Navegador",
  },
  {
    id: "imagens-para-pdf",
    titulo: "Imagens para PDF",
    descricao: "Transformar JPG e PNG em um único PDF.",
    categoria: "conversao",
    icone: FileImage,
    status: "Ativo",
    tipoArquivo: "imagem",
    modo: "Navegador",
  },
  {
    id: "pdf-para-imagens",
    titulo: "PDF para imagens",
    descricao: "Exportar páginas do PDF como imagens PNG.",
    categoria: "conversao",
    icone: FileImage,
    status: "Ativo",
    tipoArquivo: "pdf",
    modo: "Navegador",
  },
  {
    id: "editar-pdf",
    titulo: "Editar PDF",
    descricao: "Adicionar texto simples em páginas do PDF.",
    categoria: "edicao",
    icone: Wand2,
    status: "Ativo",
    tipoArquivo: "pdf",
    modo: "Navegador",
  },
  {
    id: "assinar-pdf",
    titulo: "Assinar PDF",
    descricao: "Inserir assinatura textual no documento.",
    categoria: "edicao",
    icone: FileText,
    status: "Ativo",
    tipoArquivo: "pdf",
    modo: "Navegador",
  },
  {
    id: "marca-dagua",
    titulo: "Marca d’água",
    descricao: "Adicionar texto de marca d’água ao PDF.",
    categoria: "edicao",
    icone: Wand2,
    status: "Ativo",
    tipoArquivo: "pdf",
    modo: "Navegador",
  },
  {
    id: "numeracao",
    titulo: "Numeração",
    descricao: "Adicionar numeração de páginas no PDF.",
    categoria: "edicao",
    icone: FileText,
    status: "Ativo",
    tipoArquivo: "pdf",
    modo: "Navegador",
  },
  {
    id: "comprimir-pdf",
    titulo: "Comprimir PDF",
    descricao: "Reduzir tamanho do PDF com processamento avançado.",
    categoria: "backend",
    icone: FileArchive,
    status: "Backend",
    tipoArquivo: "pdf",
    modo: "Backend",
  },
  {
    id: "comprimir-pdf-real",
    titulo: "Comprimir PDF de verdade",
    descricao: "Compressão real com otimização de imagens e estrutura.",
    categoria: "backend",
    icone: FileArchive,
    status: "Backend",
    tipoArquivo: "pdf",
    modo: "Backend",
  },
  {
    id: "conversor-pdf",
    titulo: "Conversor PDF",
    descricao: "Central de conversões entre PDF, Office e imagem.",
    categoria: "backend",
    icone: FileArchive,
    status: "Backend",
    tipoArquivo: "pdf",
    modo: "Backend",
  },
  {
    id: "pdf-para-word",
    titulo: "PDF para Word",
    descricao: "Converter PDF para DOCX editável.",
    categoria: "backend",
    icone: FileText,
    status: "Backend",
    tipoArquivo: "pdf",
    modo: "Backend",
  },
  {
    id: "pdf-para-excel",
    titulo: "PDF para Excel",
    descricao: "Extrair tabelas de PDF para XLSX.",
    categoria: "backend",
    icone: FileText,
    status: "Backend",
    tipoArquivo: "pdf",
    modo: "Backend",
  },
  {
    id: "pdf-para-powerpoint",
    titulo: "PDF para PowerPoint",
    descricao: "Transformar páginas do PDF em slides.",
    categoria: "backend",
    icone: FileText,
    status: "Backend",
    tipoArquivo: "pdf",
    modo: "Backend",
  },
  {
    id: "office-para-pdf",
    titulo: "Word / Excel / PowerPoint para PDF",
    descricao: "Converter documentos Office em PDF.",
    categoria: "backend",
    icone: FileArchive,
    status: "Backend",
    tipoArquivo: "office",
    modo: "Backend",
  },
  {
    id: "extrair-imagens",
    titulo: "Extrair imagens",
    descricao: "Extrair imagens internas de arquivos PDF.",
    categoria: "backend",
    icone: FileImage,
    status: "Backend",
    tipoArquivo: "pdf",
    modo: "Backend",
  },
  {
    id: "proteger-pdf",
    titulo: "Proteger PDF",
    descricao: "Adicionar senha e proteção ao documento.",
    categoria: "seguranca",
    icone: Shield,
    status: "Backend",
    tipoArquivo: "pdf",
    modo: "Backend",
  },
  {
    id: "desbloquear-pdf",
    titulo: "Desbloquear PDF",
    descricao: "Remover proteção simples mediante senha correta.",
    categoria: "seguranca",
    icone: Shield,
    status: "Backend",
    tipoArquivo: "pdf",
    modo: "Backend",
  },
  {
    id: "desbloquear-protegido",
    titulo: "Desbloquear PDF protegido",
    descricao: "Abrir e gerar cópia desbloqueada com senha válida.",
    categoria: "seguranca",
    icone: Shield,
    status: "Backend",
    tipoArquivo: "pdf",
    modo: "Backend",
  },
  {
    id: "comparar-pdfs",
    titulo: "Comparar PDFs",
    descricao: "Comparar dois arquivos e apontar diferenças.",
    categoria: "backend",
    icone: Files,
    status: "Backend",
    tipoArquivo: "pdf",
    modo: "Backend",
  },
  {
    id: "censurar-pdf",
    titulo: "Censurar PDF",
    descricao: "Ocultar informações sensíveis no documento.",
    categoria: "backend",
    icone: Shield,
    status: "Backend",
    tipoArquivo: "pdf",
    modo: "Backend",
  },
  {
    id: "otimizar-web",
    titulo: "Otimizar PDF para web",
    descricao: "Preparar PDF para abrir mais rápido online.",
    categoria: "backend",
    icone: FileArchive,
    status: "Backend",
    tipoArquivo: "pdf",
    modo: "Backend",
  },
  {
    id: "ocr",
    titulo: "OCR",
    descricao: "Reconhecer texto em PDF ou imagem.",
    categoria: "ia",
    icone: Brain,
    status: "IA",
    tipoArquivo: "pdf",
    modo: "Backend/IA",
  },
  {
    id: "ocr-escaneado",
    titulo: "OCR de PDF escaneado",
    descricao: "Ler documentos digitalizados e gerar texto pesquisável.",
    categoria: "ia",
    icone: Brain,
    status: "IA",
    tipoArquivo: "pdf",
    modo: "Backend/IA",
  },
  {
    id: "ia-para-pdf",
    titulo: "IA para PDF",
    descricao: "Resumir, traduzir e conversar com documentos.",
    categoria: "ia",
    icone: Brain,
    status: "IA",
    tipoArquivo: "pdf",
    modo: "Backend/IA",
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

export default function FerramentasPDF() {
  const inputRef = useRef(null);

  const [ferramentaAtiva, setFerramentaAtiva] = useState("juntar-pdf");
  const [filtroAtivo, setFiltroAtivo] = useState("todos");

  const [arquivos, setArquivos] = useState([]);
  const [imagens, setImagens] = useState([]);

  const [carregando, setCarregando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [arrastando, setArrastando] = useState(false);

  const [nomeSaida, setNomeSaida] = useState("PDF unificado");
  const [paginasTexto, setPaginasTexto] = useState("");
  const [ordemPaginas, setOrdemPaginas] = useState("");
  const [grausRotacao, setGrausRotacao] = useState(90);
  const [textoLivre, setTextoLivre] = useState("Texto de exemplo");
  const [assinaturaTexto, setAssinaturaTexto] = useState("Assinado digitalmente");
  const [marcaDaguaTexto, setMarcaDaguaTexto] = useState("CONFIDENCIAL");
  const [posicaoX, setPosicaoX] = useState(50);
  const [posicaoY, setPosicaoY] = useState(50);
  const [tamanhoFonte, setTamanhoFonte] = useState(14);

  const ferramentaSelecionada = useMemo(() => {
    return (
      ferramentas.find((item) => item.id === ferramentaAtiva) ||
      ferramentas[0]
    );
  }, [ferramentaAtiva]);

  const ferramentasFiltradas = useMemo(() => {
    if (filtroAtivo === "todos") {
      return ferramentas;
    }

    return ferramentas.filter((item) => item.categoria === filtroAtivo);
  }, [filtroAtivo]);

  const arquivosValidos = useMemo(() => {
    return arquivos.filter((item) => !item.invalido);
  }, [arquivos]);

  const imagensValidas = useMemo(() => {
    return imagens.filter((item) => !item.invalido);
  }, [imagens]);

  const totalPaginas = useMemo(() => {
    return arquivos.reduce(
      (total, item) => total + Number(item.paginas || 0),
      0
    );
  }, [arquivos]);

  const tamanhoTotal = useMemo(() => {
    const totalPdf = arquivos.reduce(
      (total, item) => total + Number(item.tamanho || 0),
      0
    );

    const totalImagens = imagens.reduce(
      (total, item) => total + Number(item.tamanho || 0),
      0
    );

    return totalPdf + totalImagens;
  }, [arquivos, imagens]);

  const usaImagem = ferramentaSelecionada.tipoArquivo === "imagem";
  const usaBackend = ferramentaSelecionada.status === "Backend" || ferramentaSelecionada.status === "IA";

  function selecionarFerramenta(id) {
    setFerramentaAtiva(id);
    setErro("");
    setMensagem("");
    setArrastando(false);
  }

  function abrirSeletor() {
    if (usaBackend) {
      setErro("Essa ferramenta precisa do backend. O botão já está criado, mas o processamento será ativado na API.");
      return;
    }

    window.setTimeout(() => {
      inputRef.current?.click();
    }, 50);
  }

  async function processarArquivos(files) {
    const listaFiles = Array.from(files || []);

    if (!listaFiles.length) {
      return;
    }

    setErro("");
    setMensagem("");
    setCarregando(true);

    try {
      if (usaImagem) {
        const novos = [];

        for (const file of listaFiles) {
          const nome = file.name.toLowerCase();
          const ehImagem =
            file.type === "image/png" ||
            file.type === "image/jpeg" ||
            nome.endsWith(".png") ||
            nome.endsWith(".jpg") ||
            nome.endsWith(".jpeg");

          novos.push({
            id: gerarIdArquivo(),
            file,
            nome: file.name,
            tamanho: file.size,
            invalido: !ehImagem,
            erro: ehImagem
              ? ""
              : "Imagem ignorada: envie somente JPG ou PNG.",
          });
        }

        setImagens((atuais) => [...atuais, ...novos]);
        return;
      }

      const novos = [];

      for (const file of listaFiles) {
        const ehPdf =
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf");

        if (!ehPdf) {
          novos.push({
            id: gerarIdArquivo(),
            file,
            nome: file.name,
            tamanho: file.size,
            paginas: 0,
            invalido: true,
            erro: "Arquivo ignorado: envie somente PDF nesta ferramenta.",
          });

          continue;
        }

        let paginas = 0;
        let invalido = false;
        let erroArquivo = "";

        try {
          paginas = await lerPaginasPdf(file);
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

      setArquivos((atuais) => [...atuais, ...novos]);
    } catch (err) {
      setErro(err?.message || "Erro ao carregar os arquivos.");
    } finally {
      setCarregando(false);
    }
  }

  async function selecionarArquivos(event) {
    const files = event.target.files || [];

    event.target.value = "";

    await processarArquivos(files);
  }

  async function soltarArquivos(event) {
    event.preventDefault();
    event.stopPropagation();

    setArrastando(false);

    const files = event.dataTransfer?.files || [];

    await processarArquivos(files);
  }

  function removerArquivo(id) {
    if (usaImagem) {
      setImagens((atuais) => atuais.filter((item) => item.id !== id));
      return;
    }

    setArquivos((atuais) => atuais.filter((item) => item.id !== id));
  }

  function limparArquivos() {
    setArquivos([]);
    setImagens([]);
    setErro("");
    setMensagem("");
  }

  function moverArquivo(id, direcao) {
    const setter = usaImagem ? setImagens : setArquivos;

    setter((atuais) => {
      const lista = [...atuais];
      const indice = lista.findIndex((item) => item.id === id);

      if (indice < 0) {
        return lista;
      }

      const novoIndice = direcao === "cima" ? indice - 1 : indice + 1;

      if (novoIndice < 0 || novoIndice >= lista.length) {
        return lista;
      }

      const item = lista[indice];

      lista.splice(indice, 1);
      lista.splice(novoIndice, 0, item);

      return lista;
    });
  }

  function obterPrimeiroPdf() {
    if (!arquivosValidos.length) {
      throw new Error("Adicione pelo menos 1 PDF válido.");
    }

    return arquivosValidos[0];
  }

  async function juntarPDFs() {
    if (arquivosValidos.length < 2) {
      throw new Error("Adicione pelo menos 2 PDFs válidos para juntar.");
    }

    const pdfFinal = await PDFDocument.create();

    let paginasAdicionadas = 0;

    for (const item of arquivosValidos) {
      const paginas = await adicionarPdfAoDocumento(pdfFinal, item.file);
      paginasAdicionadas += paginas;
    }

    const bytes = await pdfFinal.save();

    baixarBlob(
      new Blob([bytes], { type: "application/pdf" }),
      `${limparNomeArquivo(nomeSaida || "PDF unificado")}.pdf`
    );

    return `PDF gerado com sucesso: ${paginasAdicionadas} página(s) unificada(s).`;
  }

  async function dividirPDF() {
    const item = obterPrimeiroPdf();
    const pdfOrigem = await carregarPdf(item.file);
    const total = pdfOrigem.getPageCount();
    const zip = new JSZip();

    for (let index = 0; index < total; index += 1) {
      const novoPdf = await PDFDocument.create();
      const [pagina] = await novoPdf.copyPages(pdfOrigem, [index]);

      novoPdf.addPage(pagina);

      const bytes = await novoPdf.save();

      zip.file(
        `${removerExtensao(item.nome)}-pagina-${String(index + 1).padStart(3, "0")}.pdf`,
        bytes
      );
    }

    const blob = await zip.generateAsync({
      type: "blob",
    });

    baixarBlob(
      blob,
      `${limparNomeArquivo(removerExtensao(item.nome))}-paginas.zip`
    );

    return `PDF dividido com sucesso em ${total} arquivo(s).`;
  }

  async function extrairPaginasPDF() {
    const item = obterPrimeiroPdf();
    const pdfOrigem = await carregarPdf(item.file);
    const total = pdfOrigem.getPageCount();
    const paginas = parsePaginas(paginasTexto, total, false);

    if (!paginas.length) {
      throw new Error("Informe as páginas que deseja extrair. Exemplo: 1,3,5-7");
    }

    const pdfFinal = await PDFDocument.create();
    const paginasCopiadas = await pdfFinal.copyPages(pdfOrigem, paginas);

    paginasCopiadas.forEach((pagina) => {
      pdfFinal.addPage(pagina);
    });

    const bytes = await pdfFinal.save();

    baixarBlob(
      new Blob([bytes], { type: "application/pdf" }),
      `${limparNomeArquivo(nomeSaida || "paginas-extraidas")}.pdf`
    );

    return `Foram extraídas ${paginas.length} página(s).`;
  }

  async function removerPaginasPDF() {
    const item = obterPrimeiroPdf();
    const pdfOrigem = await carregarPdf(item.file);
    const total = pdfOrigem.getPageCount();
    const remover = parsePaginas(paginasTexto, total, false);

    if (!remover.length) {
      throw new Error("Informe as páginas que deseja remover. Exemplo: 2,4,8-10");
    }

    const removerSet = new Set(remover);

    const manter = Array.from({ length: total }, (_, index) => index).filter(
      (index) => !removerSet.has(index)
    );

    if (!manter.length) {
      throw new Error("Não é possível remover todas as páginas do PDF.");
    }

    const pdfFinal = await PDFDocument.create();
    const paginasCopiadas = await pdfFinal.copyPages(pdfOrigem, manter);

    paginasCopiadas.forEach((pagina) => {
      pdfFinal.addPage(pagina);
    });

    const bytes = await pdfFinal.save();

    baixarBlob(
      new Blob([bytes], { type: "application/pdf" }),
      `${limparNomeArquivo(nomeSaida || "pdf-sem-paginas")}.pdf`
    );

    return `PDF gerado removendo ${remover.length} página(s).`;
  }

  async function reorganizarPaginasPDF() {
    const item = obterPrimeiroPdf();
    const pdfOrigem = await carregarPdf(item.file);
    const total = pdfOrigem.getPageCount();
    const ordem = parsePaginas(ordemPaginas, total, false);

    if (!ordem.length) {
      throw new Error("Informe a nova ordem. Exemplo: 3,1,2,4-6");
    }

    const pdfFinal = await PDFDocument.create();
    const paginasCopiadas = await pdfFinal.copyPages(pdfOrigem, ordem);

    paginasCopiadas.forEach((pagina) => {
      pdfFinal.addPage(pagina);
    });

    const bytes = await pdfFinal.save();

    baixarBlob(
      new Blob([bytes], { type: "application/pdf" }),
      `${limparNomeArquivo(nomeSaida || "pdf-reorganizado")}.pdf`
    );

    return `PDF reorganizado com ${ordem.length} página(s).`;
  }

  async function rotacionarPaginasPDF() {
    const item = obterPrimeiroPdf();
    const pdf = await carregarPdf(item.file);
    const total = pdf.getPageCount();
    const paginas = parsePaginas(paginasTexto, total, true);

    for (const index of paginas) {
      const pagina = pdf.getPage(index);
      const atual = pagina.getRotation().angle || 0;

      pagina.setRotation(degrees((atual + Number(grausRotacao || 90)) % 360));
    }

    const bytes = await pdf.save();

    baixarBlob(
      new Blob([bytes], { type: "application/pdf" }),
      `${limparNomeArquivo(nomeSaida || "pdf-rotacionado")}.pdf`
    );

    return `Foram rotacionadas ${paginas.length} página(s).`;
  }

  async function imagensParaPDF() {
    if (!imagensValidas.length) {
      throw new Error("Adicione pelo menos 1 imagem JPG ou PNG.");
    }

    const pdf = await PDFDocument.create();

    const larguraPagina = 595.28;
    const alturaPagina = 841.89;
    const margem = 36;

    for (const item of imagensValidas) {
      const bytes = await item.file.arrayBuffer();
      const nome = item.nome.toLowerCase();

      let imagem;

      if (nome.endsWith(".png") || item.file.type === "image/png") {
        imagem = await pdf.embedPng(bytes);
      } else {
        imagem = await pdf.embedJpg(bytes);
      }

      const escala = Math.min(
        (larguraPagina - margem * 2) / imagem.width,
        (alturaPagina - margem * 2) / imagem.height,
        1
      );

      const largura = imagem.width * escala;
      const altura = imagem.height * escala;

      const pagina = pdf.addPage([larguraPagina, alturaPagina]);

      pagina.drawImage(imagem, {
        x: (larguraPagina - largura) / 2,
        y: (alturaPagina - altura) / 2,
        width: largura,
        height: altura,
      });
    }

    const bytes = await pdf.save();

    baixarBlob(
      new Blob([bytes], { type: "application/pdf" }),
      `${limparNomeArquivo(nomeSaida || "imagens-para-pdf")}.pdf`
    );

    return `${imagensValidas.length} imagem(ns) convertida(s) em PDF.`;
  }

  async function pdfParaImagens() {
    const item = obterPrimeiroPdf();
    const buffer = await item.file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({
      data: buffer.slice(0),
    }).promise;

    const total = pdf.numPages;
    const paginas = parsePaginas(paginasTexto, total, true);
    const zip = new JSZip();

    for (const index of paginas) {
      const pagina = await pdf.getPage(index + 1);
      const viewport = pagina.getViewport({
        scale: 2,
      });

      const canvas = document.createElement("canvas");
      const contexto = canvas.getContext("2d");

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      await pagina.render({
        canvasContext: contexto,
        viewport,
      }).promise;

      const blob = await canvasParaBlob(canvas, "image/png");

      zip.file(
        `${removerExtensao(item.nome)}-pagina-${String(index + 1).padStart(3, "0")}.png`,
        blob
      );
    }

    const blobZip = await zip.generateAsync({
      type: "blob",
    });

    baixarBlob(
      blobZip,
      `${limparNomeArquivo(removerExtensao(item.nome))}-imagens.zip`
    );

    return `Foram exportadas ${paginas.length} página(s) como imagem PNG.`;
  }

  async function editarPDFTexto() {
    const item = obterPrimeiroPdf();
    const pdf = await carregarPdf(item.file);
    const total = pdf.getPageCount();
    const paginas = parsePaginas(paginasTexto, total, true);
    const font = await pdf.embedFont(StandardFonts.Helvetica);

    for (const index of paginas) {
      const pagina = pdf.getPage(index);

      pagina.drawText(textoLivre || "Texto", {
        x: Number(posicaoX || 50),
        y: Number(posicaoY || 50),
        size: Number(tamanhoFonte || 14),
        font,
        color: rgb(0, 0, 0),
      });
    }

    const bytes = await pdf.save();

    baixarBlob(
      new Blob([bytes], { type: "application/pdf" }),
      `${limparNomeArquivo(nomeSaida || "pdf-editado")}.pdf`
    );

    return `Texto aplicado em ${paginas.length} página(s).`;
  }

  async function assinarPDF() {
    const item = obterPrimeiroPdf();
    const pdf = await carregarPdf(item.file);
    const total = pdf.getPageCount();
    const font = await pdf.embedFont(StandardFonts.HelveticaOblique);
    const pagina = pdf.getPage(total - 1);

    pagina.drawText(assinaturaTexto || "Assinado", {
      x: Number(posicaoX || 50),
      y: Number(posicaoY || 50),
      size: Number(tamanhoFonte || 16),
      font,
      color: rgb(0, 0, 0),
    });

    const bytes = await pdf.save();

    baixarBlob(
      new Blob([bytes], { type: "application/pdf" }),
      `${limparNomeArquivo(nomeSaida || "pdf-assinado")}.pdf`
    );

    return "Assinatura adicionada na última página.";
  }

  async function adicionarMarcaDagua() {
    const item = obterPrimeiroPdf();
    const pdf = await carregarPdf(item.file);
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    const paginas = pdf.getPages();

    paginas.forEach((pagina) => {
      const { width, height } = pagina.getSize();

      pagina.drawText(marcaDaguaTexto || "CONFIDENCIAL", {
        x: width * 0.18,
        y: height * 0.48,
        size: Number(tamanhoFonte || 42),
        font,
        color: rgb(0.75, 0.75, 0.75),
        rotate: degrees(35),
        opacity: 0.35,
      });
    });

    const bytes = await pdf.save();

    baixarBlob(
      new Blob([bytes], { type: "application/pdf" }),
      `${limparNomeArquivo(nomeSaida || "pdf-marca-dagua")}.pdf`
    );

    return `Marca d’água aplicada em ${paginas.length} página(s).`;
  }

  async function adicionarNumeracao() {
    const item = obterPrimeiroPdf();
    const pdf = await carregarPdf(item.file);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const paginas = pdf.getPages();

    paginas.forEach((pagina, index) => {
      const { width } = pagina.getSize();
      const texto = `${index + 1} / ${paginas.length}`;
      const tamanho = Number(tamanhoFonte || 10);
      const textoLargura = font.widthOfTextAtSize(texto, tamanho);

      pagina.drawText(texto, {
        x: (width - textoLargura) / 2,
        y: 24,
        size: tamanho,
        font,
        color: rgb(0, 0, 0),
      });
    });

    const bytes = await pdf.save();

    baixarBlob(
      new Blob([bytes], { type: "application/pdf" }),
      `${limparNomeArquivo(nomeSaida || "pdf-numerado")}.pdf`
    );

    return `Numeração aplicada em ${paginas.length} página(s).`;
  }

  async function executarFerramenta() {
    setErro("");
    setMensagem("");

    if (usaBackend) {
      setErro("Essa ferramenta precisa ser ligada ao backend. O botão já está pronto na tela.");
      return;
    }

    setGerando(true);

    try {
      let resultado = "";

      switch (ferramentaAtiva) {
        case "juntar-pdf":
          resultado = await juntarPDFs();
          break;

        case "dividir-pdf":
          resultado = await dividirPDF();
          break;

        case "extrair-paginas":
          resultado = await extrairPaginasPDF();
          break;

        case "remover-paginas":
          resultado = await removerPaginasPDF();
          break;

        case "reorganizar-paginas":
          resultado = await reorganizarPaginasPDF();
          break;

        case "rotacionar-paginas":
          resultado = await rotacionarPaginasPDF();
          break;

        case "imagens-para-pdf":
          resultado = await imagensParaPDF();
          break;

        case "pdf-para-imagens":
          resultado = await pdfParaImagens();
          break;

        case "editar-pdf":
          resultado = await editarPDFTexto();
          break;

        case "assinar-pdf":
          resultado = await assinarPDF();
          break;

        case "marca-dagua":
          resultado = await adicionarMarcaDagua();
          break;

        case "numeracao":
          resultado = await adicionarNumeracao();
          break;

        default:
          resultado = "Ferramenta ainda não configurada.";
      }

      setMensagem(resultado);
    } catch (err) {
      setErro(err?.message || "Erro ao processar o arquivo.");
    } finally {
      setGerando(false);
    }
  }

  function renderControlesFerramenta() {
    if (usaBackend) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Esta ferramenta precisa de processamento no backend. A interface já está pronta, mas a execução será conectada depois na API.
        </div>
      );
    }

    if (
      [
        "extrair-paginas",
        "remover-paginas",
        "rotacionar-paginas",
        "pdf-para-imagens",
        "editar-pdf",
      ].includes(ferramentaAtiva)
    ) {
      return (
        <label className="block">
          <span className="text-xs font-black text-slate-600">
            Páginas
          </span>

          <input
            value={paginasTexto}
            onChange={(event) => setPaginasTexto(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            placeholder="Ex: 1,3,5-7. Vazio = todas"
          />
        </label>
      );
    }

    if (ferramentaAtiva === "reorganizar-paginas") {
      return (
        <label className="block">
          <span className="text-xs font-black text-slate-600">
            Nova ordem das páginas
          </span>

          <input
            value={ordemPaginas}
            onChange={(event) => setOrdemPaginas(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            placeholder="Ex: 3,1,2,4-6"
          />
        </label>
      );
    }

    return null;
  }

  function renderControlesExtras() {
    if (ferramentaAtiva === "rotacionar-paginas") {
      return (
        <label className="block">
          <span className="text-xs font-black text-slate-600">
            Rotação
          </span>

          <select
            value={grausRotacao}
            onChange={(event) => setGrausRotacao(Number(event.target.value))}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
          >
            <option value={90}>90°</option>
            <option value={180}>180°</option>
            <option value={270}>270°</option>
          </select>
        </label>
      );
    }

    if (ferramentaAtiva === "editar-pdf") {
      return (
        <>
          <label className="block">
            <span className="text-xs font-black text-slate-600">
              Texto
            </span>

            <input
              value={textoLivre}
              onChange={(event) => setTextoLivre(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              placeholder="Texto para inserir"
            />
          </label>

          <div className="grid grid-cols-3 gap-3">
            <input
              value={posicaoX}
              onChange={(event) => setPosicaoX(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="X"
            />

            <input
              value={posicaoY}
              onChange={(event) => setPosicaoY(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="Y"
            />

            <input
              value={tamanhoFonte}
              onChange={(event) => setTamanhoFonte(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="Fonte"
            />
          </div>
        </>
      );
    }

    if (ferramentaAtiva === "assinar-pdf") {
      return (
        <>
          <label className="block">
            <span className="text-xs font-black text-slate-600">
              Assinatura
            </span>

            <input
              value={assinaturaTexto}
              onChange={(event) => setAssinaturaTexto(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              placeholder="Nome ou assinatura"
            />
          </label>

          <div className="grid grid-cols-3 gap-3">
            <input
              value={posicaoX}
              onChange={(event) => setPosicaoX(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="X"
            />

            <input
              value={posicaoY}
              onChange={(event) => setPosicaoY(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="Y"
            />

            <input
              value={tamanhoFonte}
              onChange={(event) => setTamanhoFonte(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="Fonte"
            />
          </div>
        </>
      );
    }

    if (ferramentaAtiva === "marca-dagua") {
      return (
        <>
          <label className="block">
            <span className="text-xs font-black text-slate-600">
              Texto da marca d’água
            </span>

            <input
              value={marcaDaguaTexto}
              onChange={(event) => setMarcaDaguaTexto(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              placeholder="CONFIDENCIAL"
            />
          </label>

          <label className="block">
            <span className="text-xs font-black text-slate-600">
              Tamanho
            </span>

            <input
              value={tamanhoFonte}
              onChange={(event) => setTamanhoFonte(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              placeholder="42"
            />
          </label>
        </>
      );
    }

    if (ferramentaAtiva === "numeracao") {
      return (
        <label className="block">
          <span className="text-xs font-black text-slate-600">
            Tamanho da numeração
          </span>

          <input
            value={tamanhoFonte}
            onChange={(event) => setTamanhoFonte(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            placeholder="10"
          />
        </label>
      );
    }

    return null;
  }

  const listaAtual = usaImagem ? imagens : arquivos;
  const tipoBotao = usaImagem ? "Selecionar imagens" : "Selecionar PDFs";

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
                Área para juntar, dividir, converter, editar, numerar, assinar, proteger e analisar documentos PDF.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={abrirSeletor}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition"
          >
            <UploadCloud size={18} />
            {tipoBotao}
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
            Ativas no navegador
          </p>

          <p className="text-3xl font-black text-emerald-700 mt-2">
            {ferramentas.filter((item) => item.status === "Ativo").length}
          </p>
        </div>

        <div className="rounded-[1.6rem] bg-white border border-amber-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500">
            Precisam de backend
          </p>

          <p className="text-3xl font-black text-amber-700 mt-2">
            {ferramentas.filter((item) => item.status === "Backend").length}
          </p>
        </div>

        <div className="rounded-[1.6rem] bg-white border border-purple-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500">
            IA / OCR
          </p>

          <p className="text-3xl font-black text-purple-700 mt-2">
            {ferramentas.filter((item) => item.status === "IA").length}
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
              Clique em uma opção para abrir a ferramenta.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {categoriasFiltro.map((categoria) => (
              <button
                key={categoria.id}
                type="button"
                onClick={() => setFiltroAtivo(categoria.id)}
                className={`px-4 py-2 rounded-xl text-xs font-black border transition ${
                  filtroAtivo === categoria.id
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {categoria.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {ferramentasFiltradas.map((item) => {
            const Icone = item.icone;
            const ativo = ferramentaAtiva === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selecionarFerramenta(item.id)}
                className={`text-left rounded-2xl border p-4 min-h-[118px] transition hover:-translate-y-0.5 hover:shadow-md ${
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

                <p className="text-xs text-slate-500 mt-1">
                  {item.descricao}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_360px] gap-6">
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2 text-blue-700 font-black">
                <ferramentaSelecionada.icone size={20} />
                {ferramentaSelecionada.titulo}
              </div>

              <p className="text-sm text-slate-500 mt-1">
                {ferramentaSelecionada.descricao}
              </p>
            </div>

            {!usaBackend ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={abrirSeletor}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Plus size={16} />
                  Adicionar
                </button>

                <button
                  type="button"
                  onClick={limparArquivos}
                  disabled={!listaAtual.length}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  <Trash2 size={16} />
                  Limpar
                </button>
              </div>
            ) : null}
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept={usaImagem ? "image/png,image/jpeg,.png,.jpg,.jpeg" : "application/pdf,.pdf"}
            onChange={selecionarArquivos}
            className="hidden"
          />

          {usaBackend ? (
            <div className="mt-5 rounded-3xl border border-dashed border-amber-200 bg-amber-50 p-8">
              <h3 className="font-black text-amber-900">
                Ferramenta pronta no menu
              </h3>

              <p className="text-sm text-amber-800 mt-2">
                Essa função precisa de backend para processar com segurança e qualidade. A interface já está criada para conectar depois na API.
              </p>
            </div>
          ) : carregando ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="animate-spin mb-3" />
              <p className="font-bold">
                Lendo arquivos...
              </p>
            </div>
          ) : listaAtual.length === 0 ? (
            <button
              type="button"
              onClick={abrirSeletor}
              onDragOver={(event) => {
                event.preventDefault();
                setArrastando(true);
              }}
              onDragLeave={() => setArrastando(false)}
              onDrop={soltarArquivos}
              className={`w-full mt-5 border-2 border-dashed rounded-[1.5rem] p-10 md:p-14 text-center transition ${
                arrastando
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/30"
              }`}
            >
              <UploadCloud size={42} className="mx-auto text-blue-600" />

              <h3 className="font-black text-slate-900 mt-4">
                Arraste ou selecione arquivos
              </h3>

              <p className="text-sm text-slate-500 mt-2">
                {usaImagem
                  ? "Envie imagens JPG ou PNG para converter em PDF."
                  : "Envie arquivos PDF para processar nesta ferramenta."}
              </p>
            </button>
          ) : (
            <div className="mt-5 space-y-3">
              {listaAtual.map((item, index) => (
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
                      {usaImagem ? <FileImage size={22} /> : <FileText size={22} />}
                    </div>

                    <div className="min-w-0">
                      <p className="font-black text-slate-900 truncate">
                        {index + 1}. {item.nome}
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        {item.invalido
                          ? item.erro
                          : usaImagem
                            ? formatarTamanho(item.tamanho)
                            : `${item.paginas} página(s) • ${formatarTamanho(item.tamanho)}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:justify-end">
                    <button
                      type="button"
                      onClick={() => moverArquivo(item.id, "cima")}
                      disabled={index === 0}
                      className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30"
                    >
                      <ArrowUp size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => moverArquivo(item.id, "baixo")}
                      disabled={index === listaAtual.length - 1}
                      className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30"
                    >
                      <ArrowDown size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => removerArquivo(item.id)}
                      className="w-10 h-10 rounded-xl border border-red-100 text-red-600 flex items-center justify-center hover:bg-red-50"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
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
            Configurações
          </h3>

          <p className="text-sm text-slate-500 mt-1">
            Ajuste a saída antes de processar.
          </p>

          {!usaBackend ? (
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs font-black text-slate-600">
                  Nome do arquivo final
                </span>

                <input
                  value={nomeSaida}
                  onChange={(event) => setNomeSaida(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  placeholder="Nome do arquivo"
                />
              </label>

              {renderControlesFerramenta()}

              {renderControlesExtras()}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                  <p className="text-xs text-slate-500">
                    Arquivos
                  </p>

                  <p className="text-xl font-black text-slate-900 mt-1">
                    {listaAtual.length}
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
                    {formatarTamanho(tamanhoTotal)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={executarFerramenta}
                disabled={gerando}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-blue-600 text-white font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition disabled:opacity-40"
              >
                {gerando ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Processar e baixar
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Esta ferramenta será conectada ao backend. Para ela funcionar de verdade, vamos criar endpoints específicos na API.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
