import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { brl, int, num } from '../utils/formatters';

const EDIFICIO = 'Edifício JK 1455';

function formatDateBR(value) {
  if (!value) return '';
  const [y, m, d] = String(value).split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function getPeriodoTexto(periodo = {}) {
  if (periodo?.texto) return periodo.texto;
  if (periodo?.mesReferencia) return periodo.mesReferencia;
  if (periodo?.dataInicio || periodo?.dataFim) {
    return `${formatDateBR(periodo.dataInicio) || 'Início'} a ${
      formatDateBR(periodo.dataFim) || 'Hoje'
    }`;
  }
  return 'Atual';
}

function header(doc, title, periodo = {}) {
  const periodoTexto =
    typeof periodo === 'string' ? periodo : getPeriodoTexto(periodo);

  const emissao =
    typeof periodo === 'object' && periodo?.dataEmissao
      ? formatDateBR(periodo.dataEmissao)
      : new Date().toLocaleDateString('pt-BR');

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('Sistema Técnico Predial', 14, 12);

  doc.setFontSize(10);
  doc.text(EDIFICIO, 14, 21);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(18);
  doc.text(title, 14, 43);

  doc.setFontSize(10);
  doc.text(`Período: ${periodoTexto} • Emissão: ${emissao}`, 14, 51);
}

function footer(doc, y = null) {
  const h = doc.internal.pageSize.height;
  const finalY = y || h - 33;

  doc.setFontSize(9);
  doc.setTextColor(100);

  doc.text(
    'Observações: _______________________________________________________________',
    14,
    finalY
  );

  doc.text(
    'Assinatura do responsável: ______________________________________',
    14,
    finalY + 11
  );

  doc.text('Relatório gerado pelo Sistema Técnico Predial', 14, finalY + 23);
}

function save(doc, name) {
  footer(doc);
  doc.save(name);
}

function summaryCard(doc, x, y, w, title, value, fill = [239, 246, 255]) {
  doc.setFillColor(...fill);
  doc.roundedRect(x, y, w, 22, 3, 3, 'F');

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.text(title, x + 4, y + 8);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text(String(value), x + 4, y + 17);
}

/* ==============================
   PDF MODERNO - LOCATÁRIOS
============================== */

function formatDiaMes(value) {
  if (!value) return '';
  const texto = String(value);
  if (!texto.includes('-')) return texto;

  const partes = texto.split('-');
  if (partes.length < 3) return texto;

  return `${partes[2]}/${partes[1]}`;
}

function periodoEnergiaLocatarios(medicao, periodo = {}) {
  const inicio =
    medicao?.mes ||
    medicao?.dataAnterior ||
    medicao?.data_anterior ||
    periodo?.dataInicio ||
    '';

  const fim =
    medicao?.dataMedicao ||
    medicao?.data_medicao ||
    periodo?.dataFim ||
    '';

  if (inicio && fim) {
    return `${formatDiaMes(inicio)} - ${formatDiaMes(fim)}`;
  }

  if (periodo?.texto) return periodo.texto;
  if (periodo?.mesReferencia) return periodo.mesReferencia;

  return getPeriodoTexto(periodo);
}

function desenharHeaderLocatarios(doc, { periodoTexto, emissao }) {
  const pageWidth = doc.internal.pageSize.width;

  doc.setFillColor(6, 23, 55);
  doc.rect(0, 0, pageWidth, 34, 'F');

  doc.setFillColor(10, 41, 90);
  doc.roundedRect(10, 8, 16, 16, 3, 3, 'F');

  doc.setDrawColor(52, 211, 235);
  doc.setLineWidth(0.6);
  doc.roundedRect(10, 8, 16, 16, 3, 3, 'S');

  doc.setTextColor(52, 211, 235);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('JK', 18, 18, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('Sistema Técnico Predial', 31, 15);

  doc.setFontSize(10);
  doc.setTextColor(125, 211, 252);
  doc.text(EDIFICIO, 31, 23);

  function cardInfo(x, label, value, w = 36) {
    doc.setDrawColor(96, 165, 250);
    doc.setFillColor(10, 41, 90);
    doc.roundedRect(x, 7, w, 20, 2.5, 2.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(219, 234, 254);
    doc.text(label, x + 5, 14);

    doc.setFontSize(11);
    doc.setTextColor(103, 232, 249);
    doc.text(String(value || '-'), x + 5, 22);
  }

  cardInfo(pageWidth - 90, 'Período', periodoTexto, 48);
  cardInfo(pageWidth - 38, 'Emissão', emissao, 32);

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 34, pageWidth, 8, 'F');
}

function desenharTituloLocatarios(doc) {
  doc.setTextColor(15, 42, 90);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text('Relatório de Medição de', 14, 48);

  doc.setTextColor(25, 80, 180);
  doc.setFontSize(24);
  doc.text('Energia dos Locatários', 14, 60);

  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.7);
  doc.line(14, 64, 40, 64);
}

function cardResumoLocatarios(doc, x, y, w, titulo, valor, subtitulo, cor) {
  const cores = {
    blue: {
      bg: [239, 246, 255],
      border: [147, 197, 253],
      text: [29, 78, 216],
    },
    green: {
      bg: [240, 253, 244],
      border: [134, 239, 172],
      text: [5, 150, 105],
    },
    amber: {
      bg: [255, 251, 235],
      border: [253, 224, 71],
      text: [217, 119, 6],
    },
    purple: {
      bg: [250, 245, 255],
      border: [216, 180, 254],
      text: [126, 34, 206],
    },
  };

  const c = cores[cor] || cores.blue;

  doc.setFillColor(...c.bg);
  doc.setDrawColor(...c.border);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, w, 25, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 64, 100);
  doc.text(titulo, x + 5, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...c.text);
  doc.text(String(valor), x + 5, y + 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(subtitulo, x + 5, y + 22);
}

function rodapeLocatarios(doc, totalPages) {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;

  doc.setDrawColor(226, 232, 240);
  doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

  doc.setFillColor(6, 23, 55);
  doc.rect(0, pageHeight - 9, pageWidth, 9, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text('Relatório gerado pelo Sistema Técnico Predial', 14, pageHeight - 3.5);

  doc.setTextColor(125, 211, 252);
  doc.text(EDIFICIO, pageWidth / 2, pageHeight - 3.5, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - 14, pageHeight - 3.5, {
    align: 'right',
  });
}

function miniHeaderLocatarios(doc, periodoTexto) {
  const pageWidth = doc.internal.pageSize.width;

  doc.setTextColor(15, 42, 90);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Sistema Técnico Predial', 14, 14);

  doc.setTextColor(37, 99, 235);
  doc.text('Relatório de Medição de Energia dos Locatários', pageWidth / 2, 14, {
    align: 'center',
  });

  doc.setTextColor(15, 42, 90);
  doc.text(`Período: ${periodoTexto}`, pageWidth - 14, 14, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 18, pageWidth - 14, 18);
}

/* ==============================
   RELATÓRIOS
============================== */

export function pdfGeradores(registros = [], periodo = {}) {
  const doc = new jsPDF();

  header(doc, 'Relatório de Geradores', periodo);

  const litros = registros.reduce((s, r) => s + Number(r.litros || 0), 0);
  const custo = registros.reduce((s, r) => s + Number(r.custo || 0), 0);

  summaryCard(doc, 14, 62, 55, 'Registros', registros.length);
  summaryCard(doc, 78, 62, 55, 'Litros registrados', `${num(litros)} L`, [240, 253, 250]);
  summaryCard(doc, 142, 62, 55, 'Custo total', brl(custo), [255, 251, 235]);

  autoTable(doc, {
    startY: 96,
    margin: { bottom: 42 },
    head: [['Data', 'Gerador', 'Inicial', 'Final', 'Litros', 'Valor diesel', 'Custo', 'Obs.']],
    body: registros.map((r) => [
      formatDateBR(r.data),
      r.gerador,
      r.horimetroInicial,
      r.horimetroFinal,
      num(r.litros),
      brl(r.valorDiesel),
      brl(r.custo),
      r.observacao || '',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  save(doc, 'relatorio-geradores.pdf');
}

export function pdfDieselTecnico(registros = [], periodo = {}) {
  const doc = new jsPDF();

  header(doc, 'Relatório de Diesel Mensal', periodo);

  const total = registros.reduce((s, r) => s + Number(r.total || 0), 0);
  const horas = registros.reduce((s, r) => s + Number(r.horas || 0), 0);

  summaryCard(doc, 14, 62, 55, 'Registros', registros.length);
  summaryCard(doc, 78, 62, 55, 'Horas totais', `${num(horas, 4)} h`);
  summaryCard(doc, 142, 62, 55, 'Diesel calculado', `${num(total, 3)} L`, [240, 253, 250]);

  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Fórmula: Consumo total mensal de diesel = consumo por hora dos 2 GMGs × tempo de funcionamento convertido em horas.',
    14,
    91,
    { maxWidth: 180 }
  );

  autoTable(doc, {
    startY: 108,
    margin: { bottom: 42 },
    head: [['Data', 'Consumo hora GMGs', 'Tempo', 'Horas decimais', 'Consumo total']],
    body: registros.map((r) => [
      formatDateBR(r.data),
      `${r.consumoHoraGMGs} L/h`,
      r.tempo,
      `${num(r.horas, 4)} h`,
      `${num(r.total, 3)} L`,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  save(doc, 'relatorio-diesel-mensal.pdf');
}

export function pdfFancoil(registros = [], periodo = {}) {
  const doc = new jsPDF();

  header(doc, 'Relatório de Consumo Estimado do Fancoil', periodo);

  const consumo = registros.reduce((s, r) => s + Number(r.consumo || 0), 0);
  const custo = registros.reduce((s, r) => s + Number(r.custo || 0), 0);

  summaryCard(doc, 14, 62, 55, 'Registros', registros.length, [240, 253, 250]);
  summaryCard(doc, 78, 62, 55, 'Consumo estimado', `${num(consumo)} kWh`, [240, 253, 250]);
  summaryCard(doc, 142, 62, 55, 'Custo estimado', brl(custo), [255, 251, 235]);

  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Fórmulas: Consumo estimado mensal = kW × horas por dia × dias úteis. Custo estimado mensal = consumo estimado × preço kWh.',
    14,
    91,
    { maxWidth: 180 }
  );

  autoTable(doc, {
    startY: 108,
    margin: { bottom: 42 },
    head: [['Data', 'Potência kW', 'Horas/dia', 'Dias úteis', 'Preço kWh', 'Consumo', 'Custo']],
    body: registros.map((r) => [
      formatDateBR(r.data),
      r.kw,
      r.horasDia,
      r.diasUteis,
      `R$ ${r.precoKwh}`,
      `${num(r.consumo)} kWh`,
      brl(r.custo),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  save(doc, 'relatorio-fancoil.pdf');
}

export function pdfGas(registros = [], periodo = {}) {
  const doc = new jsPDF();

  header(doc, 'Relatório de Consumo de Gás', periodo);

  const totalKg = registros.reduce((s, r) => s + Number(r.totalKg || 0), 0);
  const comumKg = registros.reduce((s, r) => s + Number(r.comumKg || 0), 0);
  const privativoKg = registros.reduce((s, r) => s + Number(r.privativoKg || 0), 0);

  summaryCard(doc, 14, 62, 55, 'Total convertido', `${num(totalKg)} kg`, [255, 251, 235]);
  summaryCard(doc, 78, 62, 55, 'Área comum', `${num(comumKg)} kg`, [255, 251, 235]);
  summaryCard(doc, 142, 62, 55, 'Área privativa', `${num(privativoKg)} kg`, [255, 251, 235]);

  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Fórmulas: Área comum = (m³ × fator) × 0,05. Área privativa = (m³ × fator) × 0,95.',
    14,
    91,
    { maxWidth: 180 }
  );

  autoTable(doc, {
    startY: 108,
    margin: { bottom: 42 },
    head: [['Data', 'Consumo m³', 'Fator', 'Total kg', 'Área comum kg', 'Área privativa kg']],
    body: registros.map((r) => [
      formatDateBR(r.data),
      r.consumoM3,
      r.fator,
      num(r.totalKg),
      num(r.comumKg),
      num(r.privativoKg),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  save(doc, 'relatorio-gas.pdf');
}

export function pdfLocatarios(medicao, periodo = {}) {
  const doc = new jsPDF();

  const resumo = medicao?.resumo || {};
  const linhas = medicao?.linhas || [];
  const periodoTexto = periodoEnergiaLocatarios(medicao, periodo);
  const emissao = periodo?.dataEmissao
    ? formatDateBR(periodo.dataEmissao)
    : new Date().toLocaleDateString('pt-BR');

  const maiorConsumo = resumo.maior?.unidade || '-';
  const totalConsumido = int(resumo.total || 0);
  const mediaConsumo = int(resumo.media || 0);
  const totalUnidades = resumo.quantidade || linhas.length || 0;

  desenharHeaderLocatarios(doc, { periodoTexto, emissao });
  desenharTituloLocatarios(doc);

  cardResumoLocatarios(doc, 14, 72, 42, 'Unidades', totalUnidades, 'Total de unidades', 'blue');
  cardResumoLocatarios(doc, 61, 72, 47, 'Total consumido', totalConsumido, 'kWh no periodo', 'green');
  cardResumoLocatarios(doc, 113, 72, 42, 'Maior consumo', maiorConsumo, 'Unidade', 'amber');
  cardResumoLocatarios(doc, 160, 72, 36, 'Media', mediaConsumo, 'kWh por unidade', 'purple');

  autoTable(doc, {
    startY: 112,
    margin: {
      top: 24,
      bottom: 18,
      left: 14,
      right: 14,
    },
    head: [['Unidade', 'Anterior (kWh)', 'Atual (kWh)', 'Consumo (kWh)', 'Virou medidor']],
    body: linhas.map((r) => [
      r.unidade,
      int(r.anterior),
      String(r.atual).padStart(5, '0'),
      int(r.consumo),
      r.virou ? 'Sim' : 'Nao',
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 2.1,
      overflow: 'linebreak',
      valign: 'middle',
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [0, 82, 204],
      textColor: [255, 255, 255],
      fontSize: 8.2,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 2.4,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    bodyStyles: {
      minCellHeight: 7.4,
    },
    columnStyles: {
      0: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 38, halign: 'center' },
      2: { cellWidth: 38, halign: 'center' },
      3: { cellWidth: 38, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 38, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index === 4) {
        const virou = String(data.cell.raw || '') === 'Sim';
        data.cell.styles.textColor = virou ? [217, 119, 6] : [5, 150, 105];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    didDrawPage: function () {
      const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;

      if (pageNumber > 1) {
        miniHeaderLocatarios(doc, periodoTexto);
      }
    },
  });

  const totalPages = doc.internal.getNumberOfPages();

  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    rodapeLocatarios(doc, totalPages);
  }

  doc.save('relatorio-locatarios.pdf');
}

export function pdfSolicitacao(sol, periodo = {}) {
  const doc = new jsPDF();

  const statusFinal = (() => {
    const itens = sol?.itens || [];
    if (!itens.length) return sol?.status || 'Nova';
    if (itens.every((i) => i.status === 'Entregue')) return 'Entregue';
    if (itens.every((i) => i.status === 'Reprovada' || i.status === 'Cancelada')) return 'Reprovada';
    if (itens.some((i) => i.status === 'Comprada' || i.status === 'Entregue')) return 'Comprada';
    if (itens.some((i) => i.status === 'Aprovada')) return 'Aprovada';
    if (itens.some((i) => i.status === 'Reprovada')) return 'Em análise';
    return sol?.status || 'Nova';
  })();

  header(doc, 'Solicitação de Material', periodo?.texto || sol?.data || '');

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Área solicitante: ${sol?.setor || ''}`, 14, 62);
  doc.text(`Solicitante: ${sol?.solicitante || ''}`, 14, 70);
  doc.text(`Prioridade: ${sol?.prioridade || ''}`, 14, 78);
  doc.text(`Status geral: ${statusFinal}`, 14, 86);

  autoTable(doc, {
    startY: 98,
    margin: { bottom: 42 },
    head: [['Qtd', 'Un.', 'Descrição', 'Status', 'Fornecedor', 'Recebido por', 'Data receb.', 'Motivo/Obs.']],
    body: (sol?.itens || []).map((i) => [
      i.quantidade,
      i.unidade,
      i.descricao,
      i.status || 'Nova',
      i.fornecedor || '',
      i.recebidoPor || '',
      i.dataRecebimento ? formatDateBR(i.dataRecebimento) : '',
      i.status === 'Reprovada' ? i.motivoReprovacao || '' : i.obsRecebimento || i.observacao || '',
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: { 2: { cellWidth: 36 }, 7: { cellWidth: 40 } },
  });

  save(doc, 'solicitacao-material.pdf');
}

export function pdfGeral({ geradores = [], medicao, diesel = [], fancoil = [], gas = [] }, periodo = {}) {
  const doc = new jsPDF();

  header(doc, 'Relatório Geral Técnico', periodo);

  const litros = geradores.reduce((s, r) => s + Number(r.litros || 0), 0);
  const dieselTecnico = diesel.reduce((s, r) => s + Number(r.total || 0), 0);
  const gasComum = gas.reduce((s, r) => s + Number(r.comumKg || 0), 0);
  const gasPriv = gas.reduce((s, r) => s + Number(r.privativoKg || 0), 0);

  summaryCard(doc, 14, 62, 42, 'Registros GMGs', geradores.length);
  summaryCard(doc, 62, 62, 42, 'Diesel geradores', `${num(litros)} L`, [240, 253, 250]);
  summaryCard(doc, 110, 62, 42, 'Diesel mensal', `${num(dieselTecnico, 3)} L`, [240, 253, 250]);
  summaryCard(doc, 158, 62, 38, 'Energia Locatários', int(medicao?.resumo?.total || 0), [239, 246, 255]);

  autoTable(doc, {
    startY: 100,
    margin: { bottom: 42 },
    head: [['Indicador', 'Valor']],
    body: [
      ['Registros de gerador', geradores.length],
      ['Unidades medidas', medicao?.resumo?.quantidade || 0],
      ['Medidores que viraram', (medicao?.linhas || []).filter((l) => l.virou).length],
      ['Registros diesel mensal', diesel.length],
      ['Registros fancoil', fancoil.length],
      ['Gás área comum', `${num(gasComum)} kg`],
      ['Gás área privativa', `${num(gasPriv)} kg`],
    ],
    headStyles: { fillColor: [15, 23, 42] },
  });

  save(doc, 'relatorio-geral-tecnico.pdf');
}

function linhaCalculoEletrico(item) {
  const tipo = item.tipoCalculo || item.resultado?.tipo || 'Cálculo elétrico';
  const r = item.resultado || {};

  if (tipo === 'Potência Elétrica') {
    return [
      formatDateBR(item.data),
      tipo,
      `${num(r.potenciaKW)} kW`,
      `${num(r.aparenteKVA)} kVA`,
      `${num(r.reativaKVAr)} kVAr`,
      r.formula || '',
    ];
  }

  if (tipo === 'Fator de Potência') {
    return [
      formatDateBR(item.data),
      tipo,
      `FP ${num(r.fp, 3)}`,
      `${num(r.potenciaAtivaKW)} kW`,
      `${num(r.potenciaAparenteKVA)} kVA`,
      r.alerta || '',
    ];
  }

  if (tipo === 'Motores') {
    return [
      formatDateBR(item.data),
      tipo,
      `${num(r.rpm, 0)} RPM`,
      `${num(r.rendimento)}%`,
      `${r.frequencia || ''} Hz`,
      'RPM e rendimento',
    ];
  }

  if (tipo === 'Queda de Tensão') {
    return [
      formatDateBR(item.data),
      tipo,
      `${num(r.quedaV)} V`,
      `${num(r.quedaPercentual)}%`,
      r.material || '',
      r.alerta || '',
    ];
  }

  return [
    formatDateBR(item.data),
    tipo,
    `${num(r.valor)} ${r.unidade || ''}`,
    r.formula || '',
    '',
    '',
  ];
}

export function pdfCalculosEletricos(calculos = [], periodo = {}) {
  const doc = new jsPDF();

  header(doc, 'Relatório de Cálculos Elétricos', periodo);

  const total = calculos.length;
  const potencias = calculos.filter((c) => c.tipoCalculo === 'Potência Elétrica').length;
  const quedas = calculos.filter((c) => c.tipoCalculo === 'Queda de Tensão').length;

  summaryCard(doc, 14, 62, 55, 'Total de cálculos', total, [239, 246, 255]);
  summaryCard(doc, 78, 62, 55, 'Potência elétrica', potencias, [240, 253, 250]);
  summaryCard(doc, 142, 62, 55, 'Queda de tensão', quedas, [255, 251, 235]);

  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Este relatório reúne cálculos de apoio técnico: Lei de Ohm, potência elétrica, fator de potência, motores e queda de tensão simples.',
    14,
    91,
    { maxWidth: 180 }
  );

  autoTable(doc, {
    startY: 108,
    margin: { bottom: 42 },
    head: [['Data', 'Tipo', 'Resultado 1', 'Resultado 2', 'Resultado 3', 'Observação/Fórmula']],
    body: calculos.map(linhaCalculoEletrico),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: { 5: { cellWidth: 48 } },
  });

  save(doc, 'relatorio-calculos-eletricos.pdf');
}

export function pdfRateioAgua(registros = [], periodo = {}) {
  const doc = new jsPDF();

  header(doc, 'Relatório de Rateio de Água', periodo);

  const valorTotal = registros.reduce((s, r) => s + Number(r.valorTotal || 0), 0);
  const consumoTotal = registros.reduce((s, r) => s + Number(r.consumoTotal || 0), 0);
  const tarifaMedia = consumoTotal > 0 ? valorTotal / consumoTotal : 0;

  summaryCard(doc, 14, 62, 55, 'Valor total', brl(valorTotal), [239, 246, 255]);
  summaryCard(doc, 78, 62, 55, 'Consumo total', `${num(consumoTotal)} m³`, [240, 253, 250]);
  summaryCard(doc, 142, 62, 55, 'Tarifa média', `${brl(tarifaMedia)}/m³`, [255, 251, 235]);

  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Fórmula: Tarifa = valor total ÷ consumo total. Valores e consumos podem ser calculados automaticamente pela soma de Poço 1, Poço 2 e SABESP.',
    14,
    91,
    { maxWidth: 180 }
  );

  autoTable(doc, {
    startY: 108,
    margin: { bottom: 42 },
    head: [['Data', 'Mês', 'Valor Poço 1', 'Valor Poço 2', 'Valor SABESP', 'Valor Total', 'Consumo Total', 'Tarifa']],
    body: registros.map((r) => [
      formatDateBR(r.data),
      r.mesReferencia || '',
      brl(r.valorPoco1),
      brl(r.valorPoco2),
      brl(r.valorSabesp),
      brl(r.valorTotal),
      `${num(r.consumoTotal)} m³`,
      `${brl(r.tarifa)}/m³`,
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  save(doc, 'relatorio-rateio-agua.pdf');
}
