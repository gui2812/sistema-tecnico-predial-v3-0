import { Calculator, Cpu, Gauge, Lightbulb, RotateCcw, Save, Trash2, Zap } from 'lucide-react';
import { useState } from 'react';
import CardResumo from '../components/CardResumo';
import Tabela from '../components/Tabela';
import { addItem, getItem, clearKey } from '../services/storageService';
import { pdfCalculosEletricos } from '../services/pdfService';
import { calcularFatorPotencia, calcularMotor, calcularOhm, calcularPotencia, calcularQuedaTensao } from '../utils/calculosEletricos';
import { num, today } from '../utils/formatters';

const inputClass = 'mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500';

function Field({ label, value, onChange, placeholder, type='text' }) {
  return <div>
    <label className="text-sm font-medium text-slate-700">{label}</label>
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className={inputClass}/>
  </div>
}

function SelectField({ label, value, onChange, children }) {
  return <div>
    <label className="text-sm font-medium text-slate-700">{label}</label>
    <select value={value} onChange={e=>onChange(e.target.value)} className={inputClass}>{children}</select>
  </div>
}

function Section({ title, desc, icon: Icon, children, color='blue' }) {
  const classes = color === 'teal' ? 'bg-teal-50 text-teal-600' : color === 'amber' ? 'bg-amber-50 text-amber-600' : color === 'purple' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600';
  return <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
    <div className="flex items-start gap-3 mb-5">
      <div className={`w-12 h-12 rounded-2xl ${classes} flex items-center justify-center`}><Icon/></div>
      <div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{desc}</p>
      </div>
    </div>
    {children}
  </section>
}

function ResultBox({ children }) {
  return <div className="mt-5 rounded-3xl bg-blue-50 border border-blue-100 p-5 text-blue-950">{children}</div>
}

export default function CalculadoraEletrica() {
  const [ohm, setOhm] = useState({ tensao:'', corrente:'', resistencia:'' });
  const [resOhm, setResOhm] = useState(null);

  const [pot, setPot] = useState({ sistema:'monofasico', tensao:'220', corrente:'10', fatorPotencia:'0,92' });
  const [resPot, setResPot] = useState(null);

  const [fpForm, setFpForm] = useState({ potenciaAtivaKW:'', potenciaAparenteKVA:'' });
  const [resFp, setResFp] = useState(null);

  const [motor, setMotor] = useState({ frequencia:'60', polos:'4', potenciaEntrada:'', potenciaSaida:'' });
  const [resMotor, setResMotor] = useState(null);

  const [queda, setQueda] = useState({ tensao:'220', corrente:'', distancia:'', secao:'', material:'cobre', sistema:'monofasico' });
  const [resQueda, setResQueda] = useState(null);

  const [hist, setHist] = useState(getItem('calculos', []));

  function salvarCalculo(tipo, entrada, resultado) {
    if (!resultado) return;
    const novo = addItem('calculos', { tipoCalculo: tipo, data: today(), entrada, resultado });
    setHist([novo, ...hist]);
  }

  function salvarEGerarPdf(tipo, entrada, resultado) {
    if (!resultado) return;
    salvarCalculo(tipo, entrada, resultado);
    pdfCalculosEletricos([{ tipoCalculo: tipo, data: today(), entrada, resultado }], { texto: tipo, dataEmissao: today() });
  }

  const historicoColumns = [
    { key:'data', label:'Data', render:r=>r.data || (r.criadoEm ? new Date(r.criadoEm).toLocaleDateString('pt-BR') : '') },
    { key:'tipo', label:'Tipo', render:r=>r.tipoCalculo || r.resultado?.tipo },
    { key:'resultado', label:'Resultado', render:r=>{
      if (r.tipoCalculo === 'Potência Elétrica') return `${num(r.resultado?.potenciaKW)} kW`;
      if (r.tipoCalculo === 'Fator de Potência') return `${num(r.resultado?.fp,3)}`;
      if (r.tipoCalculo === 'Motores') return `${num(r.resultado?.rpm,0)} RPM / ${num(r.resultado?.rendimento)}%`;
      if (r.tipoCalculo === 'Queda de Tensão') return `${num(r.resultado?.quedaV)} V (${num(r.resultado?.quedaPercentual)}%)`;
      return `${num(r.resultado?.valor)} ${r.resultado?.unidade || ''}`;
    }}
  ];

  return <div className="space-y-6">
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        <Section title="Lei de Ohm" desc="Preencha dois campos e deixe o terceiro em branco para calcular automaticamente." icon={Calculator}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Tensão (V)" value={ohm.tensao} onChange={v=>setOhm({...ohm,tensao:v})} placeholder="Ex: 220" />
            <Field label="Corrente (A)" value={ohm.corrente} onChange={v=>setOhm({...ohm,corrente:v})} placeholder="Ex: 10" />
            <Field label="Resistência (Ω)" value={ohm.resistencia} onChange={v=>setOhm({...ohm,resistencia:v})} placeholder="Ex: 22" />
          </div>
          <div className="flex flex-wrap gap-3 mt-6">
            <button onClick={()=>{ const r=calcularOhm(ohm); setResOhm(r); salvarCalculo('Lei de Ohm', ohm, r); }} className="px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold flex gap-2"><Calculator size={18}/>Calcular e salvar</button>
            <button onClick={()=>{setOhm({tensao:'',corrente:'',resistencia:''});setResOhm(null)}} className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-700 font-semibold">Limpar</button>
            <button disabled={!resOhm} onClick={()=>salvarEGerarPdf('Lei de Ohm', ohm, resOhm)} className="px-5 py-3 rounded-2xl bg-slate-950 text-white font-semibold disabled:opacity-40">PDF</button>
          </div>
          {resOhm && <ResultBox><p className="text-sm text-blue-700">Resultado calculado</p><h2 className="text-3xl font-bold mt-1">{num(resOhm.valor)} {resOhm.unidade}</h2><p className="text-sm text-blue-700 mt-2">{resOhm.formula}</p></ResultBox>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6"><CardResumo titulo="Tensão" valor="V = R × I" icon={Save}/><CardResumo titulo="Corrente" valor="I = V ÷ R" icon={Save} cor="teal"/><CardResumo titulo="Resistência" valor="R = V ÷ I" icon={Save} cor="purple"/></div>
        </Section>

        <Section title="Potência Elétrica" desc="Calcula potência ativa, aparente e reativa em sistemas CC, monofásicos e trifásicos." icon={Zap} color="teal">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SelectField label="Tipo de sistema" value={pot.sistema} onChange={v=>setPot({...pot,sistema:v})}><option value="cc">CC</option><option value="monofasico">Monofásico</option><option value="trifasico">Trifásico</option></SelectField>
            <Field label="Tensão (V)" value={pot.tensao} onChange={v=>setPot({...pot,tensao:v})} placeholder="Ex: 220" />
            <Field label="Corrente (A)" value={pot.corrente} onChange={v=>setPot({...pot,corrente:v})} placeholder="Ex: 10" />
            <Field label="Fator de potência" value={pot.fatorPotencia} onChange={v=>setPot({...pot,fatorPotencia:v})} placeholder="Ex: 0,92" />
          </div>
          <div className="flex flex-wrap gap-3 mt-6"><button onClick={()=>{ const r=calcularPotencia(pot); setResPot(r); salvarCalculo('Potência Elétrica', pot, r); }} className="px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold">Calcular e salvar</button><button onClick={()=>{setPot({ sistema:'monofasico', tensao:'220', corrente:'10', fatorPotencia:'0,92' });setResPot(null)}} className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-700 font-semibold">Limpar</button><button disabled={!resPot} onClick={()=>salvarEGerarPdf('Potência Elétrica', pot, resPot)} className="px-5 py-3 rounded-2xl bg-slate-950 text-white font-semibold disabled:opacity-40">PDF</button></div>
          {resPot && <ResultBox><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><div><p className="text-xs text-blue-700">Potência ativa</p><h4 className="text-xl font-bold">{num(resPot.potenciaKW)} kW</h4></div><div><p className="text-xs text-blue-700">Potência aparente</p><h4 className="text-xl font-bold">{num(resPot.aparenteKVA)} kVA</h4></div><div><p className="text-xs text-blue-700">Potência reativa</p><h4 className="text-xl font-bold">{num(resPot.reativaKVAr)} kVAr</h4></div><div><p className="text-xs text-blue-700">Fórmula</p><h4 className="text-sm font-bold">{resPot.formula}</h4></div></div></ResultBox>}
        </Section>

        <Section title="Fator de Potência" desc="Calcula FP por kW e kVA e alerta quando estiver abaixo de 0,92." icon={Gauge} color="amber">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Potência ativa (kW)" value={fpForm.potenciaAtivaKW} onChange={v=>setFpForm({...fpForm,potenciaAtivaKW:v})} placeholder="Ex: 50"/><Field label="Potência aparente (kVA)" value={fpForm.potenciaAparenteKVA} onChange={v=>setFpForm({...fpForm,potenciaAparenteKVA:v})} placeholder="Ex: 55"/></div>
          <div className="flex flex-wrap gap-3 mt-6"><button onClick={()=>{ const r=calcularFatorPotencia(fpForm); setResFp(r); salvarCalculo('Fator de Potência', fpForm, r); }} className="px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold">Calcular e salvar</button><button onClick={()=>{setFpForm({potenciaAtivaKW:'',potenciaAparenteKVA:''});setResFp(null)}} className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-700 font-semibold">Limpar</button><button disabled={!resFp} onClick={()=>salvarEGerarPdf('Fator de Potência', fpForm, resFp)} className="px-5 py-3 rounded-2xl bg-slate-950 text-white font-semibold disabled:opacity-40">PDF</button></div>
          {resFp && <ResultBox><h2 className="text-3xl font-bold">FP {num(resFp.fp,3)}</h2><p className="text-sm mt-2">{resFp.alerta}</p><p className="text-xs text-blue-700 mt-2">{resFp.formula}</p></ResultBox>}
        </Section>

        <Section title="Motores" desc="Calcula velocidade síncrona e rendimento estimado do motor." icon={Cpu} color="purple">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4"><Field label="Frequência (Hz)" value={motor.frequencia} onChange={v=>setMotor({...motor,frequencia:v})} placeholder="Ex: 60"/><Field label="Número de polos" value={motor.polos} onChange={v=>setMotor({...motor,polos:v})} placeholder="Ex: 4"/><Field label="Potência entrada" value={motor.potenciaEntrada} onChange={v=>setMotor({...motor,potenciaEntrada:v})} placeholder="Ex: 10"/><Field label="Potência saída" value={motor.potenciaSaida} onChange={v=>setMotor({...motor,potenciaSaida:v})} placeholder="Ex: 8,8"/></div>
          <div className="flex flex-wrap gap-3 mt-6"><button onClick={()=>{ const r=calcularMotor(motor); setResMotor(r); salvarCalculo('Motores', motor, r); }} className="px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold">Calcular e salvar</button><button onClick={()=>{setMotor({ frequencia:'60', polos:'4', potenciaEntrada:'', potenciaSaida:'' });setResMotor(null)}} className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-700 font-semibold">Limpar</button><button disabled={!resMotor} onClick={()=>salvarEGerarPdf('Motores', motor, resMotor)} className="px-5 py-3 rounded-2xl bg-slate-950 text-white font-semibold disabled:opacity-40">PDF</button></div>
          {resMotor && <ResultBox><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><p className="text-xs text-blue-700">Velocidade síncrona</p><h4 className="text-2xl font-bold">{num(resMotor.rpm,0)} RPM</h4></div><div><p className="text-xs text-blue-700">Rendimento</p><h4 className="text-2xl font-bold">{num(resMotor.rendimento)}%</h4></div></div></ResultBox>}
        </Section>

        <Section title="Queda de Tensão Simples" desc="Estimativa rápida de queda de tensão. Use como apoio; sempre validar projeto/norma antes de executar." icon={Lightbulb}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><SelectField label="Sistema" value={queda.sistema} onChange={v=>setQueda({...queda,sistema:v})}><option value="monofasico">Monofásico</option><option value="trifasico">Trifásico</option></SelectField><SelectField label="Material" value={queda.material} onChange={v=>setQueda({...queda,material:v})}><option value="cobre">Cobre</option><option value="aluminio">Alumínio</option></SelectField><Field label="Tensão (V)" value={queda.tensao} onChange={v=>setQueda({...queda,tensao:v})} placeholder="Ex: 220"/><Field label="Corrente (A)" value={queda.corrente} onChange={v=>setQueda({...queda,corrente:v})} placeholder="Ex: 20"/><Field label="Distância (m)" value={queda.distancia} onChange={v=>setQueda({...queda,distancia:v})} placeholder="Ex: 30"/><Field label="Seção do cabo (mm²)" value={queda.secao} onChange={v=>setQueda({...queda,secao:v})} placeholder="Ex: 6"/></div>
          <div className="flex flex-wrap gap-3 mt-6"><button onClick={()=>{ const r=calcularQuedaTensao(queda); setResQueda(r); salvarCalculo('Queda de Tensão', queda, r); }} className="px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold">Calcular e salvar</button><button onClick={()=>{setQueda({ tensao:'220', corrente:'', distancia:'', secao:'', material:'cobre', sistema:'monofasico' });setResQueda(null)}} className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-700 font-semibold">Limpar</button><button disabled={!resQueda} onClick={()=>salvarEGerarPdf('Queda de Tensão', queda, resQueda)} className="px-5 py-3 rounded-2xl bg-slate-950 text-white font-semibold disabled:opacity-40">PDF</button></div>
          {resQueda && <ResultBox><h2 className="text-3xl font-bold">{num(resQueda.quedaV)} V</h2><p className="text-sm mt-1">Queda percentual: <strong>{num(resQueda.quedaPercentual)}%</strong></p><p className="text-sm mt-2">{resQueda.alerta}</p><p className="text-xs text-blue-700 mt-2">{resQueda.formula}</p></ResultBox>}
        </Section>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 h-fit sticky top-6">
        <div className="flex justify-between items-center mb-4"><h3 className="font-bold">Últimos cálculos</h3><button onClick={()=>{clearKey('calculos');setHist([])}} className="text-rose-600"><Trash2 size={18}/></button></div>
        <Tabela columns={historicoColumns} rows={hist.slice(0,12)}/>
        <button onClick={()=>pdfCalculosEletricos(hist, { texto:'Histórico de cálculos elétricos', dataEmissao: today() })} className="mt-5 w-full rounded-2xl bg-slate-950 text-white py-3 font-semibold flex items-center justify-center gap-2"><RotateCcw size={18}/>PDF do histórico</button>
      </div>
    </div>
  </div>
}
