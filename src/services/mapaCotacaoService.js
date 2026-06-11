import {
  saveAs,
} from "file-saver";

const API_URL =
  import.meta.env
    .VITE_MAPA_COTACAO_API_URL ||
  "https://sistema-tecnico-predial-backend.onrender.com";

// =========================================================
// CONVERSÃO DE ARQUIVOS
// =========================================================

function base64ParaBlob(
  conteudoBase64,
  mimeType
) {
  const binario =
    atob(
      conteudoBase64
    );

  const bytes =
    new Uint8Array(
      binario.length
    );

  for (
    let indice = 0;
    indice <
    binario.length;
    indice += 1
  ) {
    bytes[
      indice
    ] =
      binario.charCodeAt(
        indice
      );
  }

  return new Blob(
    [
      bytes,
    ],
    {
      type:
        mimeType,
    }
  );
}

function normalizarResultado(
  arquivo,
  mimeType
) {
  if (
    !arquivo?.nome ||
    !arquivo?.base64
  ) {
    throw new Error(
      "O backend não retornou um arquivo válido."
    );
  }

  return {
    nome:
      arquivo.nome,

    blob:
      base64ParaBlob(
        arquivo.base64,
        mimeType
      ),
  };
}

// =========================================================
// LIMPEZA DOS DADOS ANTES DO ENVIO
// =========================================================

function limparFornecedoresParaEnvio(
  fornecedores =
    []
) {
  return fornecedores.map(
    (
      fornecedor
    ) => {
      const {
        arquivo,
        ...dadosFornecedor
      } =
        fornecedor;

      return dadosFornecedor;
    }
  );
}

// =========================================================
// GERAÇÃO DOS ARQUIVOS
// =========================================================

export async function gerarArquivosMapaCotacao(
  dados
) {
  const formData =
    new FormData();

  const dadosSemArquivos = {
    ...dados,

    fornecedores:
      limparFornecedoresParaEnvio(
        dados.fornecedores
      ),
  };

  formData.append(
    "dados_json",
    JSON.stringify(
      dadosSemArquivos
    )
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
        if (
          fornecedor.arquivo
        ) {
          formData.append(
            `proposta${
              indice +
              1
            }`,
            fornecedor.arquivo
          );
        }
      }
    );

  const response =
    await fetch(
      `${API_URL}/api/mapa-cotacao/gerar`,
      {
        method:
          "POST",

        body:
          formData,
      }
    );

  let resposta =
    null;

  try {
    resposta =
      await response.json();
  } catch {
    resposta =
      null;
  }

  if (
    !response.ok
  ) {
    throw new Error(
      resposta?.detail ||
        "Não foi possível gerar os arquivos do mapa de cotação."
    );
  }

  return {
    nomeBase:
      resposta.nomeBase,

    excel:
      normalizarResultado(
        resposta.excel,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ),

    pdfMapa:
      normalizarResultado(
        resposta.pdfMapa,
        "application/pdf"
      ),

    pdfCompleto:
      normalizarResultado(
        resposta.pdfCompleto,
        "application/pdf"
      ),
  };
}

// =========================================================
// DOWNLOAD
// =========================================================

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
