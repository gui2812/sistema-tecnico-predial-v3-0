import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import CardResumo from '../components/CardResumo';
import Tabela from '../components/Tabela';
import { addItem, deleteItem, getItem } from '../services/storageService';
import { brl, num, today } from '../utils/formatters';

export default function Geradores(){
  const [registros,setRegistros]=useState(getItem('geradores', []));

  const [form,setForm]=useState({
    gerador:'',
    data:today(),
    horimetroInicial:'',
    horimetroFinal:'',
    litros:'',
    custo:'',
    observacao:''
  });

  const horasTrabalhadas =
    Number(form.horimetroFinal || 0) - Number(form.horimetroInicial || 0);

  const litrosConsumidos = Number(form.litros || 0);
  const custoTotal = Number(form.custo || 0);

  const consumoMedio =
    horasTrabalhadas > 0 ? litrosConsumidos / horasTrabalhadas : 0;

  const calc = {
    horas: horasTrabalhadas > 0 ? horasTrabalhadas : 0,
    litros: litrosConsumidos,
    custo: custoTotal,
    consumoMedio
  };

  function salvar(){
    if(!form.gerador.trim()) return alert('Informe o nome do gerador.');
    if(!form.horimetroInicial) return alert('Informe o horímetro inicial.');
    if(!form.horimetroFinal) return alert('Informe o horímetro final.');
    if(calc.horas <= 0) return alert('O horímetro final precisa ser maior que o inicial.');

    const novo=addItem('geradores',{
      ...form,
      gerador:form.gerador.trim(),
      ...calc
    });

    setRegistros([novo,...registros]);

    setForm({
      ...form,
      horimetroInicial:'',
      horimetroFinal:'',
      litros:'',
      custo:'',
      observacao:''
    });
  }

  function excluir(id){
    deleteItem('geradores',id);
    setRegistros(registros.filter(r=>r.id!==id));
  }

  const totalLitros=registros.reduce((s,r)=>s+Number(r.litros||0),0);
  const totalCusto=registros.reduce((s,r)=>s+Number(r.custo||0),0);
  const totalHoras=registros.reduce((s,r)=>s+Number(r.horas||0),0);

  return <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <CardResumo titulo="Litros registrados" valor={`${num(totalLitros)} L`} cor="teal"/>
      <CardResumo titulo="Horas trabalhadas" valor={`${num(totalHoras)} h`}/>
      <CardResumo titulo="Custo total" valor={brl(totalCusto)} cor="amber"/>
    </div>

    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
      <h3 className="font-bold text-lg mb-1">Novo registro</h3>
      <p className="text-sm text-slate-500 mb-5">
        Digite o nome do gerador manualmente, conforme usado no edifício.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          placeholder="Nome do gerador"
          value={form.gerador}
          onChange={e=>setForm({...form,gerador:e.target.value})}
          className="rounded-2xl border border-slate-200 p-3"
        />

        <input
          type="date"
          value={form.data}
          onChange={e=>setForm({...form,data:e.target.value})}
          className="rounded-2xl border border-slate-200 p-3"
        />

        <input
          placeholder="Horímetro inicial"
          value={form.horimetroInicial}
          onChange={e=>setForm({...form,horimetroInicial:e.target.value})}
          className="rounded-2xl border border-slate-200 p-3"
        />

        <input
          placeholder="Horímetro final"
          value={form.horimetroFinal}
          onChange={e=>setForm({...form,horimetroFinal:e.target.value})}
          className="rounded-2xl border border-slate-200 p-3"
        />

        <input
          placeholder="Litros"
          value={form.litros}
          onChange={e=>setForm({...form,litros:e.target.value})}
          className="rounded-2xl border border-slate-200 p-3"
        />

        <input
          placeholder="Custo R$"
          value={form.custo}
          onChange={e=>setForm({...form,custo:e.target.value})}
          className="rounded-2xl border border-slate-200 p-3"
        />

        <input
          placeholder="Observação"
          value={form.observacao}
          onChange={e=>setForm({...form,observacao:e.target.value})}
          className="rounded-2xl border border-slate-200 p-3 md:col-span-2"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
        <CardResumo titulo="Horas trabalhadas" valor={`${num(calc.horas)} h`}/>
        <CardResumo titulo="Litros" valor={`${num(calc.litros)} L`} cor="teal"/>
        <CardResumo titulo="Custo" valor={brl(calc.custo)} cor="amber"/>
        <CardResumo titulo="Consumo médio" valor={`${num(calc.consumoMedio)} L/h`} cor="teal"/>
      </div>

      <button
        onClick={salvar}
        className="mt-5 px-5 py-3 rounded-2xl bg-blue-600 text-white font-semibold flex gap-2"
      >
        <Plus size={18}/>Salvar registro
      </button>
    </div>

    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
      <h3 className="font-bold mb-4">Histórico de registros</h3>

      <Tabela
        columns={[
          {key:'data',label:'Data'},
          {key:'gerador',label:'Gerador'},
          {key:'horimetroInicial',label:'Horímetro inicial'},
          {key:'horimetroFinal',label:'Horímetro final'},
          {key:'horas',label:'Horas trabalhadas',render:r=>num(r.horas)},
          {key:'litros',label:'Litros',render:r=>num(r.litros)},
          {key:'custo',label:'Custo',render:r=>brl(r.custo)},
          {key:'acao',label:'',render:r=>
            <button onClick={()=>excluir(r.id)} className="text-rose-600">
              <Trash2 size={16}/>
            </button>
          }
        ]}
        rows={registros}
      />
    </div>
  </div>
}
