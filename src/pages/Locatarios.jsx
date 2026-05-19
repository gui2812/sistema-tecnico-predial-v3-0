import {
  AlertTriangle,
  ClipboardCheck,
  Gauge,
  Save,
  Search,
  Trash2,
  TrendingUp,
  Upload,
  Zap
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import CardResumo from '../components/CardResumo';
import Tabela from '../components/Tabela';
import { calcularConsumosLocatarios, parseMedicoes } from '../utils/calculosLocatarios';
import {
  criarMedicaoLocatariosSupabase,
  excluirMedicaoLocatariosSupabase,
  listarMedicoesLocatariosSupabase,
} from '../services/medicoesLocatariosSupabaseService';
import { registrarHistoricoSupabase } from '../services/historicoSupabaseService';
import { int, today } from '../utils/formatters';

const UNIDADES_PADRAO = [
  '1601',
  '1602',
  '1501',
  '1502',
  '1401',
  '1402',
  '1201',
  '1202',
  '1101',
  '1102',
  '1001',
  '1002',
  '901',
  '902',
  '801',
  '802',
  '701',
  '702',
  '601',
  '602',
  '501',
  '502',
  '401',
  '402',
  '302',
  '301'
];

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

function montarTextoMedicoesPorCampo(linhas, campo) {
  return linhas
    .filter(l => String(l?.[campo] ?? '').trim() !== '')
    .map(l => `${l.unidade} - ${String(l[campo]).trim()}`)
    .join('\n');
}

function mapearMedicoes(texto) {
  return new Map(parseMedicoes(texto).map(m => [String(m.unidade), String(m.leitura)]));
}

function unidadesDoHistorico(historico) {
  const set = new Set(UNIDADES_PADRAO);

  historico.forEach((m) => {
    (m.linhas || []).forEach((l) => {
      if (l.unidade) set.add(String(l.unidade));
    });

    parseMedicoes(m.anterior || '').forEach((l) => set.add(String(l.unidade)));
    parseMedicoes(m.atual || '').forEach((l) => set.add(String(l.unidade)));
  });

  return Array.from(set).sort((a, b) =>
    String(a).localeCompare(String(b), 'pt-BR', { numeric: true })
  );
}

function criarLinhasTabela(unidades, anteriorTexto = '', atualTexto = '') {
  const anteriores = mapearMedicoes(anteriorTexto);
  const atuais = mapearMedicoes(atualTexto);

  return unidades.map((unidade) => ({
    unidade,
    anterior: anteriores.get(String(unidade)) || '',
    atual: atuais.get(String(unidade)) || ''
  }));
}

function linhasPelaMedicao(medicao, unidades) {
  if (!medicao) return criarLinhasTabela(unidades);

  if (medicao.linhas?.length) {
    const mapa = new Map(
      medicao.linhas.map((l) => [
        String(l.unidade),
        {
          anterior: String(l.anterior ?? ''),
          atual: String(l.atual ?? '')
        }
      ])
    );

    return unidades.map((unidade) => {
      const achado = mapa.get(String(unidade));

      return {
        unidade,
        anterior: achado?.anterior || '',
        atual: achado?.atual || ''
      };
    });
  }

  return criarLinhasTabela(unidades, medicao.anterior || '', medicao.atual || '');
}

function linhasComUltimaComoAnterior(ultimaMedicao, unidades) {
  if (!ultimaMedicao) return criarLinhasTabela(unidades);

  if (ultimaMedicao.linhas?.length) {
    const mapaAtual = new Map(
      ultimaMedicao.linhas.map((l) => [String(l.unidade), String(l.atual ?? '')])
    );

    return unidades.map((unidade) => ({
      unidade,
      anterior: mapaAtual.get(String(unidade)) || '',
      atual: ''
    }));
  }

  const atuais = mapearMedicoes(ultimaMedicao.atual || '');

  return unidades.map((unidade) => ({
    unidade,
    anterior: atuais.get(String(unidade)) || '',
    atual: ''
  }));
}

function aplicarTextoNasLinhas(linhas, texto, campo) {
  const mapa = mapearMedicoes(texto);

  return linhas.map((linha) => ({
    ...linha,
    [campo]: mapa.get(String(linha.unidade)) ?? linha[campo]
  }));
}

export default function Locatarios({ user }){
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [medicaoSelecionadaId, setMedicaoSelecionadaId] = useState('');

  const [mes,setMes]=useState(today());
  const [data,setData]=useState(today());
  const [linhasTabela,setLinhasTabela]=useState(() => criarLinhasTabela(UNIDADES_PADRAO));
  const [importacaoAnterior,setImportacaoAnterior]=useState('');
  const [importacaoAtual,setImportacaoAtual]=useState('');

  const anterior = useMemo(
    () => montarTextoMedicoesPorCampo(linhasTabela, 'anterior'),
    [linhasTabela]
  );

  const atual = useMemo(
    () => montarTextoMedicoesPorCampo(linhasTabela, 'atual'),
    [linhasTabela]
  );

  const [resultado,setResultado]=useState(() => calcularConsumosLocatarios('', ''));

  const [busca,setBusca]=useState('');
  const [filtroAlerta,setFiltroAlerta]=useState('Todos');
  const [versao,setVersao]=useState(0);

  async function carregarHistorico() {
    setCarregando(true);

    try {
      const lista = await listarMedicoesLocatariosSupabase();
      setHistorico(lista);

      if (lista.length > 0) {
        const ultima = lista[0];
        const unidades = unidadesDoHistorico(lista);

        setMedicaoSelecionadaId(ultima.id);
        setMes(ultima?.mes || today());
        setData(ultima?.dataMedicao || today());
        setLinhasTabela(linhasPelaMedicao(ultima, unidades));

        if (ultima?.resumo) {
          setResultado(ultima.resumo);
        } else {
          setResultado(calcularConsumosLocatarios(ultima?.anterior || '', ultima?.atual || ''));
        }
      } else {
        setMedicaoSelecionadaId('');
        setMes(today());
        setData(today());
        setLinhasTabela(criarLinhasTabela(UNIDADES_PADRAO));
        setResultado(calcularConsumosLocatarios('', ''));
      }

      setVersao(v => v + 1);
    } catch (err) {
      console.error(err);
      alert('Não foi possível carregar as medições do Supabase.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarHistorico();
  }, []);

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

  function atualizarLinha(unidade, campo, valor) {
    setLinhasTabela((prev) =>
      prev.map((linha) =>
        String(linha.unidade) === String(unidade)
          ? { ...linha, [campo]: valor.replace(/\D/g, '') }
          : linha
      )
    );
  }

  function calcular(){
    const r = calcularConsumosLocatarios(anterior, atual);
    setResultado(r);
    setVersao(v => v + 1);
  }

  function carregarMedicaoSalva(id){
    setMedicaoSelecionadaId(id);

    const medicao = historico.find((m) => String(m.id) === String(id));
    if (!medicao) return;

    const unidades = unidadesDoHistorico(historico);

    setMes(medicao?.mes || today());
    setData(medicao?.dataMedicao || today());
    setLinhasTabela(linhasPelaMedicao(medicao, unidades));

    if (medicao?.resumo) {
      setResultado(medicao.resumo);
    } else {
      setResultado(calcularConsumosLocatarios(medicao?.anterior || '', medicao?.atual || ''));
    }

    setVersao(v => v + 1);
  }

  function carregarUltimaComoAnterior() {
    if (!historico.length) {
      alert('Ainda não existe medição salva para usar como mês anterior.');
      return;
    }

    const ultima = historico[0];
    const unidades = unidadesDoHistorico(historico);

    setMes(ultima?.dataMedicao || today());
    setData(today());
    setLinhasTabela(linhasComUltimaComoAnterior(ultima, unidades));
    setMedicaoSelecionadaId('');

    const textoAnterior = montarTextoMedicoesPorCampo(
      linhasComUltimaComoAnterior(ultima, unidades),
      'anterior'
    );

    setResultado(calcularConsumosLocatarios(textoAnterior, ''));
    setVersao(v => v + 1);

    alert('Última medição carregada como mês anterior. Agora preencha somente a leitura atual.');
  }

  function limparAtuais() {
    if (!confirm('Deseja limpar todas as leituras atuais?')) return;

    setLinhasTabela(prev => prev.map(l => ({ ...l, atual: '' })));
    setResultado(calcularConsumosLocatarios(anterior, ''));
    setVersao(v => v + 1);
  }

  function importarAnterior() {
    if (!importacaoAnterior.trim()) {
      alert('Cole as leituras anteriores antes de importar.');
      return;
    }

    setLinhasTabela(prev => aplicarTextoNasLinhas(prev, importacaoAnterior, 'anterior'));
    setImportacaoAnterior('');
    alert('Leituras anteriores importadas para a tabela.');
  }

  function importarAtual() {
    if (!importacaoAtual.trim()) {
      alert('Cole as leituras atuais antes de importar.');
      return;
    }

    setLinhasTabela(prev => aplicarTextoNasLinhas(prev, importacaoAtual, 'atual'));
    setImportacaoAtual('');
    alert('Leituras atuais importadas para a tabela.');
  }

  async function salvar(){
    const r = calcularConsumosLocatarios(anterior,atual);
    const analise = gerarAnalise(r.linhas, historico);

    if (!r.linhas?.length) {
      alert('Preencha as leituras atuais antes de salvar.');
      return;
    }

    setSalvando(true);

    try {
      const novaMedicao = await criarMedicaoLocatariosSupabase({
        mes,
        dataMedicao: data,
        anterior,
        atual,
        linhas: r.linhas,
        resumo: r,
        analise,
        criadoPor: user?.nome || user?.usuario || '',
        criadoPorId: user?.id || null,
      });

      try {
        await registrarHistoricoSupabase({
          tipo: 'Energia dos Locatários',
          modulo: 'Energia dos Locatários',
          acao: 'Medição salva',
          descricao: `Medição de energia dos locatários salva com total de ${r.total || 0} kWh.`,
          usuario: user?.nome || user?.usuario || 'Sistema',
          usuario_id: user?.id || null,
          referencia_id: novaMedicao?.id || null,
          dados: {
            dataMedicao: data,
            dataAnterior: mes,
            total: r.total,
            quantidade: r.quantidade,
            media: r.media,
          },
        });
      } catch (errHistorico) {
        console.error('Erro ao registrar histórico da medição:', errHistorico);
      }

      setHistorico([novaMedicao, ...historico]);
      setMedicaoSelecionadaId(novaMedicao.id);
      setResultado(r);
      setVersao(v=>v+1);
      alert('Medição de energia salva no Supabase.');
    } catch (err) {
      console.error(err);
      alert('Não foi possível salvar a medição no Supabase. ' + (err?.message || ''));
    } finally {
      setSalvando(false);
    }
  }

  async function excluirMedicao(id){
    if(!confirm('Deseja realmente excluir esta medição?')) return;

    try {
      await excluirMedicaoLocatariosSupabase(id);
    } catch (err) {
      console.error(err);
      alert('Não foi possível excluir a medição do Supabase.');
      return;
    }

    const novoHistorico = historico.filter((m) => m.id !== id);
    setHistorico(novoHistorico);

    if (novoHistorico.length > 0) {
      const ultima = novoHistorico[0];
      const unidades = unidadesDoHistorico(novoHistorico);

      setMedicaoSelecionadaId(ultima.id);
      setMes(ultima?.mes || today());
      setData(ultima?.dataMedicao || today());
      setLinhasTabela(linhasPelaMedicao(ultima, unidades));

      if (ultima?.resumo) {
        setResultado(ultima.resumo);
      } else {
        setResultado(calcularConsumosLocatarios(ultima?.anterior || '', ultima?.atual || ''));
      }
    } else {
      setMedicaoSelecionadaId('');
      setMes(today());
      setData(today());
      setLinhasTabela(criarLinhasTabela(UNIDADES_PADRAO));
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
        Preencha as leituras em uma tabela fixa por unidade. A última medição salva pode virar automaticamente o mês anterior.
      </p>

      <button
        onClick={carregarHistorico}
        className="mt-4 px-4 py-2 rounded-2xl bg-white/10 border border-white/10 text-white text-sm font-semibold"
      >
        Atualizar medições
      </button>
    </div>

    {carregando && (
      <div className="bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl p-4 text-sm">
        Carregando medições salvas no Supabase...
      </div>
    )}

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
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 mb-5">
        <div>
          <h3 className="font-bold text-lg">Planilha fixa de leituras</h3>
          <p className="text-sm text-slate-500 mt-1">
            As unidades ficam fixas. Preencha somente as leituras atuais do mês.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={carregarUltimaComoAnterior}
            className="px-4 py-3 rounded-2xl bg-slate-900 text-white font-semibold text-sm"
          >
            Usar última medição como anterior
          </button>

          <button
            onClick={limparAtuais}
            className="px-4 py-3 rounded-2xl bg-rose-50 text-rose-700 border border-rose-100 font-semibold text-sm"
          >
            Limpar leituras atuais
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
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

      <div className="overflow-x-auto rounded-3xl border border-slate-100">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left px-4 py-3">Unidade</th>
              <th className="text-left px-4 py-3">Leitura anterior</th>
              <th className="text-left px-4 py-3">Leitura atual</th>
              <th className="text-left px-4 py-3">Consumo prévio</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {linhasTabela.map((linha) => {
              const consumoPrevio = calcularConsumosLocatarios(
                linha.anterior ? `${linha.unidade} - ${linha.anterior}` : '',
                linha.atual ? `${linha.unidade} - ${linha.atual}` : ''
              ).linhas?.[0]?.consumo || 0;

              return (
                <tr key={linha.unidade} className="bg-white">
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {linha.unidade}
                  </td>

                  <td className="px-4 py-3">
                    <input
                      value={linha.anterior}
                      onChange={e=>atualizarLinha(linha.unidade, 'anterior', e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 p-2 font-mono"
                      placeholder="Anterior"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      value={linha.atual}
                      onChange={e=>atualizarLinha(linha.unidade, 'atual', e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 p-2 font-mono"
                      placeholder="Atual"
                    />
                  </td>

                  <td className="px-4 py-3 font-semibold text-slate-700">
                    {linha.anterior && linha.atual ? `${int(consumoPrevio)} kWh` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
          disabled={salvando}
          className="px-5 py-3 rounded-2xl bg-teal-600 text-white font-semibold flex gap-2 disabled:opacity-60"
        >
          <Save size={18}/>{salvando ? 'Salvando...' : 'Salvar medição'}
        </button>
      </div>
    </div>

    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
      <h3 className="font-bold text-lg mb-1">Importar leituras por texto</h3>
      <p className="text-sm text-slate-500 mb-5">
        Use esta área quando quiser colar uma lista pronta. O sistema preenche a tabela acima automaticamente.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold">Importar medições anteriores</label>
          <textarea
            value={importacaoAnterior}
            onChange={e=>setImportacaoAnterior(e.target.value)}
            placeholder="Exemplo:&#10;1601 - 16050&#10;1602 - 05599"
            className="mt-2 w-full h-48 rounded-2xl border p-4 font-mono text-sm"
          />

          <button
            onClick={importarAnterior}
            className="mt-3 px-4 py-3 rounded-2xl bg-slate-100 text-slate-700 font-semibold flex gap-2"
          >
            <Upload size={18}/>Importar anteriores
          </button>
        </div>

        <div>
          <label className="text-sm font-semibold">Importar medições atuais</label>
          <textarea
            value={importacaoAtual}
            onChange={e=>setImportacaoAtual(e.target.value)}
            placeholder="Exemplo:&#10;1601 - 24546&#10;1602 - 08143"
            className="mt-2 w-full h-48 rounded-2xl border p-4 font-mono text-sm"
          />

          <button
            onClick={importarAtual}
            className="mt-3 px-4 py-3 rounded-2xl bg-slate-100 text-slate-700 font-semibold flex gap-2"
          >
            <Upload size={18}/>Importar atuais
          </button>
        </div>
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
