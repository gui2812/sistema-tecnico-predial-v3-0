import XlsxPopulate from "xlsx-populate/browser/xlsx-populate";
import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
} from "pdf-lib";
import { saveAs } from "file-saver";

const TEMPLATE_EXCEL =
  "/templates/Modelo - Mapa de Cotação.xlsx";

const TEMPLATE_PDF =
  "/templates/Modelo - Mapa de Cotação.pdf";

// =========================================================
// UTILIDADES GERAIS
// =========================================================

function texto(valor) {
  return String(
    valor ??
      ""
  ).trim();
}

function normalizar(
  valor
) {
  return texto(
    valor
  )
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[:.]/g,
      ""
    )
    .replace(
      /\s+/g,
      " "
    )
    .toLowerCase();
}

function numero(
  valor
) {
  if (
    typeof valor ===
    "number"
  ) {
    return Number.isFinite(
      valor
    )
      ? valor
      : 0;
  }

  const limpo =
    texto(
      valor
    )
      .replace(
        /[^\d,.-]/g,
        ""
      )
      .replace(
        /\./g,
        ""
      )
      .replace(
        ",",
        "."
      );

  const resultado =
    Number(
      limpo
    );

  return Number.isFinite(
    resultado
  )
    ? resultado
    : 0;
}

function moeda(
  valor
) {
  return numero(
    valor
  ).toLocaleString(
    "pt-BR",
    {
      style:
        "currency",

      currency:
        "BRL",
    }
  );
}

function formatarData(
  valor
) {
  if (!valor) {
    return "";
  }

  const partes =
    texto(
      valor
    ).split(
      "-"
    );

  if (
    partes.length !==
    3
  ) {
    return valor;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function nomeSeguro(
  valor
) {
  return texto(
    valor
  )
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[\\/:*?"<>|]/g,
      "-"
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function codigoMapa(
  dados
) {
  return `${texto(
    dados.ano
  )}${texto(
    dados.numeroMapa
  )}`;
}

export function gerarNomeBaseMapa(
  dados
) {
  const empresa =
    nomeSeguro(
      dados.empresaAprovada
    ) ||
    nomeSeguro(
      dados.fornecedores?.[0]?.empresa
    ) ||
    "Fornecedor";

  const identificacao =
    nomeSeguro(
      dados.identificacaoMapa
    ) ||
    nomeSeguro(
      dados.descricaoItem
    ) ||
    "Cotacao";

  return `Mapa ${codigoMapa(
    dados
  )} - ${empresa} - ${identificacao}`;
}

async function carregarArrayBuffer(
  caminho
) {
  const response =
    await fetch(
      caminho
    );

  if (
    !response.ok
  ) {
    throw new Error(
      `Não foi possível carregar o template: ${caminho}`
    );
  }

  return response.arrayBuffer();
}

// =========================================================
// EXCEL — LOCALIZAÇÃO AUTOMÁTICA DAS CÉLULAS
// =========================================================

function obterMatriz(
  planilha
) {
  const faixa =
    planilha.usedRange();

  const inicio =
    faixa.startCell();

  return {
    valores:
      faixa.value(),

    linhaInicial:
      inicio.rowNumber(),

    colunaInicial:
      inicio.columnNumber(),
  };
}

function localizarCelulas(
  planilha,
  termo
) {
  const {
    valores,
    linhaInicial,
    colunaInicial,
  } =
    obterMatriz(
      planilha
    );

  const procurado =
    normalizar(
      termo
    );

  const resultados =
    [];

  valores.forEach(
    (
      linha,
      indiceLinha
    ) => {
      linha.forEach(
        (
          valor,
          indiceColuna
        ) => {
          const atual =
            normalizar(
              valor
            );

          if (
            atual &&
            (
              atual ===
                procurado ||
              atual.includes(
                procurado
              )
            )
          ) {
            resultados.push({
              linha:
                linhaInicial +
                indiceLinha,

              coluna:
                colunaInicial +
                indiceColuna,

              valor,
            });
          }
        }
      );
    }
  );

  return resultados;
}

function localizarPrimeira(
  planilha,
  termo
) {
  return localizarCelulas(
    planilha,
    termo
  )[0];
}

function escrever(
  planilha,
  linha,
  coluna,
  valor
) {
  if (
    !linha ||
    !coluna
  ) {
    return;
  }

  planilha
    .cell(
      linha,
      coluna
    )
    .value(
      valor ??
        ""
    );
}

function escreverAoLado(
  planilha,
  titulo,
  valor,
  deslocamentoColuna = 1
) {
  const referencia =
    localizarPrimeira(
      planilha,
      titulo
    );

  if (
    !referencia
  ) {
    return;
  }

  escrever(
    planilha,
    referencia.linha,
    referencia.coluna +
      deslocamentoColuna,
    valor
  );
}

function localizarCabecalhosOrcamentos(
  planilha
) {
  return [
    localizarPrimeira(
      planilha,
      "Orçamento 1"
    ),

    localizarPrimeira(
      planilha,
      "Orçamento 2"
    ),

    localizarPrimeira(
      planilha,
      "Orçamento 3"
    ),
  ];
}

function localizarNaLinha(
  planilha,
  termo
) {
  return localizarPrimeira(
    planilha,
    termo
  )?.linha;
}

function preencherFornecedorExcel(
  planilha,
  fornecedor,
  indice,
  cabecalhos
) {
  const cabecalho =
    cabecalhos[
      indice
    ];

  if (
    !cabecalho
  ) {
    return;
  }

  const coluna =
    cabecalho.coluna;

  const campos = [
    [
      "Empresa",
      fornecedor.empresa,
    ],

    [
      "Contato",
      fornecedor.contato,
    ],

    [
      "Telefone",
      fornecedor.telefone,
    ],

    [
      "E-mail",
      fornecedor.email,
    ],

    [
      "Data da proposta",
      formatarData(
        fornecedor.dataProposta
      ),
    ],
  ];

  campos.forEach(
    (
      [
        titulo,
        valor,
      ]
    ) => {
      const linha =
        localizarNaLinha(
          planilha,
          titulo
        );

      escrever(
        planilha,
        linha,
        coluna,
        valor
      );
    }
  );

  const precosUnitarios =
    localizarCelulas(
      planilha,
      "Preço Unit"
    );

  const precosTotais =
    localizarCelulas(
      planilha,
      "Preço Total"
    );

  const cabecalhoUnitario =
    precosUnitarios[
      indice
    ];

  const cabecalhoTotal =
    precosTotais[
      indice
    ];

  if (
    cabecalhoUnitario
  ) {
    escrever(
      planilha,
      cabecalhoUnitario.linha +
        1,
      cabecalhoUnitario.coluna,
      numero(
        fornecedor.precoUnitario
      )
    );
  }

  if (
    cabecalhoTotal
  ) {
    escrever(
      planilha,
      cabecalhoTotal.linha +
        1,
      cabecalhoTotal.coluna,
      numero(
        fornecedor.precoTotal
      )
    );
  }

  const comerciais = [
    [
      "Frete",
      fornecedor.frete,
    ],

    [
      "Prazo de Entrega",
      fornecedor.prazoEntrega,
    ],

    [
      "Validade da Proposta",
      fornecedor.validadeProposta,
    ],

    [
      "Condições de Pagamento",
      fornecedor.condicaoPagamento,
    ],

    [
      "Garantia",
      fornecedor.garantia,
    ],
  ];

  comerciais.forEach(
    (
      [
        titulo,
        valor,
      ]
    ) => {
      const linha =
        localizarNaLinha(
          planilha,
          titulo
        );

      escrever(
        planilha,
        linha,
        coluna,
        valor
      );
    }
  );

  const linhaTotal =
    localizarNaLinha(
      planilha,
      "Total"
    );

  escrever(
    planilha,
    linhaTotal,
    coluna,
    numero(
      fornecedor.precoTotal
    )
  );
}

export async function gerarExcelPreenchido(
  dados
) {
  const template =
    await carregarArrayBuffer(
      TEMPLATE_EXCEL
    );

  const workbook =
    await XlsxPopulate.fromDataAsync(
      template
    );

  const planilha =
    workbook.sheet(
      0
    );

  escreverAoLado(
    planilha,
    "Empreendimento",
    dados.empreendimento
  );

  escreverAoLado(
    planilha,
    "Departamento",
    dados.departamento
  );

  escreverAoLado(
    planilha,
    "Contratante",
    dados.contratante
  );

  escreverAoLado(
    planilha,
    "Conta Orçamentária",
    dados.contaOrcamentaria
  );

  escreverAoLado(
    planilha,
    "Gerência Responsável",
    dados.gerenciaResponsavel
  );

  const descricao =
    localizarPrimeira(
      planilha,
      "Descrição"
    );

  if (
    descricao
  ) {
    escrever(
      planilha,
      descricao.linha +
        1,
      descricao.coluna,
      dados.descricaoItem
    );
  }

  const quantidade =
    localizarPrimeira(
      planilha,
      "Quantidade"
    );

  if (
    quantidade
  ) {
    escrever(
      planilha,
      quantidade.linha +
        1,
      quantidade.coluna,
      numero(
        dados.quantidade
      )
    );
  }

  const unidade =
    localizarPrimeira(
      planilha,
      "Unidade"
    );

  if (
    unidade
  ) {
    escrever(
      planilha,
      unidade.linha +
        1,
      unidade.coluna,
      dados.unidade
    );
  }

  const observacoes =
    localizarPrimeira(
      planilha,
      "Observações"
    );

  if (
    observacoes
  ) {
    escrever(
      planilha,
      observacoes.linha +
        1,
      observacoes.coluna,
      dados.observacoes
    );
  }

  const empresaAprovada =
    localizarPrimeira(
      planilha,
      "Empresa Aprovada"
    );

  if (
    empresaAprovada
  ) {
    escrever(
      planilha,
      empresaAprovada.linha +
        1,
      empresaAprovada.coluna,
      dados.empresaAprovada
    );
  }

  const cabecalhos =
    localizarCabecalhosOrcamentos(
      planilha
    );

  (
    dados.fornecedores ||
    []
  )
    .slice(
      0,
      3
    )
    .forEach(
      (
        fornecedor,
        indice
      ) => {
        preencherFornecedorExcel(
          planilha,
          fornecedor,
          indice,
          cabecalhos
        );
      }
    );

  return workbook.outputAsync({
    type:
      "blob",
  });
}

// =========================================================
// PDF — COORDENADAS VISUAIS
// =========================================================

/**
 * As coordenadas abaixo representam a página já visualizada na horizontal.
 * A função de desenho corrige automaticamente PDFs internamente rotacionados.
 */
const PDF = {
  empreendimento: [
    0.226,
    0.824,
    0.130,
  ],

  departamento: [
    0.226,
    0.795,
    0.130,
  ],

  contratante: [
    0.226,
    0.766,
    0.130,
  ],

  contaOrcamentaria: [
    0.226,
    0.737,
    0.130,
  ],

  gerenciaResponsavel: [
    0.226,
    0.708,
    0.130,
  ],

  descricaoItem: [
    0.112,
    0.625,
    0.235,
  ],

  quantidade: [
    0.386,
    0.625,
    0.045,
  ],

  unidade: [
    0.449,
    0.625,
    0.045,
  ],

  observacoes: [
    0.112,
    0.241,
    0.765,
  ],

  empresaAprovada: [
    0.690,
    0.085,
    0.175,
  ],

  fornecedores: [
    {
      x:
        0.526,
    },

    {
      x:
        0.686,
    },

    {
      x:
        0.846,
    },
  ],
};

function dimensoesVisuais(
  page
) {
  const {
    width,
    height,
  } =
    page.getSize();

  const angulo =
    (
      page
        .getRotation()
        .angle %
        360 +
      360
    ) %
    360;

  const girado =
    angulo ===
      90 ||
    angulo ===
      270;

  return {
    brutoWidth:
      width,

    brutoHeight:
      height,

    visualWidth:
      girado
        ? height
        : width,

    visualHeight:
      girado
        ? width
        : height,

    angulo,
  };
}

function transformarPonto(
  page,
  xVisual,
  yVisual
) {
  const {
    brutoWidth,
    brutoHeight,
    angulo,
  } =
    dimensoesVisuais(
      page
    );

  if (
    angulo ===
    90
  ) {
    return {
      x:
        brutoWidth -
        yVisual,

      y:
        xVisual,

      rotacao:
        degrees(
          90
        ),
    };
  }

  if (
    angulo ===
    180
  ) {
    return {
      x:
        brutoWidth -
        xVisual,

      y:
        brutoHeight -
        yVisual,

      rotacao:
        degrees(
          180
        ),
    };
  }

  if (
    angulo ===
    270
  ) {
    return {
      x:
        yVisual,

      y:
        brutoHeight -
        xVisual,

      rotacao:
        degrees(
          270
        ),
    };
  }

  return {
    x:
      xVisual,

    y:
      yVisual,

    rotacao:
      degrees(
        0
      ),
  };
}

function cortarTexto(
  valor,
  font,
  tamanho,
  larguraMaxima
) {
  const original =
    texto(
      valor
    );

  let resultado =
    original;

  while (
    resultado &&
    font.widthOfTextAtSize(
      resultado,
      tamanho
    ) >
      larguraMaxima
  ) {
    resultado =
      resultado.slice(
        0,
        -1
      );
  }

  if (
    resultado !==
      original &&
    resultado.length >
      3
  ) {
    return `${resultado.slice(
      0,
      -3
    )}...`;
  }

  return resultado;
}

function desenharTexto(
  page,
  font,
  valor,
  xRelativo,
  yRelativo,
  larguraRelativa,
  tamanho = 7
) {
  if (
    !texto(
      valor
    )
  ) {
    return;
  }

  const {
    visualWidth,
    visualHeight,
  } =
    dimensoesVisuais(
      page
    );

  const xVisual =
    visualWidth *
    xRelativo;

  const yVisual =
    visualHeight *
    yRelativo;

  const largura =
    visualWidth *
    larguraRelativa;

  const ponto =
    transformarPonto(
      page,
      xVisual,
      yVisual
    );

  page.drawText(
    cortarTexto(
      valor,
      font,
      tamanho,
      largura
    ),
    {
      x:
        ponto.x,

      y:
        ponto.y,

      size:
        tamanho,

      font,

      rotate:
        ponto.rotacao,

      color:
        rgb(
          0,
          0,
          0
        ),
    }
  );
}

function desenharLinhas(
  page,
  font,
  valor,
  xRelativo,
  yRelativo,
  larguraRelativa,
  tamanho = 7,
  limite = 4
) {
  const palavras =
    texto(
      valor
    )
      .split(
        /\s+/
      )
      .filter(
        Boolean
      );

  const {
    visualWidth,
  } =
    dimensoesVisuais(
      page
    );

  const largura =
    visualWidth *
    larguraRelativa;

  const linhas =
    [];

  let atual =
    "";

  palavras.forEach(
    (
      palavra
    ) => {
      const tentativa =
        atual
          ? `${atual} ${palavra}`
          : palavra;

      if (
        !atual ||
        font.widthOfTextAtSize(
          tentativa,
          tamanho
        ) <=
          largura
      ) {
        atual =
          tentativa;

        return;
      }

      linhas.push(
        atual
      );

      atual =
        palavra;
    }
  );

  if (
    atual
  ) {
    linhas.push(
      atual
    );
  }

  linhas
    .slice(
      0,
      limite
    )
    .forEach(
      (
        linha,
        indice
      ) => {
        desenharTexto(
          page,
          font,
          linha,
          xRelativo,
          yRelativo -
            indice *
              0.018,
          larguraRelativa,
          tamanho
        );
      }
    );
}

function preencherFornecedorPdf(
  page,
  font,
  fornecedor,
  indice
) {
  const bloco =
    PDF.fornecedores[
      indice
    ];

  if (
    !bloco
  ) {
    return;
  }

  const x =
    bloco.x;

  desenharTexto(
    page,
    font,
    fornecedor.empresa,
    x,
    0.824,
    0.135
  );

  desenharTexto(
    page,
    font,
    fornecedor.contato,
    x,
    0.795,
    0.135
  );

  desenharTexto(
    page,
    font,
    fornecedor.telefone,
    x,
    0.766,
    0.135
  );

  desenharTexto(
    page,
    font,
    fornecedor.email,
    x,
    0.737,
    0.135,
    6
  );

  desenharTexto(
    page,
    font,
    formatarData(
      fornecedor.dataProposta
    ),
    x,
    0.708,
    0.135
  );

  desenharTexto(
    page,
    font,
    moeda(
      fornecedor.precoUnitario
    ),
    x,
    0.625,
    0.068
  );

  desenharTexto(
    page,
    font,
    moeda(
      fornecedor.precoTotal
    ),
    x +
      0.071,
    0.625,
    0.068
  );

  desenharTexto(
    page,
    font,
    fornecedor.frete,
    x,
    0.438,
    0.135
  );

  desenharTexto(
    page,
    font,
    fornecedor.prazoEntrega,
    x,
    0.409,
    0.135
  );

  desenharTexto(
    page,
    font,
    fornecedor.validadeProposta,
    x,
    0.380,
    0.135
  );

  desenharTexto(
    page,
    font,
    fornecedor.condicaoPagamento,
    x,
    0.351,
    0.135
  );

  desenharTexto(
    page,
    font,
    fornecedor.garantia,
    x,
    0.322,
    0.135
  );

  desenharTexto(
    page,
    font,
    moeda(
      fornecedor.precoTotal
    ),
    x,
    0.286,
    0.135,
    7.5
  );
}

export async function gerarPdfMapaPreenchido(
  dados
) {
  const template =
    await carregarArrayBuffer(
      TEMPLATE_PDF
    );

  const pdf =
    await PDFDocument.load(
      template
    );

  const page =
    pdf.getPages()[0];

  const font =
    await pdf.embedFont(
      StandardFonts.Helvetica
    );

  desenharTexto(
    page,
    font,
    dados.empreendimento,
    ...PDF.empreendimento
  );

  desenharTexto(
    page,
    font,
    dados.departamento,
    ...PDF.departamento
  );

  desenharTexto(
    page,
    font,
    dados.contratante,
    ...PDF.contratante
  );

  desenharTexto(
    page,
    font,
    dados.contaOrcamentaria,
    ...PDF.contaOrcamentaria
  );

  desenharTexto(
    page,
    font,
    dados.gerenciaResponsavel,
    ...PDF.gerenciaResponsavel
  );

  desenharTexto(
    page,
    font,
    dados.descricaoItem,
    ...PDF.descricaoItem
  );

  desenharTexto(
    page,
    font,
    dados.quantidade,
    ...PDF.quantidade
  );

  desenharTexto(
    page,
    font,
    dados.unidade,
    ...PDF.unidade
  );

  desenharLinhas(
    page,
    font,
    dados.observacoes,
    ...PDF.observacoes
  );

  desenharTexto(
    page,
    font,
    dados.empresaAprovada,
    ...PDF.empresaAprovada,
    8
  );

  (
    dados.fornecedores ||
    []
  )
    .slice(
      0,
      3
    )
    .forEach(
      (
        fornecedor,
        indice
      ) => {
        preencherFornecedorPdf(
          page,
          font,
          fornecedor,
          indice
        );
      }
    );

  return pdf.save();
}

// =========================================================
// UNIÃO DO PDF COM AS PROPOSTAS
// =========================================================

export async function gerarPdfComPropostas(
  pdfMapaBytes,
  fornecedores =
    []
) {
  const pdfFinal =
    await PDFDocument.create();

  const pdfMapa =
    await PDFDocument.load(
      pdfMapaBytes
    );

  const paginasMapa =
    await pdfFinal.copyPages(
      pdfMapa,
      pdfMapa.getPageIndices()
    );

  paginasMapa.forEach(
    (
      pagina
    ) => {
      pdfFinal.addPage(
        pagina
      );
    }
  );

  for (
    const fornecedor of fornecedores.slice(
      0,
      3
    )
  ) {
    const arquivo =
      fornecedor.arquivo;

    if (!arquivo) {
      continue;
    }

    const nome =
      arquivo.name.toLowerCase();

    if (
      arquivo.type !==
        "application/pdf" &&
      !nome.endsWith(
        ".pdf"
      )
    ) {
      throw new Error(
        `A proposta de "${
          fornecedor.empresa ||
          "fornecedor"
        }" precisa ser um arquivo PDF.`
      );
    }

    const bytes =
      await arquivo.arrayBuffer();

    const pdfProposta =
      await PDFDocument.load(
        bytes
      );

    const paginas =
      await pdfFinal.copyPages(
        pdfProposta,
        pdfProposta.getPageIndices()
      );

    paginas.forEach(
      (
        pagina
      ) => {
        pdfFinal.addPage(
          pagina
        );
      }
    );
  }

  return pdfFinal.save();
}

// =========================================================
// GERAÇÃO DOS TRÊS ARQUIVOS
// =========================================================

export async function gerarArquivosMapaCotacao(
  dados
) {
  const excelBlob =
    await gerarExcelPreenchido(
      dados
    );

  const pdfMapaBytes =
    await gerarPdfMapaPreenchido(
      dados
    );

  const pdfCompletoBytes =
    await gerarPdfComPropostas(
      pdfMapaBytes,
      dados.fornecedores
    );

  const nomeBase =
    gerarNomeBaseMapa(
      dados
    );

  const identificacao =
    nomeSeguro(
      dados.identificacaoMapa
    ) ||
    nomeSeguro(
      dados.descricaoItem
    ) ||
    "Cotacao";

  return {
    nomeBase,

    excel: {
      nome:
        `${nomeBase}.xlsx`,

      blob:
        excelBlob,
    },

    pdfMapa: {
      nome:
        `${nomeBase}.pdf`,

      blob:
        new Blob(
          [
            pdfMapaBytes,
          ],
          {
            type:
              "application/pdf",
          }
        ),
    },

    pdfCompleto: {
      nome:
        `Mapa ${codigoMapa(
          dados
        )} - ${identificacao} + Prop.pdf`,

      blob:
        new Blob(
          [
            pdfCompletoBytes,
          ],
          {
            type:
              "application/pdf",
          }
        ),
    },
  };
}

export function baixarArquivoGerado(
  arquivo
) {
  if (
    !arquivo?.blob ||
    !arquivo?.nome
  ) {
    return;
  }

  saveAs(
    arquivo.blob,
    arquivo.nome
  );
}
