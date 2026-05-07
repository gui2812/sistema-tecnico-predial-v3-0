import { AlertTriangle, ClipboardCheck, Gauge, Save, Search, Trash2, TrendingUp, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import CardResumo from '../components/CardResumo';
import Tabela from '../components/Tabela';
import { addItem, deleteItem, getItem } from '../services/storageService';
import { calcularConsumosLocatarios } from '../utils/calculosLocatarios';
import { int, today } from '../utils/formatters';

function normalizar(txt){
  return String(txt || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'');
}

function diffMedia(consumo, media) {
  const c = Number(consumo || 0);
  const m = Number(media || 0);
  if (!m) return { valor: 0, pct: 0 };
  return { valor: c - m, pct: ((c - m) / m) * 100 };
}

function gerarAnalise(linhas, historico) {
  return linhas.map((linha) => {
    const anteriores = historico.slice(0, 3)
      .map(m => (m.linhas || []).find(l => l.unidade === linha.unidade)?.consumo)
      .filter(v => Number(v) > 0);

    const media3 = anteriores.length
      ? anteriores.reduce((s, v) => s + Number(v), 0) / anteriores.length
      : 0;

    const variacaoMedia = media3
      ? ((Number(linha.consumo || 0) - media3) / media3) * 100
      : null;

    let alerta = '';

    if (linha.virou) alerta = 'Medidor virou';
    else if (Number(linha.consumo || 0) === 0) alerta = 'Consumo zerado';
    else if (variacaoMedia !== null && variacaoMedia >= 30) alerta = 'Acima da média';
    else if (variacaoMedia !== null && variacaoMedia <= -30) alerta = 'Abaixo da média';

    return { ...linha, media3, variacaoMedia, alerta };
  });
}

function rotuloMedicao(medicao) {
  const dataAtual = medicao?.dataMedicao || '-';
  const dataAnterior = medicao?.mes || '-';
  const total = medicao?.resumo?.total || 0;

  return `${dataAtual} | Anterior: ${dataAnterior} | Total: ${int(total)} kWh`;
}

export default function Locatarios(){
  const historicoInicial = getItem('medicoes', []);
  const ultimaMedicao = historicoInicial[0];

  const [historico, setHistorico] = useState(historicoInicial);
  const [medicaoSelecionadaId, setMedicaoSelecionadaId] = useState(ultimaMedicao?.id || '');

  const [mes,setMes]=useState(ultimaMedicao?.mes || today());
  const [data,setData]=useState(ultimaMedicao?.dataMedicao || today());
  const [anterior,setAnterior]=useState(ultimaMedicao?.anterior || '');
  const [atual,setAtual]=useState(ultimaMedicao?.atual || '');

  const [resultado,setResultado]=useState(() => {
    if (ultimaMedicao?.resumo) return ultimaMedicao.resumo;

    if (ultimaMedicao?.anterior && ultimaMedicao?.atual) {
      return calcularConsumosLocatarios(ultimaMedicao.anterior, ultimaMedicao.atual);
    }

    return calcularConsumosLocatarios('', '');
  });

  const [busca,setBusca]=useState('');
  const [filtroAlerta,setFiltroAlerta]=useState('Todos');
  const [versao,setVersao]=useState(0);

  const linhasAnalisadas = useMemo(() => gerarAnalise(resultado.linhas || [], historico), [resultado, historico, versao]);

  const filtradas = linhasAnalisadas.filter(l => {
    const termo = normalizar(busca);
    const alertaOk = filtroAlerta === 'Todos' || l.alerta === filtroAlerta || (filtroAlerta === 'Sem alerta' && !l.alerta);
    const texto = normalizar([l.unidade, l.consumo, l.alerta, l.observacao].join(' '));
    return alertaOk && (!termo || texto.includes(termo));
  });

  const chartConsumo = linhasAnalisadas
    .map(l => ({
      unidade: String(l.unidade),
      consumo: Number(l.consumo || 0),
      acimaMedia: Number(l.consumo || 0) > Number(resultado.media || 0)
    }))
    .sort((a,b)=>String(a.unidade).localeCompare(String(b.unidade), 'pt-BR', { numeric: true }));

  const topAumento = linhasAnalisadas
    .filter(l => l.variacaoMedia !== null)
    .slice()
    .sort((a,b)=>Number(b.variacaoMedia)-Number(a.variacaoMedia))
    .slice(0,5);

  const alertas = linhasAnalisadas.filter(l => l.alerta);

  function calcular(){
    setResultado(calcularConsumosLocatarios(anterior,atual));
  }

  function carregarMedicaoSalva(id){
    setMedicaoSelecionadaId(id);

    const medicao = historico.find((m) => String(m.id) === String(id));
    if (!medicao) return;

    setMes(medicao?.mes || today());
    setData(medicao?.dataMedicao || today());
    setAnterior(medicao?.anterior || '');
    setAtual(medicao?.atual || '');

    if (medicao?.resumo) {
      setResultado(medicao.resumo);
    } else {
      setResultado(calcularConsumosLocatarios(medicao?.anterior || '', medicao?.atual || ''));
    }

    setVersao(v => v + 1);
  }

  function salvar(){
    const r=calcularConsumosLocatarios(anterior,atual);
    const analise = gerarAnalise(r.linhas, historico);

    const novaMedicao = addItem('medicoes',{
      mes,
      dataMedicao:data,
      anterior,
      atual,
      linhas:r.linhas,
      resumo:r,
      analise
    });

    setHistorico([novaMedicao, ...historico]);
    setMedicaoSelecionadaId(novaMedicao.id);
    setResultado(r);
    setVersao(v=>v+1);
    alert('Medição de energia salva no histórico.');
  }

  function excluirMedicao(id){
    if(!confirm('Deseja realmente excluir esta medição?')) return;

    deleteItem('medicoes', id);

    const novoHistorico = historico.filter((m) => m.id !== id);
    setHistorico(novoHistorico);

    if (novoHistorico.length > 0) {
      const ultima = novoHistorico[0];

      setMedicaoSelecionadaId(ultima.id);
      setMes(ultima?.mes || today());
      setData(ultima?.dataMedicao || today());
      setAnterior(ultima?.anterior || '');
      setAtual(ultima?.atual || '');

      if (ultima?.resumo) {
        setResultado(ultima.resumo);
      } else {
        setResultado(calcularConsumosLocatarios(ultima?.anterior || '', ultima?.atual || ''));
      }
    } else {
      setMedicaoSelecionadaId('');
      setMes(today());
      setData(today());
      setAnterior('');
      setAtual('');
      setResultado(calcularConsumosLocatarios('', ''));
    }

    setVersao(v=>v+1);
    alert('Medição excluída com sucesso.');
  }

  return <div className="space-y-6">
    <div className="rounded-[2rem] bg-gradient-to-br from-blue-950 to-slate-950 text-white p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <Zap className="text-teal-300"/>
        <p className="font-semibold text-teal-200">Medição Mensal de Energia</p>
      </div>
      <h1 className="text-2xl md:text-3xl font-black">Energia dos Locatários</h1>
      <p className="text-slate-300 mt-2">
        Cole as leituras anterior e atual, calcule o consumo em kWh, identifique medidor virado e acompanhe variações.
      </p>
    </div>

    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="md:col-span-2">
          <label className="text-sm font-semibold text-slate-700">
            Visualizar medição salva
          </label>

          <select
            value={medicaoSelecionadaId}
            onChange={(e)=>carregarMedicaoSalva(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-sm bg-white"
          >
            {historico.length === 0 && (
              <option value="">Nenhuma medição salva</option>
            )}

            {historico.map((m) => (
              <option key={m.id} value={m.id}>
                {rotuloMedicao(m)}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl bg-blue-50 p-4">
          <p className="text-sm font-bold text-blue-700">Medição exibida</p>
          <p className="text-sm text-slate-700">Atual: {data || '-'}</p>
          <p className="text-sm text-slate-700">Anterior: {mes || '-'}</p>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      <CardResumo titulo="Unidades medidas" valor={resultado.quantidade} icon={ClipboardCheck}/>
      <CardResumo titulo="Total consumido" valor={`${int(resultado.total)} kWh`} cor="teal" icon={Zap}/>
      <CardResumo titulo="Maior consumo" valor={resultado.maior?`${resultado.maior.unidade} - ${int(resultado.maior.consumo)}`:'-'} cor="amber" icon={TrendingUp}/>
      <CardResumo titulo="Média por unidade" valor={`${int(resultado.media)} kWh`} cor="purple" icon={Gauge}/>
      <CardResumo titulo="Alertas" valor={alertas.length} subtitulo="Variação, zerado ou medidor virado" cor="rose" icon={AlertTriangle}/>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <section className="xl:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
        <h3 className="font-bold mb-1">Consumo por unidade</h3>
        <p className="text-sm text-slate-400 mb-4">Barras por unidade com linha de média geral do mês</p>

        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={chartConsumo.length ? chartConsumo : [{ unidade: 'Sem dados', consumo: 0 }]}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="unidade"/>
              <YAxis/>
              <Tooltip formatter={(v)=>`${int(v)} kWh`}/>

              {Number(resultado.media || 0) > 0 && (
                <ReferenceLine
                  y={Number(resultado.media || 0)}
                  stroke="#0f766e"
                  strokeDasharray="6 4"
                  label={{
                    value: `Média ${int(resultado.media)} kWh`,
                    position: 'insideTopRight',
                    fill: '#0f766e',
                    fontSize: 12
                  }}
                />
              )}

              <Bar dataKey="consumo" name="Consumo" radius={[8,8,0,0]}>
                {(chartConsumo.length ? chartConsumo : [{ unidade:'Sem dados', consumo:0 }]).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.acimaMedia ? '#22c55e' : '#14b8a6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-sm">
          <div className="rounded-2xl bg-teal-50 p-3">
            <p className="text-teal-700 font-bold">Média por unidade</p>
            <p>{int(resultado.media)} kWh</p>
          </div>

          <div className="rounded-2xl bg-blue-50 p-3">
            <p className="text-blue-700 font-bold">Total do mês</p>
            <p>{int(resultado.total)} kWh</p>
          </div>

          <div className="rounded-2xl bg-amber-50 p-3">
            <p className="text-amber-700 font-bold">Maior consumo</p>
            <p>{resultado.maior ? `${resultado.maior.unidade} • ${int(resultado.maior.consumo)} kWh` : '-'}</p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
        <h3 className="font-bold mb-1">Alertas de leitura</h3>
        <p className="text-sm text-slate-400 mb-4">Comparação com histórico quando existir</p>

        <div className="space-y-3 max-h-72 overflow-auto pr-1">
          {alertas.length === 0 && <p className="text-sm text-slate-400">Nenhum alerta encontrado.</p>}

          {alertas.slice(0,8).map((a)=>
            <div key={a.unidade+a.alerta} className="rounded-2xl bg-amber-50 border border-amber-100 p-3 text-sm">
              <p className="font-bold text-amber-900">{a.unidade} • {a.alerta}</p>
              {a.variacaoMedia !== null && (
                <p className="text-amber-800">Variação: {a.variacaoMedia.toFixed(0)}% vs. média 3 meses</p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>

    {topAumento.length > 0 && <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
      <h3 className="font-bold mb-4">Top aumentos vs. média dos últimos 3 meses</h3>

      <Tabela
        columns={[
          {key:'unidade',label:'Unidade'},
          {key:'consumo',label:'Consumo atual',render:r=>`${int(r.consumo)} kWh`},
          {key:'media3',label:'Média 3 meses',render:r=>`${int(r.media3)} kWh`},
          {key:'variacaoMedia',label:'Variação',render:r=>`${r.variacaoMedia.toFixed(0)}%`},
          {key:'alerta',label:'Alerta'}
        ]}
        rows={topAumento}
      />
    </section>}

    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm font-semibold">Data da medição anterior</label>
          <input
            type="date"
            value={mes}
            onChange={e=>setMes(e.target.value)}
            className="mt-2 w-full rounded-2xl border p-3"
          />
        </div>

        <div>
          <label className="text-sm font-semibold">Data da medição atual</label>
          <input
            type="date"
            value={data}
            onChange={e=>setData(e.target.value)}
            className="mt-2 w-full rounded-2xl border p-3"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold">Medições do mês anterior</label>
          <textarea
            value={anterior}
            onChange={e=>setAnterior(e.target.value)}
            placeholder="Exemplo:&#10;1601 - 16050&#10;1602 - 05599"
            className="mt-2 w-full h-72 rounded-2xl border p-4 font-mono text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-semibold">Medições do mês atual</label>
          <textarea
            value={atual}
            onChange={e=>setAtual(e.target.value)}
            placeholder="Exemplo:&#10;1601 - 24546&#10;1602 - 08143"
            className="mt-2 w-full h-72 rounded-2xl border p-4 font-mono text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-5">
        <button
          onClick={calcular}
          className="px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold"
        >
          Calcular consumo
        </button>

        <button
          onClick={salvar}
          className="px-5 py-3 rounded-2xl bg-teal-600 text-white font-semibold flex gap-2"
        >
          <Save size={18}/>Salvar medição
        </button>
      </div>
    </div>

    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
        <h3 className="font-bold">Resultado da medição de energia</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full lg:w-auto">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2">
            <Search size={16} className="text-slate-400"/>
            <input
              value={busca}
              onChange={e=>setBusca(e.target.value)}
              placeholder="Pesquisar unidade..."
              className="outline-none text-sm w-full"
            />
          </div>

          <select
            value={filtroAlerta}
            onChange={e=>setFiltroAlerta(e.target.value)}
            className="rounded-2xl border border-slate-200 p-3 text-sm"
          >
            <option>Todos</option>
            <option>Sem alerta</option>
            <option>Medidor virou</option>
            <option>Consumo zerado</option>
            <option>Acima da média</option>
            <option>Abaixo da média</option>
          </select>
        </div>
      </div>

      <Tabela
        columns={[
          {key:'unidade',label:'Unidade'},
          {key:'anterior',label:'Anterior',render:r=>int(r.anterior)},
          {key:'atual',label:'Atual',render:r=>String(r.atual).padStart(5,'0')},
          {key:'consumo',label:'Consumo kWh',render:r=>int(r.consumo)},
          {key:'diffMedia',label:'Diferença da média',render:r=>{
            const d = diffMedia(r.consumo, resultado.media);
            const acima = d.valor > 0;

            return <span className={`font-bold ${acima ? 'text-rose-600' : 'text-teal-600'}`}>
              {d.valor > 0 ? '+' : ''}{int(d.valor)} kWh ({d.pct > 0 ? '+' : ''}{d.pct.toFixed(0)}%)
            </span>;
          }},
          {key:'media3',label:'Média 3 meses',render:r=>r.media3 ? `${int(r.media3)} kWh` : '-'},
          {key:'virou',label:'Virou medidor',render:r=>r.virou?<span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">Sim</span>:'Não'},
          {key:'alerta',label:'Alerta',render:r=>r.alerta ? <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 font-semibold">{r.alerta}</span> : '-'}
        ]}
        rows={filtradas}
      />
    </div>

    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
      <h3 className="font-bold mb-4">Histórico de medições salvas</h3>

      <Tabela
        columns={[
          {key:'dataMedicao',label:'Data da medição'},
          {key:'mes',label:'Data anterior'},
          {key:'total',label:'Total consumido',render:r=>`${int(r.resumo?.total || 0)} kWh`},
          {key:'quantidade',label:'Unidades',render:r=>r.resumo?.quantidade || 0},
          {key:'acao',label:'',render:r=>
            <button
              onClick={()=>excluirMedicao(r.id)}
              className="text-rose-600"
              title="Excluir medição"
            >
              <Trash2 size={16}/>
            </button>
          }
        ]}
        rows={historico}
      />
    </div>
  </div>
}
