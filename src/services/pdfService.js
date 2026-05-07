import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { brl, int, num } from '../utils/formatters';

const EDIFICIO = 'Edifício JK 1455';

function formatDateBR(value) {
  if (!value) return '';
  const [y,m,d] = String(value).split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function getPeriodoTexto(periodo = {}) {
  if (periodo?.texto) return periodo.texto;
  if (periodo?.mesReferencia) return periodo.mesReferencia;
  if (periodo?.dataInicio || periodo?.dataFim) return `${formatDateBR(periodo.dataInicio) || 'Início'} a ${formatDateBR(periodo.dataFim) || 'Hoje'}`;
  return 'Atual';
}

function header(doc, title, periodo = {}) {
  const periodoTexto = typeof periodo === 'string' ? periodo : getPeriodoTexto(periodo);
  const emissao = typeof periodo === 'object' && periodo?.dataEmissao ? formatDateBR(periodo.dataEmissao) : new Date().toLocaleDateString('pt-BR');

  doc.setFillColor(15,23,42);
  doc.rect(0,0,210,30,'F');

  doc.setTextColor(255,255,255);
  doc.setFontSize(16);
  doc.text('Sistema Técnico Predial',14,12);

  doc.setFontSize(10);
  doc.text(EDIFICIO,14,21);

  doc.setTextColor(15,23,42);
  doc.setFontSize(18);
  doc.text(title,14,43);

  doc.setFontSize(10);
  doc.text(`Período: ${periodoTexto} • Emissão: ${emissao}`,14,51);
}

function footer(doc, y = null){
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

  doc.text(
    'Relatório gerado pelo Sistema Técnico Predial',
    14,
    finalY + 23
  );
}

function save(doc,name){
  footer(doc);
  doc.save(name);
}

function summaryCard(doc, x, y, w, title, value, fill=[239,246,255]) {
  doc.setFillColor(...fill);
  doc.roundedRect(x,y,w,22,3,3,'F');

  doc.setTextColor(71,85,105);
  doc.setFontSize(8);
  doc.text(title,x+4,y+8);

  doc.setTextColor(15,23,42);
  doc.setFontSize(12);
  doc.text(String(value),x+4,y+17);
}

export function pdfGeradores(registros=[], periodo={}){
  const doc=new jsPDF();

  header(doc,'Relatório de Geradores',periodo);

  const litros=registros.reduce((s,r)=>s+Number(r.litros||0),0);
  const custo=registros.reduce((s,r)=>s+Number(r.custo||0),0);

  summaryCard(doc,14,62,55,'Registros',registros.length);
  summaryCard(doc,78,62,55,'Litros registrados',`${num(litros)} L`,[240,253,250]);
  summaryCard(doc,142,62,55,'Custo total',brl(custo),[255,251,235]);

  autoTable(doc,{
    startY:96,
    margin:{bottom:42},
    head:[['Data','Gerador','Inicial','Final','Litros','Valor diesel','Custo','Obs.']],
    body:registros.map(r=>[
      formatDateBR(r.data),
      r.gerador,
      r.horimetroInicial,
      r.horimetroFinal,
      num(r.litros),
      brl(r.valorDiesel),
      brl(r.custo),
      r.observacao||''
    ]),
    styles:{fontSize:8},
    headStyles:{fillColor:[15,23,42]}
  });

  save(doc,'relatorio-geradores.pdf');
}

export function pdfDieselTecnico(registros=[], periodo={}){
  const doc=new jsPDF();

  header(doc,'Relatório de Diesel Mensal',periodo);

  const total=registros.reduce((s,r)=>s+Number(r.total||0),0);
  const horas=registros.reduce((s,r)=>s+Number(r.horas||0),0);

  summaryCard(doc,14,62,55,'Registros',registros.length);
  summaryCard(doc,78,62,55,'Horas totais',`${num(horas,4)} h`);
  summaryCard(doc,142,62,55,'Diesel calculado',`${num(total,3)} L`,[240,253,250]);

  doc.setFontSize(10);
  doc.setTextColor(71,85,105);
  doc.text(
    'Fórmula: Consumo total mensal de diesel = consumo por hora dos 2 GMGs × tempo de funcionamento convertido em horas.',
    14,
    91,
    {maxWidth:180}
  );

  autoTable(doc,{
    startY:108,
    margin:{bottom:42},
    head:[['Data','Consumo hora GMGs','Tempo','Horas decimais','Consumo total']],
    body:registros.map(r=>[
      formatDateBR(r.data),
      `${r.consumoHoraGMGs} L/h`,
      r.tempo,
      `${num(r.horas,4)} h`,
      `${num(r.total,3)} L`
    ]),
    styles:{fontSize:8},
    headStyles:{fillColor:[15,23,42]}
  });

  save(doc,'relatorio-diesel-mensal.pdf');
}

export function pdfFancoil(registros=[], periodo={}){
  const doc=new jsPDF();

  header(doc,'Relatório de Consumo Estimado do Fancoil',periodo);

  const consumo=registros.reduce((s,r)=>s+Number(r.consumo||0),0);
  const custo=registros.reduce((s,r)=>s+Number(r.custo||0),0);

  summaryCard(doc,14,62,55,'Registros',registros.length,[240,253,250]);
  summaryCard(doc,78,62,55,'Consumo estimado',`${num(consumo)} kWh`,[240,253,250]);
  summaryCard(doc,142,62,55,'Custo estimado',brl(custo),[255,251,235]);

  doc.setFontSize(10);
  doc.setTextColor(71,85,105);
  doc.text(
    'Fórmulas: Consumo estimado mensal = kW × horas por dia × dias úteis. Custo estimado mensal = consumo estimado × preço kWh.',
    14,
    91,
    {maxWidth:180}
  );

  autoTable(doc,{
    startY:108,
    margin:{bottom:42},
    head:[['Data','Potência kW','Horas/dia','Dias úteis','Preço kWh','Consumo','Custo']],
    body:registros.map(r=>[
      formatDateBR(r.data),
      r.kw,
      r.horasDia,
      r.diasUteis,
      `R$ ${r.precoKwh}`,
      `${num(r.consumo)} kWh`,
      brl(r.custo)
    ]),
    styles:{fontSize:8},
    headStyles:{fillColor:[15,23,42]}
  });

  save(doc,'relatorio-fancoil.pdf');
}

export function pdfGas(registros=[], periodo={}){
  const doc=new jsPDF();

  header(doc,'Relatório de Consumo de Gás',periodo);

  const totalKg=registros.reduce((s,r)=>s+Number(r.totalKg||0),0);
  const comumKg=registros.reduce((s,r)=>s+Number(r.comumKg||0),0);
  const privativoKg=registros.reduce((s,r)=>s+Number(r.privativoKg||0),0);

  summaryCard(doc,14,62,55,'Total convertido',`${num(totalKg)} kg`,[255,251,235]);
  summaryCard(doc,78,62,55,'Área comum',`${num(comumKg)} kg`,[255,251,235]);
  summaryCard(doc,142,62,55,'Área privativa',`${num(privativoKg)} kg`,[255,251,235]);

  doc.setFontSize(10);
  doc.setTextColor(71,85,105);
  doc.text(
    'Fórmulas: Área comum = (m³ × fator) × 0,05. Área privativa = (m³ × fator) × 0,95.',
    14,
    91,
    {maxWidth:180}
  );

  autoTable(doc,{
    startY:108,
    margin:{bottom:42},
    head:[['Data','Consumo m³','Fator','Total kg','Área comum kg','Área privativa kg']],
    body:registros.map(r=>[
      formatDateBR(r.data),
      r.consumoM3,
      r.fator,
      num(r.totalKg),
      num(r.comumKg),
      num(r.privativoKg)
    ]),
    styles:{fontSize:8},
    headStyles:{fillColor:[15,23,42]}
  });

  save(doc,'relatorio-gas.pdf');
}

export function pdfLocatarios(medicao, periodo={}){
  const doc = new jsPDF();

  header(
    doc,
    'Relatório de Medição de Energia dos Locatários',
    periodo?.mesReferencia
      ? { ...periodo, texto: periodo.mesReferencia }
      : (medicao?.mes || '')
  );

  const resumo = medicao?.resumo || {};

  summaryCard(doc,14,62,42,'Unidades',String(resumo.quantidade||0),[240,253,250]);
  summaryCard(doc,62,62,42,'Total consumido',int(resumo.total||0),[240,253,250]);
  summaryCard(doc,110,62,42,'Maior consumo',resumo.maior?`${resumo.maior.unidade}`:'-',[255,251,235]);
  summaryCard(doc,158,62,38,'Média',int(resumo.media||0),[239,246,255]);

  autoTable(doc,{
    startY:96,
    margin: {
      top: 38,
      bottom: 42,
      left: 14,
      right: 14
    },
    head:[['Unidade','Anterior','Atual','Consumo','Virou medidor']],
    body:(medicao?.linhas||[]).map(r=>[
      r.unidade,
      int(r.anterior),
      String(r.atual).padStart(5,'0'),
      int(r.consumo),
      r.virou?'Sim':'Não'
    ]),
    styles:{
      fontSize:7,
      cellPadding:2,
      overflow:'linebreak',
      valign:'middle'
    },
    headStyles:{
      fillColor:[15,23,42],
      textColor:[255,255,255],
      fontSize:7,
      fontStyle:'bold'
    },
    alternateRowStyles:{
      fillColor:[248,250,252]
    },
    columnStyles:{
      0:{cellWidth:28},
      1:{cellWidth:36},
      2:{cellWidth:36},
      3:{cellWidth:36},
      4:{cellWidth:42}
    },
    didDrawPage: function () {
      const pageNumber = doc.internal.getNumberOfPages();

      if (pageNumber > 1) {
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text('Relatório de Medição de Energia dos Locatários', 14, 15);
        doc.text(`Página ${pageNumber}`, 180, 15);
      }
    }
  });

  const pageHeight = doc.internal.pageSize.height;
  const finalY = doc.lastAutoTable?.finalY || 96;

  if (finalY > pageHeight - 55) {
    doc.addPage();
    footer(doc, 245);
  } else {
    footer(doc, finalY + 12);
  }

  doc.save('relatorio-locatarios.pdf');
}

export function pdfSolicitacao(sol, periodo={}){
  const doc=new jsPDF();

  const statusFinal = (() => {
    const itens = sol?.itens || [];
    if (!itens.length) return sol?.status || 'Nova';
    if (itens.every(i => i.status === 'Entregue')) return 'Entregue';
    if (itens.every(i => i.status === 'Reprovada' || i.status === 'Cancelada')) return 'Reprovada';
    if (itens.some(i => i.status === 'Comprada' || i.status === 'Entregue')) return 'Comprada';
    if (itens.some(i => i.status === 'Aprovada')) return 'Aprovada';
    if (itens.some(i => i.status === 'Reprovada')) return 'Em análise';
    return sol?.status || 'Nova';
  })();

  header(doc,'Solicitação de Material',periodo?.texto || sol?.data || '');

  doc.setFontSize(11);
  doc.setTextColor(15,23,42);
  doc.text(`Área solicitante: ${sol?.setor || ''}`,14,62);
  doc.text(`Solicitante: ${sol?.solicitante || ''}`,14,70);
  doc.text(`Prioridade: ${sol?.prioridade || ''}`,14,78);
  doc.text(`Status geral: ${statusFinal}`,14,86);

  autoTable(doc,{
    startY:98,
    margin:{bottom:42},
    head:[['Qtd','Un.','Descrição','Status','Fornecedor','Recebido por','Data receb.','Motivo/Obs.']],
    body:(sol?.itens||[]).map(i=>[
      i.quantidade,
      i.unidade,
      i.descricao,
      i.status || 'Nova',
      i.fornecedor || '',
      i.recebidoPor || '',
      i.dataRecebimento ? formatDateBR(i.dataRecebimento) : '',
      i.status === 'Reprovada' ? (i.motivoReprovacao || '') : (i.obsRecebimento || i.observacao || '')
    ]),
    styles:{fontSize:7},
    headStyles:{fillColor:[15,23,42]},
    columnStyles:{2:{cellWidth:36},7:{cellWidth:40}}
  });

  save(doc,'solicitacao-material.pdf');
}

export function pdfGeral({geradores=[],medicao,diesel=[],fancoil=[],gas=[]}, periodo={}){
  const doc=new jsPDF();

  header(doc,'Relatório Geral Técnico',periodo);

  const litros=geradores.reduce((s,r)=>s+Number(r.litros||0),0);
  const dieselTecnico=diesel.reduce((s,r)=>s+Number(r.total||0),0);
  const gasComum=gas.reduce((s,r)=>s+Number(r.comumKg||0),0);
  const gasPriv=gas.reduce((s,r)=>s+Number(r.privativoKg||0),0);

  summaryCard(doc,14,62,42,'Registros GMGs',geradores.length);
  summaryCard(doc,62,62,42,'Diesel geradores',`${num(litros)} L`,[240,253,250]);
  summaryCard(doc,110,62,42,'Diesel mensal',`${num(dieselTecnico,3)} L`,[240,253,250]);
  summaryCard(doc,158,62,38,'Energia Locatários',int(medicao?.resumo?.total || 0),[239,246,255]);

  autoTable(doc,{
    startY:100,
    margin:{bottom:42},
    head:[['Indicador','Valor']],
    body:[
      ['Registros de gerador',geradores.length],
      ['Unidades medidas',medicao?.resumo?.quantidade||0],
      ['Medidores que viraram',(medicao?.linhas||[]).filter(l=>l.virou).length],
      ['Registros diesel mensal',diesel.length],
      ['Registros fancoil',fancoil.length],
      ['Gás área comum',`${num(gasComum)} kg`],
      ['Gás área privativa',`${num(gasPriv)} kg`]
    ],
    headStyles:{fillColor:[15,23,42]}
  });

  save(doc,'relatorio-geral-tecnico.pdf');
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
      r.formula || ''
    ];
  }

  if (tipo === 'Fator de Potência') {
    return [
      formatDateBR(item.data),
      tipo,
      `FP ${num(r.fp,3)}`,
      `${num(r.potenciaAtivaKW)} kW`,
      `${num(r.potenciaAparenteKVA)} kVA`,
      r.alerta || ''
    ];
  }

  if (tipo === 'Motores') {
    return [
      formatDateBR(item.data),
      tipo,
      `${num(r.rpm,0)} RPM`,
      `${num(r.rendimento)}%`,
      `${r.frequencia || ''} Hz`,
      'RPM e rendimento'
    ];
  }

  if (tipo === 'Queda de Tensão') {
    return [
      formatDateBR(item.data),
      tipo,
      `${num(r.quedaV)} V`,
      `${num(r.quedaPercentual)}%`,
      r.material || '',
      r.alerta || ''
    ];
  }

  return [
    formatDateBR(item.data),
    tipo,
    `${num(r.valor)} ${r.unidade || ''}`,
    r.formula || '',
    '',
    ''
  ];
}

export function pdfCalculosEletricos(calculos=[], periodo={}){
  const doc=new jsPDF();

  header(doc,'Relatório de Cálculos Elétricos',periodo);

  const total=calculos.length;
  const potencias=calculos.filter(c=>c.tipoCalculo==='Potência Elétrica').length;
  const quedas=calculos.filter(c=>c.tipoCalculo==='Queda de Tensão').length;

  summaryCard(doc,14,62,55,'Total de cálculos',total,[239,246,255]);
  summaryCard(doc,78,62,55,'Potência elétrica',potencias,[240,253,250]);
  summaryCard(doc,142,62,55,'Queda de tensão',quedas,[255,251,235]);

  doc.setFontSize(10);
  doc.setTextColor(71,85,105);
  doc.text(
    'Este relatório reúne cálculos de apoio técnico: Lei de Ohm, potência elétrica, fator de potência, motores e queda de tensão simples.',
    14,
    91,
    {maxWidth:180}
  );

  autoTable(doc,{
    startY:108,
    margin:{bottom:42},
    head:[['Data','Tipo','Resultado 1','Resultado 2','Resultado 3','Observação/Fórmula']],
    body:calculos.map(linhaCalculoEletrico),
    styles:{fontSize:8},
    headStyles:{fillColor:[15,23,42]},
    columnStyles:{5:{cellWidth:48}}
  });

  save(doc,'relatorio-calculos-eletricos.pdf');
}

export function pdfRateioAgua(registros=[], periodo={}){
  const doc=new jsPDF();

  header(doc,'Relatório de Rateio de Água',periodo);

  const valorTotal=registros.reduce((s,r)=>s+Number(r.valorTotal||0),0);
  const consumoTotal=registros.reduce((s,r)=>s+Number(r.consumoTotal||0),0);
  const tarifaMedia=consumoTotal>0?valorTotal/consumoTotal:0;

  summaryCard(doc,14,62,55,'Valor total',brl(valorTotal),[239,246,255]);
  summaryCard(doc,78,62,55,'Consumo total',`${num(consumoTotal)} m³`,[240,253,250]);
  summaryCard(doc,142,62,55,'Tarifa média',`${brl(tarifaMedia)}/m³`,[255,251,235]);

  doc.setFontSize(10);
  doc.setTextColor(71,85,105);
  doc.text(
    'Fórmula: Tarifa = valor total ÷ consumo total. Valores e consumos podem ser calculados automaticamente pela soma de Poço 1, Poço 2 e SABESP.',
    14,
    91,
    {maxWidth:180}
  );

  autoTable(doc,{
    startY:108,
    margin:{bottom:42},
    head:[['Data','Mês','Valor Poço 1','Valor Poço 2','Valor SABESP','Valor Total','Consumo Total','Tarifa']],
    body:registros.map(r=>[
      formatDateBR(r.data),
      r.mesReferencia||'',
      brl(r.valorPoco1),
      brl(r.valorPoco2),
      brl(r.valorSabesp),
      brl(r.valorTotal),
      `${num(r.consumoTotal)} m³`,
      `${brl(r.tarifa)}/m³`
    ]),
    styles:{fontSize:7},
    headStyles:{fillColor:[15,23,42]}
  });

  save(doc,'relatorio-rateio-agua.pdf');
}
