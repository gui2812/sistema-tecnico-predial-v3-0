import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Fuel,
  Gauge,
  PackagePlus,
  Zap
} from 'lucide-react';
import CardResumo from '../components/CardResumo';
import Tabela from '../components/Tabela';
import { getItem } from '../services/storageService';
import { brl, int, num, parseBRNumber } from '../utils/formatters';

function dataRegistro(r) {
  return r.data || r.dataMedicao || r.criadoEm?.slice(0, 10) || '';
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

function descricaoCalculoTecnico(item) {
  const tipo = item.tipo || item.categoria || item.nome || item.titulo || 'Cálculo técnico';

  const resultado =
    item.resultado?.total ||
    item.resultado?.valor ||
    item.total ||
    item.valor ||
    item.custo ||
    item.potencia ||
    item.corrente ||
    '';

  return resultado ? `${tipo} • Resultado: ${num(resultado)}` : tipo;
}

export default function Dashboard() {
  const geradores = getItem('geradores', []);
  const medicoes = getItem('medicoes', []);
  const solicitacoes = getItem('solicitacoes', []);
  const rateios = getItem('rateios_agua', []);
  const dieselTecnico = getItem('tecnicos_diesel', []);

  const calculosTecnicos = [
    ...getItem('calculosTecnicos', []),
    ...getItem('calculos_tecnicos', []),
    ...getItem('calculos-tecnicos', []),
    ...getItem('tecnicos', []),
    ...getItem('calculos', [])
  ];

  const ultimaEnergia = medicoes[0];
  const ultimoRateio = rateios[0];
  const ultimoDiesel = dieselTecnico[0];
  const ultimoCalculoTecnico = calculosTecnicos[0] || dieselTecnico[0];

  const consumoEnergia = Number(ultimaEnergia?.resumo?.total || 0);
  const unidadesMedidas = Number(ultimaEnergia?.resumo?.quantidade || 0);
  const virou = ultimaEnergia?.linhas?.filter(l => l.virou).length || 0;

  const dieselMes =
    Number(ultimoDiesel?.total || ultimoDiesel?.resultado?.total || 0) ||
    geradores.reduce((s, g) => s + Number(g.litros || 0), 0);

  const custoDiesel = geradores.reduce((s, g) => s + Number(g.custo || 0), 0);
  const registrosDiesel = geradores.length + dieselTecnico.length;
  const totalCalculosTecnicos = calculosTecnicos.length + dieselTecnico.length;

  const ultimoRateioTarifa = ultimoRateio ? brl(ultimoRateio.tarifa) : '-';

  const pocoTotal =
    parseBRNumber(ultimoRateio?.consumoPoco1 || 0) +
    parseBRNumber(ultimoRateio?.consumoPoco2 || 0);

  const sabesp = parseBRNumber(ultimoRateio?.consumoSabesp || 0);

  const consumoAguaTotal =
    parseBRNumber(ultimoRateio?.consumoTotal || 0) ||
    pocoTotal + sabesp;

  const pctPoco = consumoAguaTotal ? (pocoTotal / consumoAguaTotal) * 100 : 0;

  const itens = solicitacoes.flatMap(sol =>
    (sol.itens || []).map(item => ({
      ...item,
      setor: sol.setor,
      solicitante: sol.solicitante,
      data: sol.data,
      solicitacaoId: sol.id
    }))
  );

  const abertas = itens.filter(i => ['Nova', 'Em análise'].includes(i.status)).length;
  const aprovadas = itens.filter(i => i.status === 'Aprovada').length;
  const reprovadas = itens.filter(i => i.status === 'Reprovada').length;
  const entregues = itens.filter(i => i.status === 'Entregue').length;

  const alertas = [
    ...(!ultimaEnergia ? ['Medição de energia dos locatários ainda não lançada.'] : []),
    ...(!ultimoRateio ? ['Rateio de água ainda não gerado.'] : []),
    ...(!ultimoCalculoTecnico ? ['Cálculos técnicos ainda não lançados.'] : []),
    ...(abertas ? [`${abertas} item(ns) aguardando análise/aprovação.`] : []),
    ...(reprovadas ? [`${reprovadas} item(ns) reprovado(s) em solicitações de material.`] : []),
    ...(virou ? [`${virou} medidor(es) de energia viraram no último lançamento.`] : [])
  ].slice(0, 7);

  const statusMes = [
    { label: 'Medição de energia lançada', ok: !!ultimaEnergia },
    { label: 'Rateio de água gerado', ok: !!ultimoRateio },
    { label: 'Diesel atualizado', ok: registrosDiesel > 0 },
    { label: 'Cálculos técnicos lançados', ok: totalCalculosTecnicos > 0 },
    { label: 'Solicitações sem pendência', ok: abertas === 0 }
  ];

  const atividades = [
    ...geradores.slice(0, 5).map(g => ({
      data: dataRegistro(g),
      tipo: 'Gerador',
      descricao: `${g.gerador || 'Gerador'} • ${num(g.litros)} L • ${brl(g.custo)}`
    })),
    ...dieselTecnico.slice(0, 3).map(d => ({
      data: dataRegistro(d),
      tipo: 'Diesel técnico',
      descricao: `${num(d.total || d.resultado?.total || 0)} L`
    })),
    ...calculosTecnicos.slice(0, 5).map(c => ({
      data: dataRegistro(c),
      tipo: 'Cálculo técnico',
      descricao: descricaoCalculoTecnico(c)
    })),
    ...medicoes.slice(0, 5).map(m => ({
      data: dataRegistro(m),
      tipo: 'Energia',
      descricao: `${int(m.resumo?.total)} kWh • ${m.resumo?.quantidade || 0} unidades`
    })),
    ...rateios.slice(0, 5).map(r => ({
      data: dataRegistro(r),
      tipo: 'Água',
      descricao: `${r.mesReferencia || '-'} • tarifa ${brl(r.tarifa)}/m³`
    })),
    ...solicitacoes.slice(0, 5).map(s => ({
      data: dataRegistro(s),
      tipo: 'Material',
      descricao: `${s.setor || 'Sem área'} • ${(s.itens || []).length} itens • ${getStatusGeralSolicitacao(s)}`
    }))
  ].sort((a, b) => String(b.data || '').localeCompare(String(a.data || ''))).slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white p-6 md:p-8 shadow-xl">
        <p className="text-teal-200 font-semibold mb-2">Painel técnico do mês</p>
        <h1 className="text-2xl md:text-4xl font-black tracking-tight">
          Sistema Técnico Predial — Edifício JK 1455
        </h1>
        <p className="text-slate-300 mt-3">
          Energia, água, diesel, cálculos técnicos, solicitações e alertas em um único painel.
        </p>

        <div className="mt-5 bg-white/10 border border-white/10 rounded-3xl p-4 max-w-sm">
          <p className="text-sm text-slate-300">Status geral</p>
          <p className="text-2xl font-bold mt-1">{alertas.length ? 'Atenção' : 'Tudo em dia'}</p>
          <p className="text-xs text-slate-400 mt-2">
            Última atualização: {new Date().toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <CardResumo
          titulo="Energia dos locatários"
          valor={`${int(consumoEnergia)} kWh`}
          subtitulo={`${unidadesMedidas} unidades • ${virou} medidor(es) viraram`}
          icon={Zap}
          cor="blue"
        />

        <CardResumo
          titulo="Diesel mensal"
          valor={`${num(dieselMes)} L`}
          subtitulo={`${registrosDiesel} registro(s) • ${brl(custoDiesel)}`}
          icon={Fuel}
          cor="teal"
        />

        <CardResumo
          titulo="Cálculos técnicos"
          valor={`${totalCalculosTecnicos} registro(s)`}
          subtitulo={ultimoCalculoTecnico ? descricaoCalculoTecnico(ultimoCalculoTecnico) : 'Nenhum cálculo lançado'}
          icon={Gauge}
          cor="blue"
        />

        <CardResumo
          titulo="Rateio de água"
          valor={ultimoRateio ? `${ultimoRateioTarifa}/m³` : '-'}
          subtitulo={ultimoRateio ? `${num(consumoAguaTotal)} m³ • poço ${num(pctPoco)}%` : 'Sem rateio salvo'}
          icon={Droplets}
          cor="purple"
        />

        <CardResumo
          titulo="Solicitações"
          valor={`${abertas} abertas`}
          subtitulo={`${aprovadas} aprovadas • ${reprovadas} reprovadas • ${entregues} entregues`}
          icon={PackagePlus}
          cor="amber"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-bold text-slate-900 mb-1">Status do mês</h3>
          <p className="text-sm text-slate-400 mb-4">Resumo rápido das rotinas principais</p>

          <div className="space-y-3">
            {statusMes.map((s) => (
              <div
                key={s.label}
                className={`flex items-center gap-3 p-3 rounded-2xl ${
                  s.ok ? 'bg-teal-50 text-teal-800' : 'bg-amber-50 text-amber-800'
                }`}
              >
                {s.ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                <span className="text-sm font-semibold">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="xl:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-bold text-slate-900 mb-4">Atividades recentes</h3>

          <Tabela
            columns={[
              {key:'data',label:'Data'},
              {key:'tipo',label:'Tipo'},
              {key:'descricao',label:'Descrição'}
            ]}
            rows={atividades}
          />
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-bold text-slate-900 mb-1">Resumo de diesel</h3>
          <p className="text-sm text-slate-400 mb-4">Dados vindos de Geradores e Cálculos Técnicos</p>

          <div className="space-y-3">
            <div className="rounded-2xl bg-teal-50 p-4">
              <p className="text-teal-700 font-bold">Litros registrados</p>
              <p className="text-2xl font-black">{num(dieselMes)} L</p>
            </div>

            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-amber-700 font-bold">Custo registrado</p>
              <p className="text-2xl font-black">{brl(custoDiesel)}</p>
            </div>

            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-blue-700 font-bold">Registros</p>
              <p className="text-2xl font-black">{registrosDiesel}</p>
            </div>
          </div>
        </section>

        <section className="xl:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-bold text-slate-900 mb-4">Alertas do sistema</h3>

          <div className="space-y-3">
            {alertas.length === 0 && (
              <p className="text-sm text-slate-400">Nenhum alerta no momento.</p>
            )}

            {alertas.map((a, i) => (
              <div
                key={i}
                className="rounded-2xl bg-amber-50 border border-amber-100 p-3 text-sm text-amber-900 font-medium"
              >
                {a}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
