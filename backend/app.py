from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openpyxl import load_workbook


BASE_DIR = Path(__file__).resolve().parent.parent

TEMPLATE_EXCEL = (
    BASE_DIR
    / "public"
    / "templates"
    / "Modelo - Mapa de Cotação.xlsx"
)

app = FastAPI(
    title="Sistema Técnico Predial — Backend",
    version="1.0.0",
)


# Durante a configuração inicial, liberamos acesso ao frontend.
# Depois restringiremos para o domínio oficial do sistema.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def serializar_valor(valor: Any) -> Any:
    if valor is None:
        return None

    if isinstance(valor, (str, int, float, bool)):
        return valor

    return str(valor)


@app.get("/")
def inicio():
    return {
        "servico": "Sistema Técnico Predial — Backend",
        "status": "online",
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "template_excel_encontrado": TEMPLATE_EXCEL.exists(),
        "template_excel": str(TEMPLATE_EXCEL),
    }


@app.get("/api/debug/template")
def analisar_template():
    if not TEMPLATE_EXCEL.exists():
        return {
            "status": "erro",
            "mensagem": "Template Excel não encontrado.",
            "caminho_esperado": str(TEMPLATE_EXCEL),
        }

    workbook = load_workbook(
        TEMPLATE_EXCEL,
        data_only=False,
    )

    planilhas = []

    for worksheet in workbook.worksheets:
        celulas_preenchidas = []

        for linha in worksheet.iter_rows():
            for celula in linha:
                if celula.value not in (None, ""):
                    celulas_preenchidas.append(
                        {
                            "celula": celula.coordinate,
                            "valor": serializar_valor(
                                celula.value
                            ),
                            "tipo": celula.data_type,
                        }
                    )

        planilhas.append(
            {
                "nome": worksheet.title,
                "max_linhas": worksheet.max_row,
                "max_colunas": worksheet.max_column,
                "areas_mescladas": [
                    str(area)
                    for area in worksheet.merged_cells.ranges
                ],
                "celulas_preenchidas": celulas_preenchidas,
            }
        )

    return {
        "status": "ok",
        "arquivo": TEMPLATE_EXCEL.name,
        "quantidade_planilhas": len(workbook.sheetnames),
        "planilhas": planilhas,
    }
