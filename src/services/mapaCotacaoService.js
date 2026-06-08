import XlsxPopulate from "xlsx-populate/browser/xlsx-populate";
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";
import { saveAs } from "file-saver";

const TEMPLATE_EXCEL =
  "/templates/Modelo - Mapa de Cotação.xlsx";

const TEMPLATE_PDF =
  "/templates/Modelo - Mapa de Cotação.pdf";

/**
 * O template não é redesenhado.
 * O sistema abre o arquivo oficial e preenche somente os campos existentes.
 *
 * Após o primeiro teste, caso algum campo precise subir ou descer poucos
 * pixels, alteraremos somente este bloco de coordenadas.
 */
const CELULAS_EXCEL = {
  empreendimento: "B4",
  departamento: "B5",
  contratante: "B6",
  contaOrcamentaria: "B7",
  gerenciaResponsavel: "B8",

  descricaoItem: "B13",
  quantidade: "E13",
  unidade: "F13",

  observacoes: "B30",
  empresaAprovada: "K35",

  fornecedores: [
    {
      empresa: "H4",
      contato: "H5",
      telefone: "H6",
      email: "H7",
      dataProposta: "H8",
      precoUnitario: "H13",
      precoTotal: "I13",
      frete: "H22",
      prazoEntrega: "H23",
      validadeProposta: "H24",
      condicaoPagamento: "H25",
      garantia: "H26",
      total: "I27",
    },
    {
      empresa: "K4",
      contato: "K5",
      telefone: "K6",
      email: "K7",
      dataProposta: "K8",
      precoUnitario: "K13",
      precoTotal: "L13",
      frete: "K22",
      prazoEntrega: "K23",
      validadeProposta: "K24",
      condicaoPagamento: "K25",
      garantia: "K26",
      total: "L27",
    },
    {
      empresa: "N4",
      contato: "N5",
      telefone: "N6",
      email: "N7",
      dataProposta: "N8",
      precoUnitario: "N13",
      precoTotal: "O13",
      frete: "N22",
      prazoEntrega: "N23",
      validadeProposta: "N24",
      condicaoPagamento: "N25",
      garantia: "N26",
      total: "O27",
    },
  ],
};

/**
 * Coordenadas relativas ao PDF.
 * x e y variam entre 0 e 1.
 * O PDF original permanece como fundo, preservando integralmente o layout.
 */
const CAMPOS_PDF = {
  empreendimento: {
    x: 0.125,
    y: 0.878,
    size: 8,
    largura: 150,
  },

  departamento: {
    x: 0.125,
    y: 0.848,
    size: 8,
    largura: 150,
  },

  contratante: {
    x: 0.125,
    y: 0.818,
    size: 8,
    largura: 150,
  },

  contaOrcamentaria: {
    x: 0.125,
    y: 0.788,
    size: 8,
    largura: 150,
  },

  gerenciaResponsavel: {
    x: 0.125,
    y: 0.758,
    size: 8,
    largura: 150,
  },

  descricaoItem: {
    x: 0.07,
    y: 0.622,
    size: 7.4,
    largura: 275,
  },

  quantidade: {
    x: 0.42,
    y: 0.622,
    size: 7.4,
    largura: 40,
  },

  unidade: {
    x: 0.468,
    y: 0.622,
    size: 7.4,
    largura: 40,
  },

  observacoes: {
    x: 0.075,
    y: 0.255,
    size: 7,
    largura: 610,
    linhas: 4,
  },

  empresaAprovada: {
    x: 0.69,
    y: 0.102,
    size: 8,
    largura: 190,
  },

  fornecedores: [
    {
      empresa: {
        x: 0.545,
        y: 0.878,
        size: 7,
        largura: 90,
      },

      contato: {
        x: 0.545,
        y: 0.848,
        size: 7,
        largura: 90,
      },

      telefone: {
        x: 0.545,
        y: 0.818,
        size: 7,
        largura: 90,
      },

      email: {
        x: 0.545,
        y: 0.788,
        size: 6.2,
        largura: 100,
      },

      dataProposta: {
        x: 0.545,
        y: 0.758,
        size: 7,
        largura: 90,
      },

      precoUnitario: {
        x: 0.548,
        y: 0.622,
        size: 7,
        largura: 65,
      },

      precoTotal: {
        x: 0.617,
        y: 0.622,
        size: 7,
        largura: 65,
      },

      frete: {
        x: 0.548,
        y: 0.438,
        size: 7,
        largura: 85,
      },

      prazoEntrega: {
        x: 0.548,
        y: 0.408,
        size: 7,
        largura: 85,
      },

      validadeProposta: {
        x: 0.548,
        y: 0.378,
        size: 7,
        largura: 85,
      },

      condicaoPagamento: {
        x: 0.548,
        y: 0.348,
        size: 7,
        largura: 85,
      },

      garantia: {
        x: 0.548,
        y: 0.318,
        size: 7,
        largura: 85,
      },

      total: {
        x: 0.617,
        y: 0.285,
        size: 7.4,
        largura: 70,
      },
    },

    {
      empresa: {
        x: 0.704,
        y: 0.878,
        size: 7,
        largura: 90,
      },

      contato: {
        x: 0.704,
        y: 0.848,
        size: 7,
        largura: 90,
      },

      telefone: {
        x: 0.704,
        y: 0.818,
        size: 7,
        largura: 90,
      },

      email: {
        x: 0.704,
        y: 0.788,
        size: 6.2,
        largura: 100,
      },

      dataProposta: {
        x: 0.704,
        y: 0.758,
        size: 7,
        largura: 90,
      },

      precoUnitario: {
        x: 0.707,
        y: 0.622,
        size: 7,
        largura: 65,
      },

      precoTotal: {
        x: 0.776,
        y: 0.622,
        size: 7,
        largura: 65,
      },

      frete: {
        x: 0.707,
        y: 0.438,
        size: 7,
        largura: 85,
      },

      prazoEntrega: {
        x: 0.707,
        y: 0.408,
        size: 7,
        largura: 85,
      },

      validadeProposta: {
        x: 0.707,
        y: 0.378,
        size: 7,
        largura: 85,
      },

      condicaoPagamento: {
        x: 0.707,
        y: 0.348,
        size: 7,
        largura: 85,
      },

      garantia: {
        x: 0.707,
        y: 0.318,
        size: 7,
        largura: 85,
      },

      total: {
        x: 0.776,
        y: 0.285,
        size: 7.4,
        largura: 70,
      },
    },

    {
      empresa: {
        x: 0.862,
        y: 0.878,
        size: 7,
        largura: 90,
      },

      contato: {
        x: 0.862,
        y: 0.848,
        size: 7,
        largura: 90,
      },

      telefone: {
        x: 0.862,
        y: 0.818,
        size: 7,
        largura: 90,
      },

      email: {
        x: 0.862,
        y: 0.788,
        size: 6.2,
        largura: 100,
      },

      dataProposta: {
        x: 0.862,
        y: 0.758,
        size: 7,
        largura: 90,
      },

      precoUnitario: {
        x: 0.865,
        y: 0.622,
        size: 7,
        largura: 65,
      },

      precoTotal: {
        x: 0.934,
        y: 0.622,
        size: 7,
        largura: 65,
      },

      frete: {
        x: 0.865,
        y: 0.438,
        size: 7,
        largura: 85,
      },

      prazoEntrega: {
        x: 0.865,
        y: 0.408,
        size: 7,
        largura: 85,
      },

      validadeProposta: {
        x: 0.865,
        y: 0.378,
        size: 7,
        largura: 85,
      },

      condicaoPagamento: {
        x: 0.865,
        y: 0.348,
        size: 7,
        largura: 85,
      },

      garantia: {
        x: 0.865,
        y: 0.318,
        size: 7,
        largura: 85,
      },

      total: {
        x: 0.934,
        y: 0.285,
        size: 7.4,
        largura: 70,
      },
    },
  ],
};

function texto(valor) {
  return String(
    valor ??
      ""
  ).trim();
}

function numero(valor) {
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

  const normalizado =
    String(
      valor ??
        ""
    )
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

  const resultado =
    Number(
      normalizado
    );

  return Number.isFinite(
    resultado
  )
    ? resultado
    : 0;
}

function moeda(valor) {
  return numero(
    valor
  ).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
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
    String(
      valor
    ).split("-");

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

function escreverCelula(
  planilha,
  endereco,
  valor
) {
  if (!endereco) {
    return;
  }

  planilha
    .cell(
      endereco
    )
    .value(
      valor ??
        ""
    );
}

function limparFornecedoresExcel(
  planilha
) {
  CELULAS_EXCEL.fornecedores.forEach(
    (
      mapa
    ) => {
      Object.values(
        mapa
      ).forEach(
        (
          endereco
        ) => {
          escreverCelula(
            planilha,
            endereco,
            ""
          );
        }
      );
    }
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

  escreverCelula(
    planilha,
    CELULAS_EXCEL.empreendimento,
    dados.empreendimento
  );

  escreverCelula(
    planilha,
    CELULAS_EXCEL.departamento,
    dados.departamento
  );

  escreverCelula(
    planilha,
    CELULAS_EXCEL.contratante,
    dados.contratante
  );

  escreverCelula(
    planilha,
    CELULAS_EXCEL.contaOrcamentaria,
    dados.contaOrcamentaria
  );

  escreverCelula(
    planilha,
    CELULAS_EXCEL.gerenciaResponsavel,
    dados.gerenciaResponsavel
  );

  escreverCelula(
    planilha,
    CELULAS_EXCEL.descricaoItem,
    dados.descricaoItem
  );

  escreverCelula(
    planilha,
    CELULAS_EXCEL.quantidade,
    numero(
      dados.quantidade
    )
  );

  escreverCelula(
    planilha,
    CELULAS_EXCEL.unidade,
    dados.unidade
  );

  escreverCelula(
    planilha,
    CELULAS_EXCEL.observacoes,
    dados.observacoes
  );

  escreverCelula(
    planilha,
    CELULAS_EXCEL.empresaAprovada,
    dados.empresaAprovada
  );

  limparFornecedoresExcel(
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
        const mapa =
          CELULAS_EXCEL.fornecedores[
            indice
          ];

        escreverCelula(
          planilha,
          mapa.empresa,
          fornecedor.empresa
        );

        escreverCelula(
          planilha,
          mapa.contato,
          fornecedor.contato
        );

        escreverCelula(
          planilha,
          mapa.telefone,
          fornecedor.telefone
        );

        escreverCelula(
          planilha,
          mapa.email,
          fornecedor.email
        );

        escreverCelula(
          planilha,
          mapa.dataProposta,
          formatarData(
            fornecedor.dataProposta
          )
        );

        escreverCelula(
          planilha,
          mapa.precoUnitario,
          numero(
            fornecedor.precoUnitario
          )
        );

        escreverCelula(
          planilha,
          mapa.precoTotal,
          numero(
            fornecedor.precoTotal
          )
        );

        escreverCelula(
          planilha,
          mapa.frete,
          fornecedor.frete
        );

        escreverCelula(
          planilha,
          mapa.prazoEntrega,
          fornecedor.prazoEntrega
        );

        escreverCelula(
          planilha,
          mapa.validadeProposta,
          fornecedor.validadeProposta
        );

        escreverCelula(
          planilha,
          mapa.condicaoPagamento,
          fornecedor.condicaoPagamento
        );

        escreverCelula(
          planilha,
          mapa.garantia,
          fornecedor.garantia
        );

        escreverCelula(
          planilha,
          mapa.total,
          numero(
            fornecedor.precoTotal
          )
        );
      }
    );

  return workbook.outputAsync({
    type: "blob",
  });
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
    resultado =
      `${resultado.slice(
        0,
        -3
      )}...`;
  }

  return resultado;
}

function quebrarLinhas(
  valor,
  font,
  tamanho,
  larguraMaxima,
  limite
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
          larguraMaxima
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

  return linhas.slice(
    0,
    limite
  );
}

function desenharCampo(
  page,
  font,
  configuracao,
  valor
) {
  if (
    !configuracao ||
    !texto(
      valor
    )
  ) {
    return;
  }

  const {
    width,
    height,
  } =
    page.getSize();

  const x =
    width *
    configuracao.x;

  const y =
    height *
    configuracao.y;

  const tamanho =
    configuracao.size ||
    8;

  const largura =
    configuracao.largura ||
    100;

  if (
    configuracao.linhas
  ) {
    const linhas =
      quebrarLinhas(
        valor,
        font,
        tamanho,
        largura,
        configuracao.linhas
      );

    linhas.forEach(
      (
        linha,
        indice
      ) => {
        page.drawText(
          linha,
          {
            x,

            y:
              y -
              indice *
                (
                  tamanho +
                  2
                ),

            size:
              tamanho,

            font,

            color:
              rgb(
                0,
                0,
                0
              ),
          }
        );
      }
    );

    return;
  }

  page.drawText(
    cortarTexto(
      valor,
      font,
      tamanho,
      largura
    ),
    {
      x,
      y,
      size:
        tamanho,
      font,

      color:
        rgb(
          0,
          0,
          0
        ),
    }
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

  desenharCampo(
    page,
    font,
    CAMPOS_PDF.empreendimento,
    dados.empreendimento
  );

  desenharCampo(
    page,
    font,
    CAMPOS_PDF.departamento,
    dados.departamento
  );

  desenharCampo(
    page,
    font,
    CAMPOS_PDF.contratante,
    dados.contratante
  );

  desenharCampo(
    page,
    font,
    CAMPOS_PDF.contaOrcamentaria,
    dados.contaOrcamentaria
  );

  desenharCampo(
    page,
    font,
    CAMPOS_PDF.gerenciaResponsavel,
    dados.gerenciaResponsavel
  );

  desenharCampo(
    page,
    font,
    CAMPOS_PDF.descricaoItem,
    dados.descricaoItem
  );

  desenharCampo(
    page,
    font,
    CAMPOS_PDF.quantidade,
    dados.quantidade
  );

  desenharCampo(
    page,
    font,
    CAMPOS_PDF.unidade,
    dados.unidade
  );

  desenharCampo(
    page,
    font,
    CAMPOS_PDF.observacoes,
    dados.observacoes
  );

  desenharCampo(
    page,
    font,
    CAMPOS_PDF.empresaAprovada,
    dados.empresaAprovada
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
        const mapa =
          CAMPOS_PDF.fornecedores[
            indice
          ];

        desenharCampo(
          page,
          font,
          mapa.empresa,
          fornecedor.empresa
        );

        desenharCampo(
          page,
          font,
          mapa.contato,
          fornecedor.contato
        );

        desenharCampo(
          page,
          font,
          mapa.telefone,
          fornecedor.telefone
        );

        desenharCampo(
          page,
          font,
          mapa.email,
          fornecedor.email
        );

        desenharCampo(
          page,
          font,
          mapa.dataProposta,
          formatarData(
            fornecedor.dataProposta
          )
        );

        desenharCampo(
          page,
          font,
          mapa.precoUnitario,
          moeda(
            fornecedor.precoUnitario
          )
        );

        desenharCampo(
          page,
          font,
          mapa.precoTotal,
          moeda(
            fornecedor.precoTotal
          )
        );

        desenharCampo(
          page,
          font,
          mapa.frete,
          fornecedor.frete
        );

        desenharCampo(
          page,
          font,
          mapa.prazoEntrega,
          fornecedor.prazoEntrega
        );

        desenharCampo(
          page,
          font,
          mapa.validadeProposta,
          fornecedor.validadeProposta
        );

        desenharCampo(
          page,
          font,
          mapa.condicaoPagamento,
          fornecedor.condicaoPagamento
        );

        desenharCampo(
          page,
          font,
          mapa.garantia,
          fornecedor.garantia
        );

        desenharCampo(
          page,
          font,
          mapa.total,
          moeda(
            fornecedor.precoTotal
          )
        );
      }
    );

  return pdf.save();
}

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
    ) =>
      pdfFinal.addPage(
        pagina
      )
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
        }" não é um PDF.`
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
      ) =>
        pdfFinal.addPage(
          pagina
        )
    );
  }

  return pdfFinal.save();
}

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
