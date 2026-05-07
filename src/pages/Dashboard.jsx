import { AlertTriangle, BarChart3, CheckCircle2, ClipboardList, Droplets, FileText, Fuel, Gauge, PackagePlus, TrendingUp, Zap } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import CardResumo from '../components/CardResumo';
import Tabela from '../components/Tabela';
import { getItem } from '../services/storageService';
import { brl, int, num, parseBRNumber } from '../utils/formatters';

function valorItem(item) {
  const unit = Number(String(item?.valorUnitario || '0').replace(/\./g, '').replace(',', '.')) || 0;
  return Number(item?.quantidade || 0) * unit;
}

function getStatusGeralSolicitacao(sol) {
  const itens = sol.itens || [];
  if (!itens.length) return sol.status || 'Nova';
  if (itens.every(i => i.status === 'Entregue')) return 'Entregue';
  if (itens.every(i => i.status === 'Reprovada')) return 'Reprovada';
  if (itens.some(i => i.status === 'Comprada')) return 'Comprada';
  if (itens.some(i => i.status === 'Aprovada')) return 'Aprovada';
  return sol.status || 'Nova';
}

function energiaAlertas(medicoes) {
  const atual = medicoes[0];
  if (!atual?.linhas?.length) return [];
  const anteriores = medicoes.slice(1, 4);
  const alertas = [];

  atual.linhas.forEach((linha) => {
    if (linha.virou) alertas.push({ tipo: 'Medidor virou', unidade: linha.unidade, detalhe: `Unidade ${linha.unidade} teve medidor virado.` });
    if (Number(linha.consumo || 0) === 0) alertas.push({ tipo: 'Consumo zerado', unidade: linha.unidade, detalhe: `Unidade ${linha.unidade} teve consumo zerado.` });

    const historico = anteriores
      .map(m => (m.linhas || []).find(l => l.unidade === linha.unidade)?.consumo)
      .filter(v => Number(v) > 0);
    if (historico.length >= 2) {
      const media = historico.reduce((s, v) => s + Number(v), 0) / historico.length;
      if (media > 0) {
        const variacao = ((Number(linha.consumo || 0) - media) / media) * 100;
        if (variacao >= 30) alertas.push({ tipo: 'Acima da média', unidade: linha.unidade, detalhe: `Unidade ${linha.unidade}: ${variacao.toFixed(0)}% acima da média dos últimos ${historico.length} meses.` });
        if (variacao <= -30) alertas.push({ tipo: 'Abaixo da média', unidade: linha.unidade, detalhe: `Unidade ${linha.unidade}: ${Math.abs(variacao).toFixed(0)}% abaixo da média dos últimos ${historico.length} meses.` });
      }
    }
  });

  return alertas.slice(0, 6);
}

function dataRegistro(r) {
  return r.data || r.dataMedicao || r.criadoEm?.slice(0, 10) || '';
}


function rotuloMes(valor) {
  if (!valor) return '-';
  const texto = String(valor);
  if (/^\d{4}-\d{2}/.test(texto)) {
    const [ano, mes] = texto.split('-');
    return `${mes}/${String(ano).slice(2)}`;
  }
  return texto;
}

function mediaNumerica(lista, chave) {
  const valores = lista.map((item) => Number(item?.[chave] || 0)).filter((v) => v > 0);
  if (!valores.length) return 0;
  return valores.reduce((s, v) => s + v, 0) / valores.length;
}


export default function Dashboard() {
  const geradores = getItem('geradores', []);
  const medicoes = getItem('medicoes', []);
  const solicitacoes = getItem('solicitacoes', []);
  const rateios = getItem('rateios_agua', []);
  const dieselTecnico = getItem('tecnicos_diesel', []);

  const ultimaEnergia = medicoes[0];
  const ultimoRateio = rateios[0];
  const ultimoDiesel = dieselTecnico[0];

  const dieselMes = Number(ultimoDiesel?.total || 0) || geradores.reduce((s, g) => s + Number(g.litros || 0), 0);
  const horas = Number(ultimoDiesel?.horasDecimais || 0) || geradores.reduce((s, g) => s + Number(g.horas || 0), 0);
  const consumoEnergia = Number(ultimaEnergia?.resumo?.total || 0);
  const unidadesMedidas = Number(ultimaEnergia?.resumo?.quantidade || 0);
  const virou = ultimaEnergia?.linhas?.filter(l => l.virou).length || 0;

  const pocoTotal = parseBRNumber(ultimoRateio?.consumoPoco1 || 0) + parseBRNumber(ultimoRateio?.consumoPoco2 || 0);
  const sabesp = parseBRNumber(ultimoRateio?.consumoSabesp || 0);
  const consumoAguaTotal = parseBRNumber(ultimoRateio?.consumoTotal || 0) || (pocoTotal + sabesp);
  const pctPoco = consumoAguaTotal ? (pocoTotal / consumoAguaTotal) * 100 : 0;
  const pctSabesp = consumoAguaTotal ? (sabesp / consumoAguaTotal) * 100 : 0;

  const itens = solicitacoes.flatMap(sol => (sol.itens || []).map(item => ({ ...item, setor: sol.setor, solicitante: sol.solicitante, data: sol.data, solicitacaoId: sol.id })));
  const abertas = itens.filter(i => ['Nova', 'Em análise'].includes(i.status)).length;
  const aprovadas = itens.filter(i => i.status === 'Aprovada').length;
  const reprovadas = itens.filter(i => i.status === 'Reprovada').length;
  const entregues = itens.filter(i => i.status === 'Entregue').length;

  const porAreaMap = new Map();
  solicitacoes.forEach(sol => {
    const area = sol.setor || 'Sem área';
    const atual = porAreaMap.get(area) || { area, itens: 0, valor: 0 };
    atual.itens += (sol.itens || []).length;
    atual.valor += (sol.itens || []).reduce((s, i) => s + valorItem(i), 0);
    porAreaMap.set(area, atual);
  });
  const solicitacoesPorArea = Array.from(porAreaMap.values()).sort((a, b) => b.itens - a.itens).slice(0, 8);

  const topEnergia = (ultimaEnergia?.linhas || [])
    .slice()
    .sort((a, b) => Number(b.consumo || 0) - Number(a.consumo || 0))
    .slice(0, 5)
    .map(l => ({ unidade: l.unidade, consumo: Number(l.consumo || 0) }));

  const energiaUnidadesChart = (ultimaEnergia?.linhas || [])
    .map(l => ({ unidade: String(l.unidade), consumo: Number(l.consumo || 0) }))
    .sort((a, b) => String(a.unidade).localeCompare(String(b.unidade), 'pt-BR', { numeric: true }));

  const mediaEnergiaUnidade = Number(ultimaEnergia?.resumo?.media || 0) ||
    mediaNumerica(energiaUnidadesChart, 'consumo');

  const serieEnergia = medicoes.slice(0, 6).reverse().map(m => ({
    mes: rotuloMes(m.mes || m.dataMedicao?.slice(0, 7) || '-'),
    energia: Number(m.resumo?.total || 0)
  }));

  const dieselSerie = dieselTecnico.slice(0, 12).reverse().map((r, idx) => ({
    mes: rotuloMes(r.mesReferencia || r.mes || r.data || r.data_calculo || `M${idx + 1}`),
    litros: Number(r.total || r.resultado?.total || r.diesel || 0),
  })).filter(r => r.litros > 0);

  const mediaDiesel = mediaNumerica(dieselSerie, 'litros');

  const alertasEnergia = energiaAlertas(medicoes);
  const alertas = [
    ...alertasEnergia.map(a => a.detalhe),
    ...(virou ? [`${virou} medidor(es) de energia viraram no último lançamento.`] : []),
    ...(abertas ? [`${abertas} item(ns) aguardando análise/aprovação.`] : []),
    ...(reprovadas ? [`${reprovadas} item(ns) reprovado(s) em solicitações de material.`] : []),
    ...(!ultimaEnergia ? ['Medição de energia dos locatários ainda não lançada.'] : []),
    ...(!ultimoRateio ? ['Rateio de água ainda não gerado.'] : []),
  ].slice(0, 7);

  const statusMes = [
    { label: 'Medição de energia lançada', ok: !!ultimaEnergia },
    { label: 'Rateio de água gerado', ok: !!ultimoRateio },
    { label: 'Diesel atualizado', ok: !!ultimoDiesel || geradores.length > 0 },
    { label: 'Relatórios disponíveis em PDF', ok: true },
    { label: 'Solicitações em análise', ok: abertas === 0, aviso: abertas > 0 },
  ];

  const atividades = [
    ...geradores.slice(0, 3).map(g => ({ data: dataRegistro(g), tipo: 'Gerador', descricao: `${g.gerador || 'Gerador'} - ${num(g.litros)} L` })),
    ...medicoes.slice(0, 3).map(m => ({ data: dataRegistro(m), tipo: 'Energia', descricao: `${int(m.resumo?.total)} kWh • ${m.resumo?.quantidade || 0} unidades` })),
    ...rateios.slice(0, 3).map(r => ({ data: dataRegistro(r), tipo: 'Água', descricao: `${r.mesReferencia || '-'} • tarifa ${brl(r.tarifa)}/m³` })),
    ...solicitacoes.slice(0, 5).map(s => ({ data: dataRegistro(s), tipo: 'Material', descricao: `${s.setor || 'Sem área'} • ${(s.itens || []).length} itens • ${getStatusGeralSolicitacao(s)}` })),
  ].sort((a, b) => String(b.data || '').localeCompare(String(a.data || ''))).slice(0, 8);

  const aguaChart = [
    { name: 'Poço', value: pocoTotal || 0 },
    { name: 'SABESP', value: sabesp || 0 },
  ];

  return <div className="space-y-6">
    <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white p-6 md:p-8 shadow-xl">
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl" />
      <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
      <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div>
          <p className="text-teal-200 font-semibold mb-2">Painel técnico do mês</p>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight">Sistema Técnico Predial — Edifício JK 1455</h1>
          <p className="text-slate-300 mt-3">Energia, água, diesel, solicitações e alertas em um único painel.</p>
        </div>
        <div className="bg-white/10 border border-white/10 rounded-3xl p-4 min-w-[250px]">
          <p className="text-sm text-slate-300">Status geral</p>
          <p className="text-2xl font-bold mt-1">{alertas.length ? 'Atenção' : 'Tudo em dia'}</p>
          <p className="text-xs text-slate-400 mt-2">Última atualização: {new Date().toLocaleString('pt-BR')}</p>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <CardResumo titulo="Energia dos locatários" valor={`${int(consumoEnergia)} kWh`} subtitulo={`${unidadesMedidas} unidades • ${virou} medidor(es) viraram`} icon={Zap} cor="blue" />
      <CardResumo titulo="Diesel mensal" valor={`${num(dieselMes)} L`} subtitulo={`${num(horas)} h registradas`} icon={Fuel} cor="teal" />
      <CardResumo titulo="Rateio de água" valor={ultimoRateio ? `${brl(ultimoRateio.tarifa)}/m³` : '-'} subtitulo={ultimoRateio ? `${num(consumoAguaTotal)} m³ • poço ${num(pctPoco)}%` : 'Sem rateio salvo'} icon={Droplets} cor="purple" />
      <CardResumo titulo="Solicitações" valor={`${abertas} abertas`} subtitulo={`${aprovadas} aprovadas • ${reprovadas} reprovadas • ${entregues} entregues`} icon={PackagePlus} cor="amber" />
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-slate-900">Consumo de diesel</h3>
            <p className="text-sm text-slate-400">Últimos registros com linha de média</p>
          </div>
          <Fuel className="text-blue-500" />
        </div>

        <div className="h-80">
          <ResponsiveContainer>
            <BarChart data={dieselSerie.length ? dieselSerie : [{ mes:'Sem dados', litros:0 }]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip formatter={(v)=>`${num(v)} L`} />
              {mediaDiesel > 0 && (
                <ReferenceLine
                  y={mediaDiesel}
                  stroke="#0f766e"
                  strokeDasharray="6 4"
                  label={{ value: `Média ${num(mediaDiesel)} L`, position: 'insideTopRight', fill: '#0f766e', fontSize: 12 }}
                />
              )}
              <Bar dataKey="litros" name="Diesel L" fill="#2563eb" radius={[10,10,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-2xl bg-blue-50 p-3"><p className="text-blue-700 font-bold">Média</p><p>{mediaDiesel ? `${num(mediaDiesel)} L` : '-'}</p></div>
          <div className="rounded-2xl bg-slate-50 p-3"><p className="text-slate-700 font-bold">Atual</p><p>{num(dieselMes)} L</p></div>
          <div className="rounded-2xl bg-teal-50 p-3"><p className="text-teal-700 font-bold">Horas</p><p>{num(horas)} h</p></div>
        </div>
      </section>

      <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-slate-900">Energia dos locatários</h3>
            <p className="text-sm text-slate-400">Consumo por unidade com linha de média</p>
          </div>
          <TrendingUp className="text-teal-500" />
        </div>

        <div className="h-80">
          <ResponsiveContainer>
            <BarChart data={energiaUnidadesChart.length ? energiaUnidadesChart : [{ unidade:'Sem dados', consumo:0 }]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="unidade" />
              <YAxis />
              <Tooltip formatter={(v)=>`${int(v)} kWh`} />
              {mediaEnergiaUnidade > 0 && (
                <ReferenceLine
                  y={mediaEnergiaUnidade}
                  stroke="#0f766e"
                  strokeDasharray="6 4"
                  label={{ value: `Média ${int(mediaEnergiaUnidade)} kWh`, position: 'insideTopRight', fill: '#0f766e', fontSize: 12 }}
                />
              )}
              <Bar dataKey="consumo" name="Consumo kWh" fill="#14b8a6" radius={[10,10,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-2xl bg-teal-50 p-3"><p className="text-teal-700 font-bold">Total do mês</p><p>{int(consumoEnergia)} kWh</p></div>
          <div className="rounded-2xl bg-blue-50 p-3"><p className="text-blue-700 font-bold">Média por unidade</p><p>{int(mediaEnergiaUnidade)} kWh</p></div>
          <div className="rounded-2xl bg-amber-50 p-3"><p className="text-amber-700 font-bold">Maior consumo</p><p>{topEnergia[0] ? `${topEnergia[0].unidade} • ${int(topEnergia[0].consumo)} kWh` : '-'}</p></div>
        </div>
      </section>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 xl:col-span-1">
        <h3 className="font-bold text-slate-900 mb-1">Status do mês</h3>
        <p className="text-sm text-slate-400 mb-4">Resumo rápido das rotinas principais</p>
        <div className="space-y-3">
          {statusMes.map((s) => <div key={s.label} className={`flex items-center gap-3 p-3 rounded-2xl ${s.ok ? 'bg-teal-50 text-teal-800' : 'bg-amber-50 text-amber-800'}`}>
            {s.ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span className="text-sm font-semibold">{s.label}</span>
          </div>)}
        </div>
      </section>

      <section className="xl:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center gap-2 mb-4"><BarChart3 className="text-blue-500"/><h3 className="font-bold text-slate-900">Atividades recentes</h3></div>
        <Tabela columns={[{key:'data',label:'Data'},{key:'tipo',label:'Tipo'},{key:'descricao',label:'Descrição'}]} rows={atividades.slice(0,5)}/>
      </section>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
        <h3 className="font-bold text-slate-900 mb-1">Poço x SABESP</h3>
        <p className="text-sm text-slate-400 mb-4">Participação no consumo de água</p>
        <div className="h-56"><ResponsiveContainer><PieChart><Pie data={aguaChart} dataKey="value" outerRadius={78} label>{aguaChart.map((_, i) => <Cell key={i} fill={['#14b8a6', '#2563eb'][i]} />)}</Pie><Tooltip formatter={(v)=>`${num(v)} m³`} /></PieChart></ResponsiveContainer></div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-teal-50 p-3"><p className="text-teal-700 font-bold">Poço</p><p>{num(pctPoco)}%</p></div>
          <div className="rounded-2xl bg-blue-50 p-3"><p className="text-blue-700 font-bold">SABESP</p><p>{num(pctSabesp)}%</p></div>
        </div>
      </section>

      <section className="xl:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
        <h3 className="font-bold text-slate-900 mb-1">Solicitações por área</h3>
        <p className="text-sm text-slate-400 mb-4">Quantidade de itens e valor estimado lançado pelo ADM</p>
        <div className="h-64"><ResponsiveContainer><BarChart data={solicitacoesPorArea}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="area"/><YAxis/><Tooltip formatter={(v, name)=> name === 'valor' ? brl(v) : int(v)} /><Bar dataKey="itens" name="Itens" fill="#14b8a6" radius={[8,8,0,0]} /></BarChart></ResponsiveContainer></div>
        <Tabela columns={[{key:'area',label:'Área'},{key:'itens',label:'Itens'},{key:'valor',label:'Valor estimado',render:r=>brl(r.valor)}]} rows={solicitacoesPorArea.slice(0,5)} />
      </section>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center gap-2 mb-4"><AlertTriangle className="text-amber-500"/><h3 className="font-bold text-slate-900">Alertas do sistema</h3></div>
        <div className="space-y-3">
          {alertas.length === 0 && <p className="text-sm text-slate-400">Nenhum alerta no momento.</p>}
          {alertas.map((a, i) => <div key={i} className="rounded-2xl bg-amber-50 border border-amber-100 p-3 text-sm text-amber-900 font-medium">{a}</div>)}
        </div>
      </section>

      <section className="xl:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center gap-2 mb-4"><BarChart3 className="text-blue-500"/><h3 className="font-bold text-slate-900">Histórico rápido</h3></div>
        <Tabela columns={[{key:'data',label:'Data'},{key:'tipo',label:'Tipo'},{key:'descricao',label:'Descrição'}]} rows={atividades}/>
      </section>
    </div>
  </div>;
}
