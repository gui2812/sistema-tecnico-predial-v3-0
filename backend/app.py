from __future__ import annotations

import base64
import json
import posixpath
import re
import shutil
import subprocess
import tempfile
import unicodedata
import zipfile
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader, PdfWriter


# =========================================================
# CONFIGURAÇÕES
# =========================================================

BASE_DIR = Path(__file__).resolve().parent.parent

TEMPLATE_EXCEL = (
    BASE_DIR
    / "public"
    / "templates"
    / "Modelo - Mapa de Cotação.xlsx"
)

NOME_PLANILHA = "Mapa de Cotação"

MAX_ITENS = 9

NS_MAIN = (
    "http://schemas.openxmlformats.org/"
    "spreadsheetml/2006/main"
)

NS_REL_OFFICE = (
    "http://schemas.openxmlformats.org/"
    "officeDocument/2006/relationships"
)

NS_REL_PACKAGE = (
    "http://schemas.openxmlformats.org/"
    "package/2006/relationships"
)

NS_XML = (
    "http://www.w3.org/XML/1998/namespace"
)

ET.register_namespace(
    "",
    NS_MAIN,
)

ET.register_namespace(
    "r",
    NS_REL_OFFICE,
)

app = FastAPI(
    title="Sistema Técnico Predial — Backend",
    version="4.0.0",
)

import os

# Configure a variável de ambiente ALLOWED_ORIGINS no seu deploy,
# com o(s) domínio(s) reais separados por vírgula, ex.:
# ALLOWED_ORIGINS=https://sistema-jk1455.vercel.app,http://localhost:5173
ALLOWED_ORIGINS = [
    origem.strip()
    for origem in os.environ.get(
        "ALLOWED_ORIGINS", "http://localhost:5173"
    ).split(",")
    if origem.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# UTILIDADES GERAIS
# =========================================================

def qname(
    namespace: str,
    nome: str,
) -> str:
    return (
        f"{{{namespace}}}"
        f"{nome}"
    )


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


def numero_xml(
    valor: Any,
) -> str:
    numero = numero_decimal(
        valor
    )

    if numero.is_integer():
        return str(
            int(
                numero
            )
        )

    return format(
        numero,
        ".15g",
    )


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
            fornecedores[
                0
            ].get(
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
# NORMALIZAÇÃO DOS ITENS
# =========================================================

def normalizar_itens(
    dados: dict[str, Any],
) -> list[dict[str, Any]]:
    itens_recebidos = (
        dados.get(
            "itens"
        )
        or []
    )

    if (
        isinstance(
            itens_recebidos,
            list,
        )
        and itens_recebidos
    ):
        return [
            {
                "descricao":
                    texto(
                        item.get(
                            "descricao"
                        )
                    ),

                "quantidade":
                    numero_decimal(
                        item.get(
                            "quantidade"
                        )
                    ),

                "unidade":
                    texto(
                        item.get(
                            "unidade"
                        )
                    ),
            }
            for item in itens_recebidos[
                :MAX_ITENS
            ]
        ]

    # Compatibilidade com a tela antiga.
    return [
        {
            "descricao":
                texto(
                    dados.get(
                        "descricaoItem"
                    )
                ),

            "quantidade":
                numero_decimal(
                    dados.get(
                        "quantidade"
                    )
                ),

            "unidade":
                texto(
                    dados.get(
                        "unidade"
                    )
                ),
        }
    ]


# =========================================================
# CÁLCULOS DOS PREÇOS
# =========================================================

def obter_preco_item(
    fornecedor: dict[str, Any],
    indice_item: int,
) -> dict[str, Any]:
    precos_itens = (
        fornecedor.get(
            "precosItens"
        )
        or []
    )

    if (
        indice_item
        < len(
            precos_itens
        )
    ):
        return (
            precos_itens[
                indice_item
            ]
            or {}
        )

    # Compatibilidade com a tela antiga.
    if indice_item == 0:
        return {
            "precoUnitario":
                fornecedor.get(
                    "precoUnitario"
                ),

            "precoTotal":
                fornecedor.get(
                    "precoTotal"
                ),
        }

    return {}


def obter_preco_unitario_item(
    fornecedor: dict[str, Any],
    item: dict[str, Any],
    indice_item: int,
) -> float:
    preco = obter_preco_item(
        fornecedor,
        indice_item,
    )

    preco_unitario = numero_decimal(
        preco.get(
            "precoUnitario"
        )
    )

    preco_total = numero_decimal(
        preco.get(
            "precoTotal"
        )
    )

    quantidade = numero_decimal(
        item.get(
            "quantidade"
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


def calcular_subtotal_item(
    fornecedor: dict[str, Any],
    item: dict[str, Any],
    indice_item: int,
) -> float:
    quantidade = numero_decimal(
        item.get(
            "quantidade"
        )
    )

    preco_unitario = obter_preco_unitario_item(
        fornecedor,
        item,
        indice_item,
    )

    return (
        quantidade
        * preco_unitario
    )


def calcular_total_fornecedor(
    fornecedor: dict[str, Any],
    itens: list[dict[str, Any]],
) -> float:
    subtotais = sum(
        calcular_subtotal_item(
            fornecedor,
            item,
            indice_item,
        )
        for indice_item, item in enumerate(
            itens
        )
    )

    return (
        subtotais
        + valor_frete_numerico(
            fornecedor.get(
                "frete"
            )
        )
    )


# =========================================================
# LOCALIZAÇÃO DA PLANILHA DENTRO DO XLSX
# =========================================================

def localizar_xml_planilha(
    arquivo_excel: zipfile.ZipFile,
    nome_planilha: str,
) -> str:
    workbook_xml = arquivo_excel.read(
        "xl/workbook.xml"
    )

    workbook_root = ET.fromstring(
        workbook_xml
    )

    sheets = workbook_root.find(
        qname(
            NS_MAIN,
            "sheets",
        )
    )

    if sheets is None:
        raise RuntimeError(
            "O Excel modelo não possui planilhas."
        )

    relacionamento_id = None

    for sheet in sheets.findall(
        qname(
            NS_MAIN,
            "sheet",
        )
    ):
        if (
            sheet.attrib.get(
                "name"
            )
            == nome_planilha
        ):
            relacionamento_id = sheet.attrib.get(
                qname(
                    NS_REL_OFFICE,
                    "id",
                )
            )

            break

    if not relacionamento_id:
        raise RuntimeError(
            (
                "A planilha "
                f"'{nome_planilha}' "
                "não foi encontrada no Excel modelo."
            )
        )

    rels_xml = arquivo_excel.read(
        "xl/_rels/workbook.xml.rels"
    )

    rels_root = ET.fromstring(
        rels_xml
    )

    target = None

    for relacionamento in rels_root.findall(
        qname(
            NS_REL_PACKAGE,
            "Relationship",
        )
    ):
        if (
            relacionamento.attrib.get(
                "Id"
            )
            == relacionamento_id
        ):
            target = relacionamento.attrib.get(
                "Target"
            )

            break

    if not target:
        raise RuntimeError(
            "Não foi possível localizar o XML da planilha."
        )

    target = target.lstrip(
        "/"
    )

    if target.startswith(
        "xl/"
    ):
        return posixpath.normpath(
            target
        )

    return posixpath.normpath(
        posixpath.join(
            "xl",
            target,
        )
    )


# =========================================================
# MANIPULAÇÃO PONTUAL DAS CÉLULAS
# =========================================================

def indice_coluna(
    referencia: str,
) -> int:
    letras = "".join(
        caractere
        for caractere in referencia
        if caractere.isalpha()
    )

    resultado = 0

    for caractere in letras.upper():
        resultado = (
            resultado
            * 26
            + ord(
                caractere
            )
            - ord(
                "A"
            )
            + 1
        )

    return resultado


def numero_linha(
    referencia: str,
) -> int:
    numeros = "".join(
        caractere
        for caractere in referencia
        if caractere.isdigit()
    )

    return int(
        numeros
    )


def obter_sheet_data(
    root: ET.Element,
) -> ET.Element:
    sheet_data = root.find(
        qname(
            NS_MAIN,
            "sheetData",
        )
    )

    if sheet_data is None:
        raise RuntimeError(
            "A estrutura da planilha modelo é inválida."
        )

    return sheet_data


def garantir_linha(
    sheet_data: ET.Element,
    linha: int,
) -> ET.Element:
    for row in sheet_data.findall(
        qname(
            NS_MAIN,
            "row",
        )
    ):
        if (
            int(
                row.attrib.get(
                    "r",
                    "0",
                )
            )
            == linha
        ):
            return row

    nova_linha = ET.Element(
        qname(
            NS_MAIN,
            "row",
        ),
        {
            "r":
                str(
                    linha
                ),
        },
    )

    inserido = False

    for indice, row in enumerate(
        list(
            sheet_data
        )
    ):
        if (
            int(
                row.attrib.get(
                    "r",
                    "0",
                )
            )
            > linha
        ):
            sheet_data.insert(
                indice,
                nova_linha,
            )

            inserido = True
            break

    if not inserido:
        sheet_data.append(
            nova_linha
        )

    return nova_linha


def garantir_celula(
    sheet_data: ET.Element,
    referencia: str,
) -> ET.Element:
    linha = garantir_linha(
        sheet_data,
        numero_linha(
            referencia
        ),
    )

    for celula in linha.findall(
        qname(
            NS_MAIN,
            "c",
        )
    ):
        if (
            celula.attrib.get(
                "r"
            )
            == referencia
        ):
            return celula

    nova_celula = ET.Element(
        qname(
            NS_MAIN,
            "c",
        ),
        {
            "r":
                referencia,
        },
    )

    coluna_nova = indice_coluna(
        referencia
    )

    inserido = False

    for indice, celula in enumerate(
        list(
            linha
        )
    ):
        referencia_atual = celula.attrib.get(
            "r",
            "",
        )

        if (
            referencia_atual
            and indice_coluna(
                referencia_atual
            )
            > coluna_nova
        ):
            linha.insert(
                indice,
                nova_celula,
            )

            inserido = True
            break

    if not inserido:
        linha.append(
            nova_celula
        )

    return nova_celula


def remover_valores_celula(
    celula: ET.Element,
    remover_formula: bool,
) -> None:
    tags_remover = {
        qname(
            NS_MAIN,
            "v",
        ),

        qname(
            NS_MAIN,
            "is",
        ),
    }

    if remover_formula:
        tags_remover.add(
            qname(
                NS_MAIN,
                "f",
            )
        )

    for filho in list(
        celula
    ):
        if filho.tag in tags_remover:
            celula.remove(
                filho
            )


def definir_texto(
    sheet_data: ET.Element,
    referencia: str,
    valor: Any,
) -> None:
    celula = garantir_celula(
        sheet_data,
        referencia,
    )

    remover_valores_celula(
        celula,
        remover_formula=True,
    )

    celula.attrib[
        "t"
    ] = "inlineStr"

    elemento_is = ET.SubElement(
        celula,
        qname(
            NS_MAIN,
            "is",
        ),
    )

    elemento_t = ET.SubElement(
        elemento_is,
        qname(
            NS_MAIN,
            "t",
        ),
    )

    valor_texto = texto(
        valor
    )

    if (
        valor_texto.startswith(
            " "
        )
        or valor_texto.endswith(
            " "
        )
        or "\n" in valor_texto
    ):
        elemento_t.attrib[
            qname(
                NS_XML,
                "space",
            )
        ] = "preserve"

    elemento_t.text = valor_texto


def definir_numero(
    sheet_data: ET.Element,
    referencia: str,
    valor: Any,
) -> None:
    celula = garantir_celula(
        sheet_data,
        referencia,
    )

    remover_valores_celula(
        celula,
        remover_formula=True,
    )

    celula.attrib.pop(
        "t",
        None,
    )

    elemento_v = ET.SubElement(
        celula,
        qname(
            NS_MAIN,
            "v",
        ),
    )

    elemento_v.text = numero_xml(
        valor
    )


def limpar_celula(
    sheet_data: ET.Element,
    referencia: str,
) -> None:
    celula = garantir_celula(
        sheet_data,
        referencia,
    )

    remover_valores_celula(
        celula,
        remover_formula=True,
    )

    celula.attrib.pop(
        "t",
        None,
    )


def atualizar_cache_formula(
    sheet_data: ET.Element,
    referencia: str,
    valor: Any,
) -> None:
    celula = garantir_celula(
        sheet_data,
        referencia,
    )

    formula = celula.find(
        qname(
            NS_MAIN,
            "f",
        )
    )

    if formula is None:
        definir_numero(
            sheet_data,
            referencia,
            valor,
        )

        return

    remover_valores_celula(
        celula,
        remover_formula=False,
    )

    celula.attrib.pop(
        "t",
        None,
    )

    elemento_v = ET.SubElement(
        celula,
        qname(
            NS_MAIN,
            "v",
        ),
    )

    elemento_v.text = numero_xml(
        valor
    )


def definir_valor_generico(
    sheet_data: ET.Element,
    referencia: str,
    valor: Any,
) -> None:
    if isinstance(
        valor,
        (
            int,
            float,
        ),
    ):
        definir_numero(
            sheet_data,
            referencia,
            valor,
        )

        return

    definir_texto(
        sheet_data,
        referencia,
        valor,
    )


# =========================================================
# PREENCHIMENTO DO XML DA PLANILHA
# =========================================================

def preencher_planilha_xml(
    sheet_xml: bytes,
    dados: dict[str, Any],
    consolidar_formulas: bool,
) -> bytes:
    root = ET.fromstring(
        sheet_xml
    )

    sheet_data = obter_sheet_data(
        root
    )

    # =====================================================
    # DADOS FIXOS PRESERVADOS DO TEMPLATE
    # =====================================================
    #
    # E5 = Empreendimento
    # E6 = Departamento
    # E7 = Contratante
    # E9 = Gerência Responsável
    #
    # Esses campos não são alterados.

    # Conta Orçamentária.
    definir_texto(
        sheet_data,
        "E8",
        dados.get(
            "contaOrcamentaria"
        ),
    )

    # =====================================================
    # ITENS COTADOS
    # =====================================================

    itens = normalizar_itens(
        dados
    )

    for indice_item in range(
        MAX_ITENS
    ):
        linha = (
            12
            + indice_item
        )

        if (
            indice_item
            < len(
                itens
            )
        ):
            item = itens[
                indice_item
            ]

            definir_texto(
                sheet_data,
                f"B{linha}",
                item[
                    "descricao"
                ],
            )

            definir_numero(
                sheet_data,
                f"I{linha}",
                item[
                    "quantidade"
                ],
            )

            definir_texto(
                sheet_data,
                f"J{linha}",
                item[
                    "unidade"
                ],
            )

        else:
            limpar_celula(
                sheet_data,
                f"B{linha}",
            )

            limpar_celula(
                sheet_data,
                f"I{linha}",
            )

            limpar_celula(
                sheet_data,
                f"J{linha}",
            )

    # =====================================================
    # FORNECEDORES
    # =====================================================

    fornecedores = (
        dados.get(
            "fornecedores"
        )
        or []
    )[
        :3
    ]

    colunas_unitario = [
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

    for indice_fornecedor in range(
        3
    ):
        fornecedor = (
            fornecedores[
                indice_fornecedor
            ]
            if indice_fornecedor
            < len(
                fornecedores
            )
            else {}
        )

        coluna_unitario = colunas_unitario[
            indice_fornecedor
        ]

        coluna_subtotal = colunas_subtotal[
            indice_fornecedor
        ]

        if fornecedor:
            definir_texto(
                sheet_data,
                f"{coluna_unitario}5",
                fornecedor.get(
                    "empresa"
                ),
            )

            definir_texto(
                sheet_data,
                f"{coluna_unitario}6",
                fornecedor.get(
                    "contato"
                ),
            )

            definir_texto(
                sheet_data,
                f"{coluna_unitario}7",
                fornecedor.get(
                    "telefone"
                ),
            )

            definir_texto(
                sheet_data,
                f"{coluna_unitario}8",
                fornecedor.get(
                    "email"
                ),
            )

            definir_texto(
                sheet_data,
                f"{coluna_unitario}9",
                data_br(
                    fornecedor.get(
                        "dataProposta"
                    )
                ),
            )

        else:
            for linha in [
                5,
                6,
                7,
                8,
                9,
            ]:
                limpar_celula(
                    sheet_data,
                    f"{coluna_unitario}{linha}",
                )

        # Preços unitários e subtotais:
        # linhas 12 até 20.

        for indice_item in range(
            MAX_ITENS
        ):
            linha = (
                12
                + indice_item
            )

            if (
                fornecedor
                and indice_item
                < len(
                    itens
                )
            ):
                item = itens[
                    indice_item
                ]

                unitario = obter_preco_unitario_item(
                    fornecedor,
                    item,
                    indice_item,
                )

                subtotal = calcular_subtotal_item(
                    fornecedor,
                    item,
                    indice_item,
                )

            else:
                unitario = 0
                subtotal = 0

            definir_numero(
                sheet_data,
                f"{coluna_unitario}{linha}",
                unitario,
            )

            if consolidar_formulas:
                definir_numero(
                    sheet_data,
                    f"{coluna_subtotal}{linha}",
                    subtotal,
                )

            else:
                atualizar_cache_formula(
                    sheet_data,
                    f"{coluna_subtotal}{linha}",
                    subtotal,
                )

        # Dados comerciais.

        frete = (
            valor_frete_excel(
                fornecedor.get(
                    "frete"
                )
            )
            if fornecedor
            else "N/A"
        )

        definir_valor_generico(
            sheet_data,
            f"{coluna_unitario}22",
            frete,
        )

        definir_texto(
            sheet_data,
            f"{coluna_unitario}23",
            fornecedor.get(
                "prazoEntrega"
            )
            if fornecedor
            else "",
        )

        definir_texto(
            sheet_data,
            f"{coluna_unitario}24",
            fornecedor.get(
                "validadeProposta"
            )
            if fornecedor
            else "",
        )

        definir_texto(
            sheet_data,
            f"{coluna_unitario}25",
            fornecedor.get(
                "condicaoPagamento"
            )
            if fornecedor
            else "",
        )

        definir_texto(
            sheet_data,
            f"{coluna_unitario}26",
            fornecedor.get(
                "garantia"
            )
            if fornecedor
            else "",
        )

        total = (
            calcular_total_fornecedor(
                fornecedor,
                itens,
            )
            if fornecedor
            else 0
        )

        if consolidar_formulas:
            definir_numero(
                sheet_data,
                celulas_total[
                    indice_fornecedor
                ],
                total,
            )

        else:
            atualizar_cache_formula(
                sheet_data,
                celulas_total[
                    indice_fornecedor
                ],
                total,
            )

    # =====================================================
    # OBSERVAÇÕES E EMPRESA APROVADA
    # =====================================================

    definir_texto(
        sheet_data,
        "B31",
        dados.get(
            "observacoes"
        ),
    )

    definir_texto(
        sheet_data,
        "O37",
        dados.get(
            "empresaAprovada"
        ),
    )

    return ET.tostring(
        root,
        encoding="utf-8",
        xml_declaration=True,
    )


# =========================================================
# GERAÇÃO DO EXCEL USANDO O MODELO ORIGINAL
# =========================================================

def gerar_excel_a_partir_modelo(
    caminho_saida: Path,
    dados: dict[str, Any],
    consolidar_formulas: bool,
) -> None:
    if not TEMPLATE_EXCEL.exists():
        raise RuntimeError(
            "Template Excel não encontrado."
        )

    with zipfile.ZipFile(
        TEMPLATE_EXCEL,
        "r",
    ) as arquivo_origem:
        caminho_sheet_xml = localizar_xml_planilha(
            arquivo_origem,
            NOME_PLANILHA,
        )

        with zipfile.ZipFile(
            caminho_saida,
            "w",
        ) as arquivo_saida:
            for info in arquivo_origem.infolist():
                conteudo = arquivo_origem.read(
                    info.filename
                )

                if (
                    info.filename
                    == caminho_sheet_xml
                ):
                    conteudo = preencher_planilha_xml(
                        conteudo,
                        dados,
                        consolidar_formulas=
                            consolidar_formulas,
                    )

                # Todos os demais arquivos internos do Excel
                # são copiados sem alteração:
                #
                # imagens
                # desenhos
                # quadros de aprovação
                # estilos
                # bordas
                # cores
                # mesclagens
                # configurações de impressão

                arquivo_saida.writestr(
                    info,
                    conteudo,
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

    if not upload.filename.lower().endswith(
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
            "4.0.0",

        "itens_por_mapa":
            MAX_ITENS,

        "geracao_excel":
            "modelo-original-com-edicao-pontual-do-xml",

        "geracao_pdf":
            "excel-original-preenchido-convertido",
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

        "versao":
            "4.0.0",

        "itens_por_mapa":
            MAX_ITENS,

        "preserva_layout_original":
            True,

        "edicao_xlsx":
            "xml-pontual-sem-openpyxl-save",

        "geracao_pdf":
            "somente-a-partir-do-excel-original-preenchido",
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

    try:
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
                or "Cotacao"
            )

            # ==============================================
            # EXCEL FINAL PARA DOWNLOAD
            # ==============================================
            #
            # Mantém as fórmulas originais e atualiza
            # os valores em cache.

            caminho_excel = (
                pasta
                / f"{nome_base}.xlsx"
            )

            gerar_excel_a_partir_modelo(
                caminho_excel,
                dados,
                consolidar_formulas=False,
            )

            # ==============================================
            # EXCEL TEMPORÁRIO PARA GERAR O PDF
            # ==============================================
            #
            # Usa novamente o modelo original.
            # Consolida subtotais e totais para evitar
            # divergências no LibreOffice headless.

            caminho_excel_pdf = (
                pasta
                / (
                    f"{nome_base}"
                    " - conversao-pdf.xlsx"
                )
            )

            gerar_excel_a_partir_modelo(
                caminho_excel_pdf,
                dados,
                consolidar_formulas=True,
            )

            # ==============================================
            # PDF GERADO EXCLUSIVAMENTE A PARTIR DO EXCEL
            # ==============================================

            caminho_pdf_convertido = converter_excel_para_pdf(
                caminho_excel_pdf,
                pasta,
            )

            caminho_pdf_mapa = (
                pasta
                / f"{nome_base}.pdf"
            )

            shutil.copy2(
                caminho_pdf_convertido,
                caminho_pdf_mapa,
            )

            # ==============================================
            # PROPOSTAS ANEXADAS
            # ==============================================

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

            # ==============================================
            # PDF FINAL COM PROPOSTAS
            # ==============================================

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

    except HTTPException:
        raise

    except Exception as erro:
        raise HTTPException(
            status_code=500,
            detail=(
                "Não foi possível gerar o mapa de cotação. "
                f"Detalhe técnico: {erro}"
            ),
        ) from erro
