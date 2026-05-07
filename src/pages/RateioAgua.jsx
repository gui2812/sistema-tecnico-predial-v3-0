import { Copy, Droplets, FileText, Save, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import CardResumo from '../components/CardResumo';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import Tabela from '../components/Tabela';
import { addItem, getItem } from '../services/storageService';
import { pdfRateioAgua } from '../services/pdfService';
import { brl, num, parseBRNumber, today } from '../utils/formatters';
import { gerarEmailRateioAgua } from '../utils/rateioAgua';

const inicial = {
  destinatario: 'Thayná',
  mesReferencia: 'ABRIL/2026',
  mesTexto: 'ABRIL',
  periodoSabesp: '23/02 a 23/03',
  periodoPoco: '02/03 a 01/04',
  valorPoco1: '5570,00',
  valorPoco2: '1386,50',
  valorSabesp: '55094,60',
  valorTotal: '',
  consumoPoco1: '694,11',
  consumoPoco2: '235',
  consumoSabesp: '674',
  consumoTotal: '',
  data: today(),
  observacao: ''
};

function Input({ label, value, onChange, placeholder, type = 'text' }) {
  return <div>
    <label className="text-sm font-semibold text-slate-700">{label}</label>
    <input type={type} value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-blue-400" />
  </div>
}

export default function RateioAgua(){
  const [form,setForm]=useState(inicial);
  const [versao,setVersao]=useState(0);
  const email = useMemo(()=>gerarEmailRateioAgua(form),[form]);
  const registros = getItem('rateios_agua', []);
  const consumoPoco = parseBRNumber(form.consumoPoco1) + parseBRNumber(form.consumoPoco2);
  const consumoSabesp = parseBRNumber(form.consumoSabesp);
  const consumoTotalVisual = parseBRNumber(form.consumoTotal) || consumoPoco + consumoSabesp;
  const pctPoco = consumoTotalVisual ? (consumoPoco / consumoTotalVisual) * 100 : 0;
  const pctSabesp = consumoTotalVisual ? (consumoSabesp / consumoTotalVisual) * 100 : 0;
  const dadosAgua = [{ name: 'Poço', value: consumoPoco }, { name: 'SABESP', value: consumoSabesp }];

  function setCampo(campo, valor){ setForm((f)=>({...f,[campo]:valor})); }
  function copiar(txt){ navigator.clipboard?.writeText(txt); alert('Copiado.'); }
  function salvar(){
    const registro = addItem('rateios_agua', { ...form, ...email, data: form.data || today() });
    setVersao(v=>v+1);
    alert('Rateio de água salvo no histórico.');
    return registro;
  }
  function salvarPdf(){
    const registro = { ...form, ...email, data: form.data || today() };
    pdfRateioAgua([registro], { texto: form.mesReferencia, dataEmissao: form.data });
  }

  return <div className="space-y-6">
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      <CardResumo titulo="Valor total" valor={brl(email.valorTotal)} icon={Droplets} cor="blue" subtitulo="Poço 1 + Poço 2 + SABESP" />
      <CardResumo titulo="Consumo total" valor={`${num(email.consumoTotal)} m³`} icon={Droplets} cor="teal" subtitulo="Consumo usado na tarifa" />
      <CardResumo titulo="Tarifa calculada" valor={`${brl(email.tarifa)}/m³`} icon={FileText} cor="amber" subtitulo="Valor total ÷ consumo total" />
      <CardResumo titulo="Registros salvos" valor={registros.length} icon={Save} cor="slate" subtitulo="Histórico de rateios" />
    </section>

    <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4"><TrendingUp className="text-teal-600"/><h3 className="font-bold text-lg text-slate-900">Poço x SABESP</h3></div>
        <p className="text-sm text-slate-400 mb-4">Participação no consumo total do rateio atual.</p>
        <div className="h-56"><ResponsiveContainer><PieChart><Pie data={dadosAgua} dataKey="value" outerRadius={78} label>{dadosAgua.map((_,i)=><Cell key={i} fill={['#14b8a6','#2563eb'][i]}/>)}</Pie><Tooltip formatter={(v)=>`${num(v)} m³`} /></PieChart></ResponsiveContainer></div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-teal-50 p-3"><p className="font-bold text-teal-700">Poço</p><p>{num(pctPoco)}%</p><p className="text-xs text-teal-700/70">{num(consumoPoco)} m³</p></div>
          <div className="rounded-2xl bg-blue-50 p-3"><p className="font-bold text-blue-700">SABESP</p><p>{num(pctSabesp)}%</p><p className="text-xs text-blue-700/70">{num(consumoSabesp)} m³</p></div>
        </div>
      </div>
    </section>

    <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><Droplets/></div>
          <div>
            <h3 className="font-bold text-lg text-slate-900">Rateio de Água</h3>
            <p className="text-sm text-slate-500">Preencha os dados mensais e gere o e-mail pronto para envio.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Destinatário" value={form.destinatario} onChange={(v)=>setCampo('destinatario',v)} />
          <Input label="Data do registro/emissão" type="date" value={form.data} onChange={(v)=>setCampo('data',v)} />
          <Input label="Mês de referência" value={form.mesReferencia} onChange={(v)=>setCampo('mesReferencia',v)} placeholder="ABRIL/2026" />
          <Input label="Mês no texto" value={form.mesTexto} onChange={(v)=>setCampo('mesTexto',v)} placeholder="ABRIL" />
          <Input label="Período SABESP" value={form.periodoSabesp} onChange={(v)=>setCampo('periodoSabesp',v)} placeholder="23/02 a 23/03" />
          <Input label="Período poço" value={form.periodoPoco} onChange={(v)=>setCampo('periodoPoco',v)} placeholder="02/03 a 01/04" />
        </div>

        <div>
          <h4 className="font-bold text-slate-800 mb-3">Valores em R$</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Valor Poço 1" value={form.valorPoco1} onChange={(v)=>setCampo('valorPoco1',v)} placeholder="5.570,00" />
            <Input label="Valor Poço 2" value={form.valorPoco2} onChange={(v)=>setCampo('valorPoco2',v)} placeholder="1.386,50" />
            <Input label="Valor SABESP" value={form.valorSabesp} onChange={(v)=>setCampo('valorSabesp',v)} placeholder="55.094,60" />
            <Input label="Valor total, opcional" value={form.valorTotal} onChange={(v)=>setCampo('valorTotal',v)} placeholder="Deixe vazio para somar automático" />
          </div>
        </div>

        <div>
          <h4 className="font-bold text-slate-800 mb-3">Consumos em m³</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Consumo Poço 1" value={form.consumoPoco1} onChange={(v)=>setCampo('consumoPoco1',v)} placeholder="694,11" />
            <Input label="Consumo Poço 2" value={form.consumoPoco2} onChange={(v)=>setCampo('consumoPoco2',v)} placeholder="235" />
            <Input label="Consumo SABESP" value={form.consumoSabesp} onChange={(v)=>setCampo('consumoSabesp',v)} placeholder="674" />
            <Input label="Consumo total, opcional" value={form.consumoTotal} onChange={(v)=>setCampo('consumoTotal',v)} placeholder="Deixe vazio para somar automático" />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700">Observação interna, opcional</label>
          <textarea value={form.observacao} onChange={(e)=>setCampo('observacao',e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 p-3 h-24 outline-none focus:border-blue-400" />
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={salvar} className="px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold flex items-center gap-2"><Save size={18}/>Salvar no histórico</button>
          <button onClick={salvarPdf} className="px-5 py-3 rounded-2xl bg-slate-950 text-white font-semibold flex items-center gap-2"><FileText size={18}/>Gerar PDF</button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-bold text-lg text-slate-900 mb-4">E-mail pronto</h3>
        <label className="text-sm font-semibold text-slate-700">Assunto</label>
        <textarea readOnly value={email.assunto} className="mt-2 w-full h-20 rounded-2xl border border-slate-200 p-4 text-sm bg-slate-50" />
        <div className="flex gap-2 mt-2 mb-5"><button onClick={()=>copiar(email.assunto)} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm flex gap-2"><Copy size={15}/>Copiar assunto</button></div>
        <label className="text-sm font-semibold text-slate-700">Corpo do e-mail</label>
        <textarea readOnly value={email.corpo} className="mt-2 w-full h-[520px] rounded-2xl border border-slate-200 p-4 text-sm bg-slate-50" />
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={()=>copiar(email.corpo)} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm flex gap-2"><Copy size={15}/>Copiar corpo</button>
          <button onClick={()=>copiar(`Assunto: ${email.assunto}\n\n${email.corpo}`)} className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm">Copiar tudo</button>
        </div>
      </div>
    </section>

    <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
      <h3 className="font-bold text-lg text-slate-900 mb-4">Últimos rateios salvos</h3>
      <Tabela columns={[
        {key:'data',label:'Data'},
        {key:'mesReferencia',label:'Mês'},
        {key:'valorTotal',label:'Valor total',render:r=>brl(r.valorTotal)},
        {key:'consumoTotal',label:'Consumo total',render:r=>`${num(r.consumoTotal)} m³`},
        {key:'tarifa',label:'Tarifa',render:r=>`${brl(r.tarifa)}/m³`},
        {key:'acao',label:'PDF',render:r=><button onClick={()=>pdfRateioAgua([r], { texto: r.mesReferencia, dataEmissao: r.data })} className="text-blue-600 font-semibold">Gerar</button>}
      ]} rows={registros.slice(0,8)} />
    </section>
  </div>
}
