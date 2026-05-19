import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function dinheiroParaNumero(v) {
  return Number(String(v || "0").replace(/\./g, "").replace(",", ".")) || 0;
}

function brl(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data = new Date()) {
  try {
    return new Date(data).toLocaleDateString("pt-BR");
  } catch {
    return "";
  }
}

function textoSeguro(v, fallback = "-") {
  const texto = String(v ?? "").trim();
  return texto || fallback;
}

function totalItem(item) {
  return Number(item.quantidade || 0) * dinheiroParaNumero(item.valorUnitario);
}

function numeroSolicitacao(item) {
  const numero = String(item?.solicitacaoNumero || item?.solicitacaoId || "").trim();
  if (!numero) return "-";
  return `#${numero}`;
}

function corStatus(status) {
  const cores = {
    Nova: [255, 247, 237],
    "Em análise": [254, 243, 199],
    Aprovada: [220, 252, 231],
    Reprovada: [255, 228, 230],
    Comprada: [219, 234, 254],
    Entregue: [204, 251, 241],
    Cancelada: [241, 245, 249],
  };

  return cores[status] || [241, 245, 249];
}

function corTextoStatus(status) {
  const cores = {
    Nova: [146, 64, 14],
    "Em análise": [146, 64, 14],
    Aprovada: [4, 120, 87],
    Reprovada: [190, 18, 60],
    Comprada: [30, 64, 175],
    Entregue: [15, 118, 110],
    Cancelada: [71, 85, 105],
  };

  return cores[status] || [71, 85, 105];
}

async function carregarImagemBase64(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Imagem não encontrada: ${url}`);
    }

    const blob = await response.blob();

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("Não foi possível carregar a logo do relatório:", err);
    return null;
  }
}

function formatoImagem(base64 = "") {
  const texto = String(base64 || "").toLowerCase();

  if (texto.startsWith("data:image/png")) return "PNG";
  if (texto.startsWith("data:image/webp")) return "WEBP";

  return "JPEG";
}

function montarItens(solicitacoes = []) {
  return solicitacoes.flatMap((sol) =>
    (sol.itens || []).map((item) => ({
      ...item,
      solicitacaoNumero: sol.numero || sol.id,
      solicitante: sol.solicitante || "-",
      prioridade: sol.prioridade || "-",
      dataSolicitacao: sol.data || "-",
      area: sol.setor || sol.areaSolicitante || "-",
    }))
  );
}

function textoDescricao(item) {
  const linhas = [
    textoSeguro(item.descricao),
    item.marca ? `Marca: ${item.marca}` : "Marca: -",
    `Solicitação ${numeroSolicitacao(item)} • Solicitante: ${textoSeguro(item.solicitante)}`,
  ];

  return linhas.join("\n");
}

function desenharCardResumo(doc, x, y, titulo, valor, largura, sigla) {
  const teal = [13, 128, 122];
  const navy = [10, 31, 68];
  const slate = [71, 85, 105];

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(x, y, largura, 24, 2, 2, "FD");

  doc.setFillColor(204, 251, 241);
  doc.roundedRect(x + 4, y + 6, 10, 10, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...teal);
  doc.text(sigla, x + 9, y + 12.3, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(...slate);

  const tituloLinhas = doc.splitTextToSize(String(titulo), largura - 20);
  doc.text(tituloLinhas, x + 18, y + 8.5);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...navy);

  const valorTexto = String(valor);
  const valorFonte = valorTexto.length > 12 ? 10 : 12.5;

  doc.setFontSize(valorFonte);
  doc.text(valorTexto, x + largura - 4, y + 18, { align: "right" });
}

function desenharRodape(doc, pageWidth, pageHeight, margin) {
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Relatório gerado pelo Sistema Técnico Predial", margin + 2, pageHeight - 7);
  doc.text("Edifício JK 1455", pageWidth / 2, pageHeight - 7, { align: "center" });
  doc.text("Página 1 de 1", pageWidth - margin, pageHeight - 7, { align: "right" });
}

export async function gerarPDFAreaSolicitante({
  area,
  solicitacoes = [],
  usuario = "",
  logoUrl = "/logo-jk1455.jpg",
}) {
  const itens = montarItens(solicitacoes);
  const totalGeral = itens.reduce((soma, item) => soma + totalItem(item), 0);
  const quantidadeSolicitacoes = solicitacoes.length;
  const quantidadeItens = itens.length;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const navy = [10, 31, 68];
  const teal = [13, 128, 122];
  const darkTeal = [0, 105, 92];
  const slate = [71, 85, 105];

  const margin = 10;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  const logo = await carregarImagemBase64(logoUrl);

  if (logo) {
    doc.addImage(logo, formatoImagem(logo), margin, 10, 56, 34);
  } else {
    doc.setFillColor(148, 132, 112);
    doc.roundedRect(margin, 10, 56, 34, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("JK 1455", margin + 28, 31, { align: "center" });
  }

  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Relatório de Solicitações por Área", 72, 15);

  doc.setDrawColor(...teal);
  doc.setLineWidth(0.45);
  doc.line(72, 20, 175, 20);

  doc.setFontSize(11.5);
  doc.setTextColor(...darkTeal);
  doc.text("Edifício JK 1455", 72, 27);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...slate);

  doc.text("Área:", 72, 34);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkTeal);
  doc.text(textoSeguro(area), 82, 34);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...slate);
  doc.text("Emitido em:", 72, 40);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkTeal);
  doc.text(formatarData(new Date()), 91, 40);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...slate);
  doc.text("Emitido por:", 72, 46);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkTeal);
  doc.text(textoSeguro(usuario, "Sistema"), 91, 46);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...navy);
  doc.text("Resumo executivo", 204, 13);

  // cards do resumo - corrigidos
  desenharCardResumo(doc, 176, 23, "Itens", quantidadeItens, 36, "IT");
  desenharCardResumo(doc, 215, 23, "Solicitações", quantidadeSolicitacoes, 36, "SL");
  desenharCardResumo(doc, 254, 23, "Valor total estimado", brl(totalGeral), 33, "R$");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...navy);
  doc.text(`Detalhamento de itens – ${textoSeguro(area)}`, margin + 8, 58);

  doc.setDrawColor(...teal);
  doc.line(margin + 65, 57, pageWidth - margin, 57);

  const body = itens.map((item) => [
    `${numeroSolicitacao(item)}\n${textoSeguro(item.dataSolicitacao)}`,
    textoSeguro(item.solicitante),
    textoSeguro(item.quantidade),
    textoSeguro(item.unidade),
    textoDescricao(item),
    textoSeguro(item.local),
    dinheiroParaNumero(item.valorUnitario)
      ? brl(dinheiroParaNumero(item.valorUnitario))
      : "-",
    brl(totalItem(item)),
    textoSeguro(item.status),
  ]);

  autoTable(doc, {
    startY: 62,
    head: [
      [
        "Solicitação",
        "Solicitante",
        "Qtd",
        "Un.",
        "Descrição",
        "Local de aplicação",
        "Valor unitário",
        "Valor total",
        "Status",
      ],
    ],
    body: body.length
      ? body
      : [["-", "-", "-", "-", "Nenhum item encontrado", "-", "-", "-", "-"]],
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 2.3,
      textColor: [15, 23, 42],
      lineColor: [214, 221, 230],
      lineWidth: 0.22,
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: navy,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    bodyStyles: {
      minCellHeight: 14,
    },
    columnStyles: {
      0: { cellWidth: 27, halign: "center" },
      1: { cellWidth: 32, halign: "center" },
      2: { cellWidth: 15, halign: "center" },
      3: { cellWidth: 13, halign: "center" },
      4: { cellWidth: 75 },
      5: { cellWidth: 38, halign: "center" },
      6: { cellWidth: 27, halign: "right" },
      7: { cellWidth: 29, halign: "right" },
      8: { cellWidth: 25, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 8) {
        const status = String(data.cell.raw || "");
        data.cell.styles.fillColor = corStatus(status);
        data.cell.styles.textColor = corTextoStatus(status);
        data.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: margin, right: margin },
  });

  // AJUSTE DE ESPAÇAMENTO FINAL
  let y = doc.lastAutoTable.finalY + 5;

  // reserva espaço melhor para total + observações + rodapé
  const espacoMinimoFinal = 38;
  if (y > pageHeight - espacoMinimoFinal) {
    y = pageHeight - espacoMinimoFinal;
  }

  const totalBoxW = 100;
  const totalBoxX = pageWidth - margin - totalBoxW;

  doc.setFillColor(240, 253, 250);
  doc.setDrawColor(...teal);
  doc.roundedRect(totalBoxX, y, totalBoxW, 15, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...darkTeal);
  doc.text("Total geral da área:", totalBoxX + 12, y + 9.5);

  doc.setFontSize(16);
  doc.setTextColor(...darkTeal);
  doc.text(brl(totalGeral), totalBoxX + totalBoxW - 7, y + 9.8, {
    align: "right",
  });

  const obsY = y + 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...navy);
  doc.text("Observações", margin + 8, obsY);

  doc.setDrawColor(...teal);
  doc.line(margin + 43, obsY - 1, pageWidth - margin, obsY - 1);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...slate);
  doc.text(
    [
      "• Os valores apresentados são estimativas e poderão sofrer alterações conforme cotações e condições comerciais.",
      `• Este relatório contempla apenas as solicitações da área ${textoSeguro(area)}.`,
    ],
    margin + 8,
    obsY + 7
  );

  desenharRodape(doc, pageWidth, pageHeight, margin);

  doc.save(
    `relatorio-solicitacoes-${String(area || "area")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")}.pdf`
  );
}
