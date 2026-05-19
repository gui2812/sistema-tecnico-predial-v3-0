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

function corStatus(status) {
  const cores = {
    Nova: [255, 247, 237],
    "Em análise": [254, 243, 199],
    Aprovada: [220, 252, 231],
    Reprovada: [255, 228, 230],
    Comprada: [224, 231, 255],
    Entregue: [204, 251, 241],
    Cancelada: [241, 245, 249],
  };

  return cores[status] || [241, 245, 249];
}

async function carregarImagemBase64(url) {
  try {
    const response = await fetch(url);
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
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const navy = [10, 31, 68];
  const teal = [13, 128, 122];
  const lightTeal = [236, 253, 245];
  const slate = [71, 85, 105];
  const lightBorder = [226, 232, 240];

  const margin = 14;
  let y = 16;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  const logo = await carregarImagemBase64(logoUrl);

  if (logo) {
    doc.addImage(logo, "JPEG", margin, y, 58, 42);
  } else {
    doc.setFillColor(148, 132, 112);
    doc.roundedRect(margin, y, 58, 42, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("JK 1455", margin + 10, y + 25);
  }

  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.text("Relatório de Solicitações por Área", 88, y + 8);

  doc.setDrawColor(...teal);
  doc.setLineWidth(0.5);
  doc.line(88, y + 13, pageWidth - margin, y + 13);

  doc.setFontSize(14);
  doc.text("Edifício JK 1455", 88, y + 23);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...slate);

  doc.text("Área:", 88, y + 34);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...teal);
  doc.text(textoSeguro(area), 102, y + 34);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...slate);
  doc.text("Emitido em:", 88, y + 42);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...teal);
  doc.text(formatarData(new Date()), 111, y + 42);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...slate);
  doc.text("Emitido por:", 88, y + 50);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...teal);
  doc.text(textoSeguro(usuario, "Sistema"), 111, y + 50);

  y = 76;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...navy);
  doc.text("Resumo executivo", margin, y);

  doc.setDrawColor(...teal);
  doc.line(50, y - 1, pageWidth - margin, y - 1);

  y += 8;

  function card(x, titulo, valor, largura = 55) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...lightBorder);
    doc.roundedRect(x, y, largura, 24, 3, 3, "FD");

    doc.setFillColor(...lightTeal);
    doc.circle(x + 10, y + 12, 7, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...slate);
    doc.text(titulo, x + 22, y + 10);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...teal);
    doc.text(String(valor), x + 22, y + 18);
  }

  card(margin, "Itens", quantidadeItens);
  card(78, "Solicitações", quantidadeSolicitacoes);
  card(142, "Valor total estimado", brl(totalGeral), 54);

  y += 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...navy);
  doc.text(`Detalhamento de itens – ${textoSeguro(area)}`, margin, y);

  doc.setDrawColor(...teal);
  doc.line(75, y - 1, pageWidth - margin, y - 1);

  const body = itens.map((item) => [
    textoSeguro(item.quantidade),
    textoSeguro(item.unidade),
    textoSeguro(item.descricao),
    textoSeguro(item.marca),
    textoSeguro(item.local),
    dinheiroParaNumero(item.valorUnitario)
      ? brl(dinheiroParaNumero(item.valorUnitario))
      : "-",
    brl(totalItem(item)),
    textoSeguro(item.status),
  ]);

  autoTable(doc, {
    startY: y + 7,
    head: [
      [
        "Qtd",
        "Un.",
        "Descrição",
        "Marca / Modelo",
        "Local de aplicação",
        "Valor unitário",
        "Valor total",
        "Status",
      ],
    ],
    body: body.length
      ? body
      : [["-", "-", "Nenhum item encontrado", "-", "-", "-", "-", "-"]],
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      valign: "middle",
    },
    headStyles: {
      fillColor: navy,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 11, halign: "center" },
      1: { cellWidth: 11, halign: "center" },
      2: { cellWidth: 39 },
      3: { cellWidth: 30 },
      4: { cellWidth: 32 },
      5: { cellWidth: 24, halign: "right" },
      6: { cellWidth: 24, halign: "right" },
      7: { cellWidth: 20, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 7) {
        const status = String(data.cell.raw || "");
        data.cell.styles.fillColor = corStatus(status);
        data.cell.styles.textColor = [30, 64, 175];

        if (status === "Aprovada" || status === "Entregue") {
          data.cell.styles.textColor = [4, 120, 87];
        }

        if (status === "Reprovada") {
          data.cell.styles.textColor = [190, 18, 60];
        }
      }
    },
    margin: { left: margin, right: margin },
  });

  y = doc.lastAutoTable.finalY + 8;

  const boxWidth = 88;
  const boxX = pageWidth - margin - boxWidth;

  doc.setFillColor(240, 253, 250);
  doc.setDrawColor(...teal);
  doc.roundedRect(boxX, y, boxWidth, 16, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...navy);
  doc.text("Total geral da área:", boxX + 5, y + 10);

  doc.setFontSize(16);
  doc.setTextColor(...teal);
  doc.text(brl(totalGeral), boxX + boxWidth - 5, y + 10, {
    align: "right",
  });

  y += 28;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...navy);
  doc.text("Observações", margin, y);

  doc.setDrawColor(...teal);
  doc.line(44, y - 1, pageWidth - margin, y - 1);

  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...slate);
  doc.text(
    [
      "Os valores apresentados são estimativas e poderão sofrer alterações conforme cotações e condições comerciais.",
      `Este relatório contempla apenas as solicitações da área ${textoSeguro(area)}.`,
    ],
    margin,
    y
  );

  const footerY = pageHeight - 16;

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Relatório gerado pelo Sistema Técnico Predial", margin, footerY);
  doc.text("Edifício JK 1455", pageWidth / 2, footerY, { align: "center" });
  doc.text("Página 1 de 1", pageWidth - margin, footerY, { align: "right" });

  doc.save(
    `relatorio-solicitacoes-${String(area || "area")
      .toLowerCase()
      .replace(/\s+/g, "-")}.pdf`
  );
}
