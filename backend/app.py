from __future__ import annotations

import base64
import json
import re
import shutil
import subprocess
import tempfile
import unicodedata
from copy import copy
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openpyxl import load_workbook
from pypdf import PdfReader, PdfWriter


BASE_DIR = Path(__file__).resolve().parent.parent

TEMPLATE_EXCEL = (
    BASE_DIR
    / "public"
    / "templates"
    / "Modelo - Mapa de Cotação.xlsx"
)

NOME_PLANILHA = "Mapa de Cotação"

app = FastAPI(
    title="Sistema Técnico Predial — Backend",
    version="3.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# UTILIDADES
# =========================================================

def texto(
    valor: Any,
) -> str:
    return str(
        valor
        or ""
    ).strip()


def nome_seguro(
    valor: Any,
) -> str:
    valor = texto(
        valor
    )

    valor = unicodedata.normalize(
        "NFD",
        valor,
    )

    valor = "".join(
        caractere
        for caractere in valor
        if unicodedata.category(
            caractere
        )
        != "Mn"
    )

    valor = re.sub(
        r'[\\/:*?"<>|]',
        "-",
        valor,
    )

    valor = re.sub(
        r"\s+",
        " ",
        valor,
    )

    return valor.strip()


def numero_decimal(
    valor: Any,
) -> float:
    if isinstance(
        valor,
        (
            int,
            float,
        ),
    ):
        return float(
            valor
        )

    valor = texto(
        valor
    )

    if not valor:
        return 0.0

    valor = re.sub(
        r"[^\d,.\-]",
        "",
        valor,
    )

    if "," in valor:
        valor = valor.replace(
            ".",
            "",
        )

        valor = valor.replace(
            ",",
            ".",
        )

    try:
        return float(
            valor
        )

    except ValueError:
        return 0.0


def valor_frete_excel(
    valor: Any,
) -> Any:
    valor_texto = texto(
        valor
    )

    if not valor_texto:
        return "N/A"

    possui_numero = bool(
        re.search(
            r"\d",
            valor_texto,
        )
    )

    if not possui_numero:
        return valor_texto

    return numero_decimal(
        valor_texto
    )


def valor_frete_numerico(
    valor: Any,
) -> float:
    valor_texto = texto(
        valor
    )

    if not valor_texto:
        return 0.0

    possui_numero = bool(
        re.search(
            r"\d",
            valor_texto,
        )
    )

    if not possui_numero:
        return 0.0

    return numero_decimal(
        valor_texto
    )


def data_br(
    valor: Any,
) -> str:
    valor = texto(
        valor
    )

    if not valor:
        return ""

    partes = valor.split(
        "-"
    )

    if len(
        partes
    ) == 3:
        return (
            f"{partes[2]}"
            f"/{partes[1]}"
            f"/{partes[0]}"
        )

    return valor


def codigo_mapa(
    dados: dict[str, Any],
) -> str:
    ano = texto(
        dados.get(
            "ano"
        )
    )

    numero = texto(
        dados.get(
            "numeroMapa"
        )
    )

    numero = re.sub(
        r"\s+",
        "",
        numero,
    )

    if (
        ano
        and numero.startswith(
            ano
        )
    ):
        return numero

    return (
        f"{ano}"
        f"{numero}"
    )


def nome_base_mapa(
    dados: dict[str, Any],
) -> str:
    fornecedores = (
        dados.get(
            "fornecedores"
        )
        or []
    )

    empresa = (
        nome_seguro(
            dados.get(
                "empresaAprovada"
            )
        )
        or nome_seguro(
            fornecedores[0].get(
                "empresa"
            )
            if fornecedores
            else ""
        )
        or "Fornecedor"
    )

    identificacao = (
        nome_seguro(
            dados.get(
                "identificacaoMapa"
            )
        )
        or nome_seguro(
            dados.get(
                "descricaoItem"
            )
        )
        or "Cotacao"
    )

    return (
        f"Mapa {codigo_mapa(dados)}"
        f" - {empresa}"
        f" - {identificacao}"
    )


def serializar_arquivo_base64(
    caminho: Path,
) -> dict[str, str]:
    conteudo = caminho.read_bytes()

    return {
        "nome":
            caminho.name,

        "base64":
            base64.b64encode(
                conteudo
            ).decode(
                "ascii"
            ),
    }


# =========================================================
# FORMATAÇÃO
# =========================================================

def alinhar_sem_perder_estilo(
    ws,
    endereco: str,
    horizontal: str = "left",
    quebrar_texto: bool = False,
) -> None:
    alinhamento = copy(
        ws[
            endereco
        ].alignment
    )

    alinhamento.horizontal = (
        horizontal
    )

    alinhamento.vertical = (
        "center"
    )

    alinhamento.wrap_text = (
        quebrar_texto
    )

    ws[
        endereco
    ].alignment = alinhamento


def aplicar_formatacao_dinamica(
    ws,
) -> None:
    """
    Mantém o layout original do template.

    Modifica somente os alinhamentos necessários
    para os campos preenchidos dinamicamente.
    """

    # ==========================================
    # CONTA ORÇAMENTÁRIA
    # ==========================================
    #
    # B8 = título
    # E8 = valor preenchido
    #
    # Ambos ficam no canto esquerdo.

    alinhar_sem_perder_estilo(
        ws,
        "B8",
        horizontal="left",
        quebrar_texto=True,
    )

    alinhar_sem_perder_estilo(
        ws,
        "E8",
        horizontal="left",
        quebrar_texto=True,
    )

    # ==========================================
    # OBSERVAÇÕES
    # ==========================================
    #
    # B30 = título Observações:
    # B31 = texto digitado pelo usuário
    #
    # Ambos ficam no canto esquerdo.

    alinhar_sem_perder_estilo(
        ws,
        "B30",
        horizontal="left",
        quebrar_texto=True,
    )

    alinhar_sem_perder_estilo(
        ws,
        "B31",
        horizontal="left",
        quebrar_texto=True,
    )

    # ==========================================
    # EMPRESA APROVADA
    # ==========================================
    #
    # Permanece centralizada.

    alinhar_sem_perder_estilo(
        ws,
        "O37",
        horizontal="center",
        quebrar_texto=True,
    )


# =========================================================
# CÁLCULOS
# =========================================================

def obter_preco_unitario(
    fornecedor: dict[str, Any],
    quantidade: float,
) -> float:
    preco_unitario = numero_decimal(
        fornecedor.get(
            "precoUnitario"
        )
    )

    preco_total = numero_decimal(
        fornecedor.get(
            "precoTotal"
        )
    )

    if (
        preco_unitario == 0
        and preco_total > 0
        and quantidade > 0
    ):
        return (
            preco_total
            / quantidade
        )

    return preco_unitario


def calcular_subtotal(
    fornecedor: dict[str, Any],
    quantidade: float,
) -> float:
    preco_unitario = obter_preco_unitario(
        fornecedor,
        quantidade,
    )

    return (
        quantidade
        * preco_unitario
    )


def calcular_total(
    fornecedor: dict[str, Any],
    quantidade: float,
) -> float:
    return (
        calcular_subtotal(
            fornecedor,
            quantidade,
        )
        + valor_frete_numerico(
            fornecedor.get(
                "frete"
            )
        )
    )


# =========================================================
# PREENCHIMENTO DOS FORNECEDORES
# =========================================================

def preencher_fornecedor(
    ws,
    fornecedor: dict[str, Any],
    indice: int,
    quantidade: float,
) -> None:
    colunas = [
        "L",
        "O",
        "R",
    ]

    coluna = colunas[
        indice
    ]

    ws[
        f"{coluna}5"
    ] = texto(
        fornecedor.get(
            "empresa"
        )
    )

    ws[
        f"{coluna}6"
    ] = texto(
        fornecedor.get(
            "contato"
        )
    )

    ws[
        f"{coluna}7"
    ] = texto(
        fornecedor.get(
            "telefone"
        )
    )

    ws[
        f"{coluna}8"
    ] = texto(
        fornecedor.get(
            "email"
        )
    )

    ws[
        f"{coluna}9"
    ] = data_br(
        fornecedor.get(
            "dataProposta"
        )
    )

    # O próprio template calcula:
    #
    # M12 = I12 * L12
    # P12 = I12 * O12
    # S12 = I12 * R12

    ws[
        f"{coluna}12"
    ] = obter_preco_unitario(
        fornecedor,
        quantidade,
    )

    ws[
        f"{coluna}22"
    ] = valor_frete_excel(
        fornecedor.get(
            "frete"
        )
    )

    ws[
        f"{coluna}23"
    ] = texto(
        fornecedor.get(
            "prazoEntrega"
        )
    )

    ws[
        f"{coluna}24"
    ] = texto(
        fornecedor.get(
            "validadeProposta"
        )
    )

    ws[
        f"{coluna}25"
    ] = texto(
        fornecedor.get(
            "condicaoPagamento"
        )
    )

    ws[
        f"{coluna}26"
    ] = texto(
        fornecedor.get(
            "garantia"
        )
    )


def limpar_fornecedor(
    ws,
    indice: int,
) -> None:
    colunas = [
        "L",
        "O",
        "R",
    ]

    coluna = colunas[
        indice
    ]

    for linha in [
        5,
        6,
        7,
        8,
        9,
    ]:
        ws[
            f"{coluna}{linha}"
        ] = ""

    ws[
        f"{coluna}12"
    ] = 0

    ws[
        f"{coluna}22"
    ] = "N/A"

    ws[
        f"{coluna}23"
    ] = ""

    ws[
        f"{coluna}24"
    ] = ""

    ws[
        f"{coluna}25"
    ] = ""

    ws[
        f"{coluna}26"
    ] = ""


# =========================================================
# EXCEL PRINCIPAL PARA DOWNLOAD
# =========================================================

def preencher_excel(
    dados: dict[str, Any],
    caminho_saida: Path,
) -> None:
    if not TEMPLATE_EXCEL.exists():
        raise RuntimeError(
            "Template Excel não encontrado."
        )

    workbook = load_workbook(
        TEMPLATE_EXCEL,
    )

    ws = workbook[
        NOME_PLANILHA
    ]

    # ==========================================
    # DADOS FIXOS
    # ==========================================
    #
    # As células abaixo já vêm prontas no Excel:
    #
    # E5 = Empreendimento
    # E6 = Departamento
    # E7 = Contratante
    # E9 = Gerência Responsável
    #
    # Não sobrescrevemos esses dados.

    # Conta Orçamentária: único campo variável.
    ws[
        "E8"
    ] = texto(
        dados.get(
            "contaOrcamentaria"
        )
    )

    # ==========================================
    # ITEM PRINCIPAL
    # ==========================================

    quantidade = numero_decimal(
        dados.get(
            "quantidade"
        )
    )

    ws[
        "B12"
    ] = texto(
        dados.get(
            "descricaoItem"
        )
    )

    ws[
        "I12"
    ] = quantidade

    ws[
        "J12"
    ] = texto(
        dados.get(
            "unidade"
        )
    )

    # Limpa somente campos editáveis das linhas extras.
    # Fórmulas, bordas e estilos permanecem.

    for linha in range(
        13,
        21,
    ):
        ws[
            f"B{linha}"
        ] = ""

        ws[
            f"I{linha}"
        ] = ""

        ws[
            f"J{linha}"
        ] = ""

    # ==========================================
    # FORNECEDORES
    # ==========================================

    fornecedores = (
        dados.get(
            "fornecedores"
        )
        or []
    )[
        :3
    ]

    for indice in range(
        3
    ):
        if indice < len(
            fornecedores
        ):
            preencher_fornecedor(
                ws,
                fornecedores[
                    indice
                ],
                indice,
                quantidade,
            )

        else:
            limpar_fornecedor(
                ws,
                indice,
            )

    # ==========================================
    # OBSERVAÇÕES
    # ==========================================

    ws[
        "B31"
    ] = texto(
        dados.get(
            "observacoes"
        )
    )

    # ==========================================
    # EMPRESA APROVADA
    # ==========================================

    ws[
        "O37"
    ] = texto(
        dados.get(
            "empresaAprovada"
        )
    )

    aplicar_formatacao_dinamica(
        ws
    )

    # Solicita recálculo ao abrir no Excel.

    workbook.calculation.fullCalcOnLoad = (
        True
    )

    workbook.calculation.forceFullCalc = (
        True
    )

    workbook.calculation.calcMode = (
        "auto"
    )

    workbook.save(
        caminho_saida
    )


# =========================================================
# EXCEL TEMPORÁRIO USADO SOMENTE PARA GERAR O PDF
# =========================================================

def preparar_excel_para_pdf(
    caminho_excel_origem: Path,
    caminho_excel_pdf: Path,
    dados: dict[str, Any],
) -> None:
    """
    O PDF continua sendo gerado exclusivamente pelo Excel.

    O Excel original disponibilizado para download mantém
    suas fórmulas.

    Para a conversão headless, criamos uma cópia temporária
    com os totais consolidados numericamente. Isso evita
    divergências de recálculo do LibreOffice durante a
    exportação automática para PDF.
    """

    shutil.copy2(
        caminho_excel_origem,
        caminho_excel_pdf,
    )

    workbook = load_workbook(
        caminho_excel_pdf,
    )

    ws = workbook[
        NOME_PLANILHA
    ]

    quantidade = numero_decimal(
        dados.get(
            "quantidade"
        )
    )

    fornecedores = (
        dados.get(
            "fornecedores"
        )
        or []
    )[
        :3
    ]

    colunas_preco_unitario = [
        "L",
        "O",
        "R",
    ]

    colunas_subtotal = [
        "M",
        "P",
        "S",
    ]

    celulas_total = [
        "L28",
        "O28",
        "R28",
    ]

    for indice in range(
        3
    ):
        fornecedor = (
            fornecedores[
                indice
            ]
            if indice < len(
                fornecedores
            )
            else {}
        )

        coluna_preco_unitario = (
            colunas_preco_unitario[
                indice
            ]
        )

        coluna_subtotal = (
            colunas_subtotal[
                indice
            ]
        )

        preco_unitario = obter_preco_unitario(
            fornecedor,
            quantidade,
        )

        subtotal = calcular_subtotal(
            fornecedor,
            quantidade,
        )

        total = calcular_total(
            fornecedor,
            quantidade,
        )

        # Preço unitário.

        ws[
            f"{coluna_preco_unitario}12"
        ] = preco_unitario

        # Subtotal da primeira linha.

        ws[
            f"{coluna_subtotal}12"
        ] = subtotal

        # Total final do fornecedor.

        ws[
            celulas_total[
                indice
            ]
        ] = total

    aplicar_formatacao_dinamica(
        ws
    )

    workbook.save(
        caminho_excel_pdf
    )


# =========================================================
# CONVERSÃO DO EXCEL PREENCHIDO PARA PDF
# =========================================================

def converter_excel_para_pdf(
    caminho_excel: Path,
    pasta_saida: Path,
) -> Path:
    pasta_perfil = (
        pasta_saida
        / "libreoffice-profile"
    )

    pasta_perfil.mkdir(
        parents=True,
        exist_ok=True,
    )

    comando = [
        "libreoffice",
        "--headless",
        "--nologo",
        "--nofirststartwizard",
        (
            "-env:UserInstallation="
            f"file://{pasta_perfil}"
        ),
        "--convert-to",
        "pdf:calc_pdf_Export",
        "--outdir",
        str(
            pasta_saida
        ),
        str(
            caminho_excel
        ),
    ]

    resultado = subprocess.run(
        comando,
        check=False,
        capture_output=True,
        text=True,
        timeout=120,
    )

    caminho_pdf = (
        pasta_saida
        / f"{caminho_excel.stem}.pdf"
    )

    if (
        resultado.returncode
        != 0
        or not caminho_pdf.exists()
    ):
        raise RuntimeError(
            "Falha ao converter o Excel preenchido para PDF. "
            f"Saída: {resultado.stdout} "
            f"Erro: {resultado.stderr}"
        )

    return caminho_pdf


# =========================================================
# UNIÃO DOS PDFS
# =========================================================

def unir_pdfs(
    pdf_mapa: Path,
    pdfs_propostas: list[Path],
    caminho_saida: Path,
) -> None:
    writer = PdfWriter()

    caminhos = [
        pdf_mapa,
        *pdfs_propostas,
    ]

    for caminho in caminhos:
        try:
            reader = PdfReader(
                str(
                    caminho
                )
            )

            for pagina in reader.pages:
                writer.add_page(
                    pagina
                )

        except Exception as erro:
            raise RuntimeError(
                (
                    "Não foi possível ler o PDF: "
                    f"{caminho.name}"
                )
            ) from erro

    with caminho_saida.open(
        "wb"
    ) as arquivo_saida:
        writer.write(
            arquivo_saida
        )


async def salvar_upload_pdf(
    upload: UploadFile | None,
    pasta: Path,
    indice: int,
) -> Path | None:
    if (
        upload is None
        or not upload.filename
    ):
        return None

    nome_original = (
        upload.filename
    )

    if not nome_original.lower().endswith(
        ".pdf"
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                f"A proposta {indice} "
                "precisa ser enviada em PDF."
            ),
        )

    destino = (
        pasta
        / f"proposta-{indice}.pdf"
    )

    with destino.open(
        "wb"
    ) as arquivo_destino:
        shutil.copyfileobj(
            upload.file,
            arquivo_destino,
        )

    return destino


# =========================================================
# ROTAS
# =========================================================

@app.get("/")
def inicio():
    return {
        "servico":
            "Sistema Técnico Predial — Backend",

        "status":
            "online",

        "versao":
            "3.2.0",

        "geracao_pdf":
            "excel-preenchido-convertido",

        "alinhamentos":
            "conta-orcamentaria-e-observacoes-a-esquerda",
    }


@app.get(
    "/api/health"
)
def health_check():
    return {
        "status":
            "ok",

        "template_excel_encontrado":
            TEMPLATE_EXCEL.exists(),

        "template_excel":
            str(
                TEMPLATE_EXCEL
            ),

        "geracao_pdf":
            "somente-a-partir-do-excel",

        "preserva_dados_fixos_template":
            True,

        "totais_pdf":
            "consolidados-antes-da-conversao",

        "alinhamentos":
            "conta-orcamentaria-e-observacoes-a-esquerda",
    }


@app.post(
    "/api/mapa-cotacao/gerar"
)
async def gerar_mapa_cotacao(
    dados_json: str = Form(...),
    proposta1: UploadFile | None = File(None),
    proposta2: UploadFile | None = File(None),
    proposta3: UploadFile | None = File(None),
):
    try:
        dados = json.loads(
            dados_json
        )

    except json.JSONDecodeError as erro:
        raise HTTPException(
            status_code=400,
            detail="Dados do formulário inválidos.",
        ) from erro

    with tempfile.TemporaryDirectory() as pasta_temporaria:
        pasta = Path(
            pasta_temporaria
        )

        nome_base = nome_base_mapa(
            dados
        )

        identificacao = (
            nome_seguro(
                dados.get(
                    "identificacaoMapa"
                )
            )
            or nome_seguro(
                dados.get(
                    "descricaoItem"
                )
            )
            or "Cotacao"
        )

        caminho_excel = (
            pasta
            / f"{nome_base}.xlsx"
        )

        preencher_excel(
            dados,
            caminho_excel,
        )

        # O PDF nasce exclusivamente de uma cópia
        # do Excel preenchido.

        caminho_excel_pdf = (
            pasta
            / (
                f"{nome_base}"
                " - conversao-pdf.xlsx"
            )
        )

        preparar_excel_para_pdf(
            caminho_excel,
            caminho_excel_pdf,
            dados,
        )

        caminho_pdf_convertido = converter_excel_para_pdf(
            caminho_excel_pdf,
            pasta,
        )

        # Remove o sufixo técnico do nome entregue ao usuário.

        caminho_pdf_mapa = (
            pasta
            / f"{nome_base}.pdf"
        )

        shutil.copy2(
            caminho_pdf_convertido,
            caminho_pdf_mapa,
        )

        propostas_upload = [
            proposta1,
            proposta2,
            proposta3,
        ]

        pdfs_propostas = []

        for indice, upload in enumerate(
            propostas_upload,
            start=1,
        ):
            pdf = await salvar_upload_pdf(
                upload,
                pasta,
                indice,
            )

            if pdf:
                pdfs_propostas.append(
                    pdf
                )

        caminho_pdf_completo = (
            pasta
            / (
                f"Mapa {codigo_mapa(dados)}"
                f" - {identificacao}"
                " + Prop.pdf"
            )
        )

        unir_pdfs(
            caminho_pdf_mapa,
            pdfs_propostas,
            caminho_pdf_completo,
        )

        return {
            "nomeBase":
                nome_base,

            "excel":
                serializar_arquivo_base64(
                    caminho_excel
                ),

            "pdfMapa":
                serializar_arquivo_base64(
                    caminho_pdf_mapa
                ),

            "pdfCompleto":
                serializar_arquivo_base64(
                    caminho_pdf_completo
                ),
        }
