import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { brl, int, num } from '../utils/formatters';

const EDIFICIO = 'Edifício JK 1455';
const NAVY = [6, 23, 55];
const BLUE = [0, 82, 204];
const TEAL = [5, 150, 105];
const AMBER = [217, 119, 6];
const PURPLE = [126, 34, 206];
const SLATE = [71, 85, 105];
const BORDER = [226, 232, 240];

function formatDateBR(value) {
  if (!value) return '';
  const [y, m, d] = String(value).split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function getPeriodoTexto(periodo = {}) {
  if (typeof periodo === 'string') return periodo;
  if (periodo?.texto) return periodo.texto;
  if (periodo?.mesReferencia) return periodo.mesReferencia;
  if (periodo?.dataInicio || periodo?.dataFim) {
    return `${formatDateBR(periodo.dataInicio) || 'Início'} a ${
      formatDateBR(periodo.dataFim) || 'Hoje'
    }`;
  }
  return 'Atual';
}

function getEmissaoTexto(periodo = {}) {
  return periodo?.dataEmissao
    ? formatDateBR(periodo.dataEmissao)
    : new Date().toLocaleDateString('pt-BR');
}

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

  if (inicio && fim) return `${formatDiaMes(inicio)} - ${formatDiaMes(fim)}`;
  return getPeriodoTexto(periodo);
}

function desenharHeaderPadrao(doc, { periodoTexto, emissao }) {
  const pageWidth = doc.internal.pageSize.width;

  doc.setFillColor(...NAVY);
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

  function cardInfo(x, label, value, w) {
    doc.setDrawColor(96, 165, 250);
    doc.setFillColor(10, 41, 90);
    doc.roundedRect(x, 7, w, 20, 2.5, 2.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(219, 234, 254);
    doc.text(label, x + 5, 14);

    doc.setFontSize(10.5);
    doc.setTextColor(103, 232, 249);
    doc.text(String(value || '-'), x + 5, 22);
  }

  cardInfo(pageWidth - 90, 'Período', periodoTexto, 48);
  cardInfo(pageWidth - 38, 'Emissão', emissao, 32);

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 34, pageWidth, 8, 'F');
}

function desenharTituloPadrao(doc, titulo, subtitulo = '') {
  doc.setTextColor(15, 42, 90);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text('Relatório', 14, 48);

  doc.setTextColor(25, 80, 180);
  doc.setFontSize(22);
  doc.text(titulo, 14, 60);

  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.7);
  doc.line(14, 64, 42, 64);

  if (subtitulo) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...SLATE);
    doc.text(subtitulo, 14, 70, { maxWidth: 180 });
  }
}

function cardResumoPadrao(doc, x, y, w, titulo, valor, subtitulo = '', cor = 'blue') {
  const cores = {
    blue: { bg: [239, 246, 255], border: [147, 197, 253], text: BLUE },
    green: { bg: [240, 253, 244], border: [134, 239, 172], text: TEAL },
    amber: { bg: [255, 251, 235], border: [253, 224, 71], text: AMBER },
    purple: { bg: [250, 245, 255], border: [216, 180, 254], text: PURPLE },
    slate: { bg: [248, 250, 252], border: [203, 213, 225], text: [51, 65, 85] },
  };

  const c = cores[cor] || cores.blue;

  doc.setFillColor(...c.bg);
  doc.setDrawColor(...c.border);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, w, 25, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 64, 100);
  doc.text(String(titulo), x + 5, y + 8);

  doc.setFont('helvetica', 'bold');
  const valorTexto = String(valor ?? '-');
  doc.setFontSize(valorTexto.length > 12 ? 11 : 15);
  doc.setTextColor(...c.text);
  doc.text(valorTexto, x + 5, y + 17);

  if (subtitulo) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...SLATE);
    doc.text(String(subtitulo), x + 5, y + 22);
  }
}

function desenharRodapePadrao(doc, totalPages) {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;

  doc.setDrawColor(...BORDER);
  doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

  doc.setFillColor(...NAVY);
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

function desenharMiniHeaderPadrao(doc, titulo, periodoTexto) {
  const pageWidth = doc.internal.pageSize.width;

  doc.setTextColor(15, 42, 90);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Sistema Técnico Predial', 14, 14);

  doc.setTextColor(37, 99, 235);
  doc.text(titulo, pageWidth / 2, 14, { align: 'center' });

  doc.setTextColor(15, 42, 90);
  doc.text(`Período: ${periodoTexto}`, pageWidth - 14, 14, { align: 'right' });

  doc.setDrawColor(...BORDER);
  doc.line(14, 18, pageWidth - 14, 18);
}

function aplicarRodapeEmTodasPaginas(doc) {
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    desenharRodapePadrao(doc, totalPages);
  }
}

function criarDocPadrao(titulo, periodo = {}, subtitulo = '') {
  const doc = new jsPDF();
  const periodoTexto = getPeriodoTexto(periodo);
  const emissao = getEmissaoTexto(periodo);

  desenharHeaderPadrao(doc, { periodoTexto, emissao });
  desenharTituloPadrao(doc, titulo, subtitulo);

  return { doc, periodoTexto };
}

function tabelaPadrao(doc, config) {
  return autoTable(doc, {
    margin: { top: 24, bottom: 18, left: 14, right: 14, ...(config.margin || {}) },
    styles: {
      fontSize: 8,
      cellPadding: 2.1,
      overflow: 'linebreak',
      valign: 'middle',
      textColor: [15, 23, 42],
      lineColor: BORDER,
      lineWidth: 0.15,
      ...(config.styles || {}),
    },
    headStyles: {
      fillColor: BLUE,
      textColor: [255, 255, 255],
      fontSize: 8.2,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 2.4,
      ...(config.headStyles || {}),
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
      ...(config.alternateRowStyles || {}),
    },
    ...config,
  });
}

function salvarPadrao(doc, nome) {
  aplicarRodapeEmTodasPaginas(doc);
  doc.save(nome);
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

export function pdfGeradores(registros = [], periodo = {}) {
  const { doc, periodoTexto } = criarDocPadrao(
    'Geradores',
    periodo,
    'Horas, horímetros, diesel consumido, custo e observações operacionais.'
  );

  const litros = registros.reduce((s, r) => s + Number(r.litros || 0), 0);
  const custo = registros.reduce((s, r) => s + Number(r.custo || 0), 0);

  cardResumoPadrao(doc, 14, 78, 55, 'Registros', registros.length, 'Lançamentos', 'blue');
  cardResumoPadrao(doc, 78, 78, 55, 'Litros registrados', `${num(litros)} L`, 'Total diesel', 'green');
  cardResumoPadrao(doc, 142, 78, 55, 'Custo total', brl(custo), 'Estimado', 'amber');

  tabelaPadrao(doc, {
    startY: 115,
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
    columnStyles: { 7: { cellWidth: 38 } },
    didDrawPage: () => {
      if (doc.internal.getCurrentPageInfo().pageNumber > 1) {
        desenharMiniHeaderPadrao(doc, 'Relatório de Geradores', periodoTexto);
      }
    },
  });

  salvarPadrao(doc, 'relatorio-geradores.pdf');
}

export function pdfDieselTecnico(registros = [], periodo = {}) {
  const { doc, periodoTexto } = criarDocPadrao(
    'Diesel Mensal',
    periodo,
    'Racional técnico do consumo mensal de diesel dos GMGs.'
  );

  const total = registros.reduce((s, r) => s + Number(r.total || 0), 0);
  const horas = registros.reduce((s, r) => s + Number(r.horas || 0), 0);

  cardResumoPadrao(doc, 14, 78, 55, 'Registros', registros.length, 'Lançamentos', 'blue');
  cardResumoPadrao(doc, 78, 78, 55, 'Horas totais', `${num(horas, 4)} h`, 'Funcionamento', 'purple');
  cardResumoPadrao(doc, 142, 78, 55, 'Diesel calculado', `${num(total, 3)} L`, 'Consumo total', 'green');

  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  doc.text(
    'Formula: consumo total mensal de diesel = consumo por hora dos 2 GMGs x tempo de funcionamento convertido em horas.',
    14,
    111,
    { maxWidth: 180 }
  );

  tabelaPadrao(doc, {
    startY: 126,
    head: [['Data', 'Consumo hora GMGs', 'Tempo', 'Horas decimais', 'Consumo total']],
    body: registros.map((r) => [
      formatDateBR(r.data),
      `${r.consumoHoraGMGs} L/h`,
      r.tempo,
      `${num(r.horas, 4)} h`,
      `${num(r.total, 3)} L`,
    ]),
    didDrawPage: () => {
      if (doc.internal.getCurrentPageInfo().pageNumber > 1) {
        desenharMiniHeaderPadrao(doc, 'Relatório de Diesel Mensal', periodoTexto);
      }
    },
  });

  salvarPadrao(doc, 'relatorio-diesel-mensal.pdf');
}

export function pdfFancoil(registros = [], periodo = {}) {
  const { doc, periodoTexto } = criarDocPadrao(
    'Consumo Estimado do Fancoil',
    periodo,
    'Consumo estimado, custo mensal e parâmetros de cálculo do fancoil.'
  );

  const consumo = registros.reduce((s, r) => s + Number(r.consumo || 0), 0);
  const custo = registros.reduce((s, r) => s + Number(r.custo || 0), 0);

  cardResumoPadrao(doc, 14, 78, 55, 'Registros', registros.length, 'Lançamentos', 'blue');
  cardResumoPadrao(doc, 78, 78, 55, 'Consumo estimado', `${num(consumo)} kWh`, 'Energia', 'green');
  cardResumoPadrao(doc, 142, 78, 55, 'Custo estimado', brl(custo), 'Valor mensal', 'amber');

  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  doc.text(
    'Formula: consumo mensal = kW x horas por dia x dias uteis. Custo mensal = consumo x preço kWh.',
    14,
    111,
    { maxWidth: 180 }
  );

  tabelaPadrao(doc, {
    startY: 126,
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
    didDrawPage: () => {
      if (doc.internal.getCurrentPageInfo().pageNumber > 1) {
        desenharMiniHeaderPadrao(doc, 'Relatório de Fancoil', periodoTexto);
      }
    },
  });

  salvarPadrao(doc, 'relatorio-fancoil.pdf');
}

export function pdfGas(registros = [], periodo = {}) {
  const { doc, periodoTexto } = criarDocPadrao(
    'Consumo de Gás',
    periodo,
    'Consumo convertido em kg, separado entre área comum e privativa.'
  );

  const totalKg = registros.reduce((s, r) => s + Number(r.totalKg || 0), 0);
  const comumKg = registros.reduce((s, r) => s + Number(r.comumKg || 0), 0);
  const privativoKg = registros.reduce((s, r) => s + Number(r.privativoKg || 0), 0);

  cardResumoPadrao(doc, 14, 78, 55, 'Total convertido', `${num(totalKg)} kg`, 'Consumo total', 'amber');
  cardResumoPadrao(doc, 78, 78, 55, 'Área comum', `${num(comumKg)} kg`, 'Rateio comum', 'blue');
  cardResumoPadrao(doc, 142, 78, 55, 'Área privativa', `${num(privativoKg)} kg`, 'Privativo', 'purple');

  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  doc.text(
    'Formula: área comum = (m3 x fator) x 0,05. Área privativa = (m3 x fator) x 0,95.',
    14,
    111,
    { maxWidth: 180 }
  );

  tabelaPadrao(doc, {
    startY: 126,
    head: [['Data', 'Consumo m3', 'Fator', 'Total kg', 'Área comum kg', 'Área privativa kg']],
    body: registros.map((r) => [
      formatDateBR(r.data),
      r.consumoM3,
      r.fator,
      num(r.totalKg),
      num(r.comumKg),
      num(r.privativoKg),
    ]),
    didDrawPage: () => {
      if (doc.internal.getCurrentPageInfo().pageNumber > 1) {
        desenharMiniHeaderPadrao(doc, 'Relatório de Gás', periodoTexto);
      }
    },
  });

  salvarPadrao(doc, 'relatorio-gas.pdf');
}

export function pdfLocatarios(medicao, periodo = {}) {
  const doc = new jsPDF();
  const periodoTexto = periodoEnergiaLocatarios(medicao, periodo);
  const emissao = getEmissaoTexto(periodo);

  const resumo = medicao?.resumo || {};
  const linhas = medicao?.linhas || [];

  const maiorConsumo = resumo.maior?.unidade || '-';
  const totalConsumido = int(resumo.total || 0);
  const mediaConsumo = int(resumo.media || 0);
  const totalUnidades = resumo.quantidade || linhas.length || 0;

  desenharHeaderPadrao(doc, { periodoTexto, emissao });
  desenharTituloPadrao(doc, 'Energia dos Locatários', 'Medição anterior, atual, consumo apurado e indicação de virada de medidor.');

  cardResumoPadrao(doc, 14, 78, 42, 'Unidades', totalUnidades, 'Total', 'blue');
  cardResumoPadrao(doc, 61, 78, 47, 'Total consumido', totalConsumido, 'kWh no periodo', 'green');
  cardResumoPadrao(doc, 113, 78, 42, 'Maior consumo', maiorConsumo, 'Unidade', 'amber');
  cardResumoPadrao(doc, 160, 78, 36, 'Media', mediaConsumo, 'kWh/un', 'purple');

  tabelaPadrao(doc, {
    startY: 116,
    head: [['Unidade', 'Anterior (kWh)', 'Atual (kWh)', 'Consumo (kWh)', 'Virou medidor']],
    body: linhas.map((r) => [
      r.unidade,
      int(r.anterior),
      String(r.atual).padStart(5, '0'),
      int(r.consumo),
      r.virou ? 'Sim' : 'Nao',
    ]),
    bodyStyles: { minCellHeight: 7.4 },
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
        data.cell.styles.textColor = virou ? AMBER : TEAL;
        data.cell.styles.fontStyle = 'bold';
      }
    },
    didDrawPage: function () {
      if (doc.internal.getCurrentPageInfo().pageNumber > 1) {
        desenharMiniHeaderPadrao(doc, 'Relatório de Energia dos Locatários', periodoTexto);
      }
    },
  });

  salvarPadrao(doc, 'relatorio-locatarios.pdf');
}

export function pdfSolicitacao(sol, periodo = {}) {
  const { doc, periodoTexto } = criarDocPadrao(
    'Solicitação de Material',
    periodo?.texto || sol?.data || '',
    'Resumo de solicitação, itens, status e dados de recebimento.'
  );

  const itens = sol?.itens || [];
  const statusFinal = (() => {
    if (!itens.length) return sol?.status || 'Nova';
    if (itens.every((i) => i.status === 'Entregue')) return 'Entregue';
    if (itens.every((i) => i.status === 'Reprovada' || i.status === 'Cancelada')) return 'Reprovada';
    if (itens.some((i) => i.status === 'Comprada' || i.status === 'Entregue')) return 'Comprada';
    if (itens.some((i) => i.status === 'Aprovada')) return 'Aprovada';
    if (itens.some((i) => i.status === 'Reprovada')) return 'Em análise';
    return sol?.status || 'Nova';
  })();

  cardResumoPadrao(doc, 14, 78, 42, 'Itens', itens.length, 'Total', 'blue');
  cardResumoPadrao(doc, 61, 78, 47, 'Status geral', statusFinal, 'Situação', 'green');
  cardResumoPadrao(doc, 113, 78, 42, 'Prioridade', sol?.prioridade || '-', 'Criticidade', 'amber');
  cardResumoPadrao(doc, 160, 78, 36, 'Área', sol?.setor || '-', 'Setor', 'purple');

  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  doc.text(`Solicitante: ${sol?.solicitante || '-'}`, 14, 111);

  tabelaPadrao(doc, {
    startY: 122,
    head: [['Qtd', 'Un.', 'Descrição', 'Status', 'Fornecedor', 'Recebido por', 'Data receb.', 'Motivo/Obs.']],
    body: itens.map((i) => [
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
    columnStyles: { 2: { cellWidth: 35 }, 7: { cellWidth: 38 } },
    didDrawPage: () => {
      if (doc.internal.getCurrentPageInfo().pageNumber > 1) {
        desenharMiniHeaderPadrao(doc, 'Relatório de Solicitação de Material', periodoTexto);
      }
    },
  });

  salvarPadrao(doc, 'solicitacao-material.pdf');
}

export function pdfGeral({ geradores = [], medicao, diesel = [], fancoil = [], gas = [] }, periodo = {}) {
  const { doc, periodoTexto } = criarDocPadrao(
    'Geral Técnico',
    periodo,
    'Resumo consolidado dos principais indicadores técnicos do período.'
  );

  const litros = geradores.reduce((s, r) => s + Number(r.litros || 0), 0);
  const dieselTecnico = diesel.reduce((s, r) => s + Number(r.total || 0), 0);
  const gasComum = gas.reduce((s, r) => s + Number(r.comumKg || 0), 0);
  const gasPriv = gas.reduce((s, r) => s + Number(r.privativoKg || 0), 0);

  cardResumoPadrao(doc, 14, 78, 42, 'GMGs', geradores.length, 'Registros', 'blue');
  cardResumoPadrao(doc, 61, 78, 47, 'Diesel geradores', `${num(litros)} L`, 'Total', 'green');
  cardResumoPadrao(doc, 113, 78, 42, 'Diesel mensal', `${num(dieselTecnico, 3)} L`, 'Racional', 'amber');
  cardResumoPadrao(doc, 160, 78, 36, 'Energia', int(medicao?.resumo?.total || 0), 'kWh', 'purple');

  tabelaPadrao(doc, {
    startY: 118,
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
    didDrawPage: () => {
      if (doc.internal.getCurrentPageInfo().pageNumber > 1) {
        desenharMiniHeaderPadrao(doc, 'Relatório Geral Técnico', periodoTexto);
      }
    },
  });

  salvarPadrao(doc, 'relatorio-geral-tecnico.pdf');
}

export function pdfCalculosEletricos(calculos = [], periodo = {}) {
  const { doc, periodoTexto } = criarDocPadrao(
    'Cálculos Elétricos',
    periodo,
    'Lei de Ohm, potência elétrica, fator de potência, motores e queda de tensão simples.'
  );

  const total = calculos.length;
  const potencias = calculos.filter((c) => c.tipoCalculo === 'Potência Elétrica').length;
  const quedas = calculos.filter((c) => c.tipoCalculo === 'Queda de Tensão').length;

  cardResumoPadrao(doc, 14, 78, 55, 'Total de cálculos', total, 'Registros', 'blue');
  cardResumoPadrao(doc, 78, 78, 55, 'Potência elétrica', potencias, 'Cálculos', 'green');
  cardResumoPadrao(doc, 142, 78, 55, 'Queda de tensão', quedas, 'Cálculos', 'amber');

  tabelaPadrao(doc, {
    startY: 118,
    head: [['Data', 'Tipo', 'Resultado 1', 'Resultado 2', 'Resultado 3', 'Observação/Fórmula']],
    body: calculos.map(linhaCalculoEletrico),
    columnStyles: { 5: { cellWidth: 48 } },
    didDrawPage: () => {
      if (doc.internal.getCurrentPageInfo().pageNumber > 1) {
        desenharMiniHeaderPadrao(doc, 'Relatório de Cálculos Elétricos', periodoTexto);
      }
    },
  });

  salvarPadrao(doc, 'relatorio-calculos-eletricos.pdf');
}

export function pdfRateioAgua(registros = [], periodo = {}) {
  const { doc, periodoTexto } = criarDocPadrao(
    'Rateio de Água',
    periodo,
    'Fechamento mensal das medições de água e tarifa por metro cúbico.'
  );

  const valorTotal = registros.reduce((s, r) => s + Number(r.valorTotal || 0), 0);
  const consumoTotal = registros.reduce((s, r) => s + Number(r.consumoTotal || 0), 0);
  const tarifaMedia = consumoTotal > 0 ? valorTotal / consumoTotal : 0;

  cardResumoPadrao(doc, 14, 78, 55, 'Valor total', brl(valorTotal), 'Rateio', 'blue');
  cardResumoPadrao(doc, 78, 78, 55, 'Consumo total', `${num(consumoTotal)} m3`, 'Volume', 'green');
  cardResumoPadrao(doc, 142, 78, 55, 'Tarifa média', `${brl(tarifaMedia)}/m3`, 'Valor médio', 'amber');

  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  doc.text(
    'Formula: tarifa = valor total dividido pelo consumo total. Valores e consumos podem considerar Poço 1, Poço 2 e SABESP.',
    14,
    111,
    { maxWidth: 180 }
  );

  tabelaPadrao(doc, {
    startY: 126,
    head: [['Data', 'Mês', 'Valor Poço 1', 'Valor Poço 2', 'Valor SABESP', 'Valor Total', 'Consumo Total', 'Tarifa']],
    body: registros.map((r) => [
      formatDateBR(r.data),
      r.mesReferencia || '',
      brl(r.valorPoco1),
      brl(r.valorPoco2),
      brl(r.valorSabesp),
      brl(r.valorTotal),
      `${num(r.consumoTotal)} m3`,
      `${brl(r.tarifa)}/m3`,
    ]),
    styles: { fontSize: 7 },
    didDrawPage: () => {
      if (doc.internal.getCurrentPageInfo().pageNumber > 1) {
        desenharMiniHeaderPadrao(doc, 'Relatório de Rateio de Água', periodoTexto);
      }
    },
  });

  salvarPadrao(doc, 'relatorio-rateio-agua.pdf');
}
