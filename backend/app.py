from __future__ import annotations

import base64
import json
import re
import shutil
import subprocess
import tempfile
import unicodedata
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

app = FastAPI(
    title="Sistema Técnico Predial — Backend",
    version="2.0.0",
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

def texto(valor: Any) -> str:
    return str(valor or "").strip()


def nome_seguro(valor: Any) -> str:
    valor = texto(valor)

    valor = unicodedata.normalize(
        "NFD",
        valor,
    )

    valor = "".join(
        caractere
        for caractere in valor
        if unicodedata.category(caractere) != "Mn"
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


def numero_decimal(valor: Any) -> float:
    if isinstance(valor, (int, float)):
        return float(valor)

    valor = texto(valor)

    if not valor:
        return 0.0

    valor = re.sub(
        r"[^\d,.\-]",
        "",
        valor,
    )

    if "," in valor:
        valor = valor.replace(".", "")
        valor = valor.replace(",", ".")

    try:
        return float(valor)
    except ValueError:
        return 0.0


def valor_frete_excel(valor: Any) -> Any:
    valor_texto = texto(valor)

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


def data_br(valor: Any) -> str:
    valor = texto(valor)

    if not valor:
        return ""

    partes = valor.split("-")

    if len(partes) == 3:
        return (
            f"{partes[2]}"
            f"/{partes[1]}"
            f"/{partes[0]}"
        )

    return valor


def codigo_mapa(dados: dict[str, Any]) -> str:
    ano = texto(
        dados.get("ano")
    )

    numero = texto(
        dados.get("numeroMapa")
    )

    numero = re.sub(
        r"\s+",
        "",
        numero,
    )

    # Evita duplicação quando o usuário digitar:
    # Ano: 2026
    # Número: 2026070
    if ano and numero.startswith(ano):
        return numero

    return f"{ano}{numero}"


def nome_base_mapa(
    dados: dict[str, Any],
) -> str:
    fornecedores = (
        dados.get("fornecedores")
        or []
    )

    empresa = (
        nome_seguro(
            dados.get("empresaAprovada")
        )
        or nome_seguro(
            fornecedores[0].get("empresa")
            if fornecedores
            else ""
        )
        or "Fornecedor"
    )

    identificacao = (
        nome_seguro(
            dados.get("identificacaoMapa")
        )
        or nome_seguro(
            dados.get("descricaoItem")
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
        "nome": caminho.name,
        "base64": base64.b64encode(
            conteudo
        ).decode("ascii"),
    }


# =========================================================
# PREENCHIMENTO DO TEMPLATE EXCEL
# =========================================================

def obter_preco_unitario(
    fornecedor: dict[str, Any],
    quantidade: float,
) -> float:
    preco_unitario = numero_decimal(
        fornecedor.get("precoUnitario")
    )

    preco_total = numero_decimal(
        fornecedor.get("precoTotal")
    )

    if (
        preco_unitario == 0
        and preco_total > 0
        and quantidade > 0
    ):
        return preco_total / quantidade

    return preco_unitario


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

    ws[f"{coluna}5"] = texto(
        fornecedor.get("empresa")
    )

    ws[f"{coluna}6"] = texto(
        fornecedor.get("contato")
    )

    ws[f"{coluna}7"] = texto(
        fornecedor.get("telefone")
    )

    ws[f"{coluna}8"] = texto(
        fornecedor.get("email")
    )

    ws[f"{coluna}9"] = data_br(
        fornecedor.get("dataProposta")
    )

    ws[f"{coluna}12"] = obter_preco_unitario(
        fornecedor,
        quantidade,
    )

    ws[f"{coluna}22"] = valor_frete_excel(
        fornecedor.get("frete")
    )

    ws[f"{coluna}23"] = texto(
        fornecedor.get("prazoEntrega")
    )

    ws[f"{coluna}24"] = texto(
        fornecedor.get("validadeProposta")
    )

    ws[f"{coluna}25"] = texto(
        fornecedor.get("condicaoPagamento")
    )

    ws[f"{coluna}26"] = texto(
        fornecedor.get("garantia")
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
        ws[f"{coluna}{linha}"] = ""

    ws[f"{coluna}12"] = 0

    ws[f"{coluna}22"] = "N/A"
    ws[f"{coluna}23"] = ""
    ws[f"{coluna}24"] = ""
    ws[f"{coluna}25"] = ""
    ws[f"{coluna}26"] = ""


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
        "Mapa de Cotação"
    ]

    # Dados gerais.
    ws["E5"] = texto(
        dados.get("empreendimento")
    )

    ws["E6"] = texto(
        dados.get("departamento")
    )

    ws["E7"] = texto(
        dados.get("contratante")
    )

    ws["E8"] = texto(
        dados.get("contaOrcamentaria")
    )

    ws["E9"] = texto(
        dados.get("gerenciaResponsavel")
    )

    # Primeiro item da tabela.
    quantidade = numero_decimal(
        dados.get("quantidade")
    )

    ws["B12"] = texto(
        dados.get("descricaoItem")
    )

    ws["I12"] = quantidade

    ws["J12"] = texto(
        dados.get("unidade")
    )

    # Limpa linhas adicionais para evitar resíduos antigos.
    for linha in range(
        13,
        21,
    ):
        ws[f"B{linha}"] = ""
        ws[f"I{linha}"] = ""
        ws[f"J{linha}"] = ""

    fornecedores = (
        dados.get("fornecedores")
        or []
    )[:3]

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

    # Área mesclada B31:S32.
    ws["B31"] = texto(
        dados.get("observacoes")
    )

    # Área mesclada O37:S40.
    ws["O37"] = texto(
        dados.get("empresaAprovada")
    )

    # Solicita recálculo ao abrir no Excel ou LibreOffice.
    workbook.calculation.fullCalcOnLoad = True
    workbook.calculation.forceFullCalc = True
    workbook.calculation.calcMode = "auto"

    workbook.save(
        caminho_saida
    )


# =========================================================
# CONVERSÃO EXCEL PARA PDF
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
        (
            "-env:UserInstallation="
            f"file://{pasta_perfil}"
        ),
        "--convert-to",
        "pdf",
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
        resultado.returncode != 0
        or not caminho_pdf.exists()
    ):
        raise RuntimeError(
            "Falha ao converter o Excel em PDF. "
            f"Saída: {resultado.stdout} "
            f"Erro: {resultado.stderr}"
        )

    return caminho_pdf


# =========================================================
# UNIÃO DOS PDFs
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
        "servico": "Sistema Técnico Predial — Backend",
        "status": "online",
        "versao": "2.0.0",
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "template_excel_encontrado": TEMPLATE_EXCEL.exists(),
        "template_excel": str(
            TEMPLATE_EXCEL
        ),
    }


@app.post("/api/mapa-cotacao/gerar")
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
                dados.get("identificacaoMapa")
            )
            or nome_seguro(
                dados.get("descricaoItem")
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

        caminho_pdf_mapa = converter_excel_para_pdf(
            caminho_excel,
            pasta,
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
            "nomeBase": nome_base,

            "excel": serializar_arquivo_base64(
                caminho_excel
            ),

            "pdfMapa": serializar_arquivo_base64(
                caminho_pdf_mapa
            ),

            "pdfCompleto": serializar_arquivo_base64(
                caminho_pdf_completo
            ),
        }
