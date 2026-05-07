import { Copy, Mail, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import Tabela from '../components/Tabela';
import { gerarMalote } from '../utils/malote';
import { parseBRNumber } from '../utils/formatters';
import { addItem } from '../services/storageService';

const vazio = { fornecedor:'', nf:'', valor:'', centroCusto:'', observacao:'' };
export default function Malote(){
  const [destinatario,setDestinatario]=useState('Amanda');
  const [form,setForm]=useState(vazio);
  const [itens,setItens]=useState([]);
  const email=useMemo(()=>gerarMalote({destinatario,itens}),[destinatario,itens]);
  function add(){ if(!form.fornecedor || !form.nf) return alert('Preencha fornecedor e NF.'); setItens([...itens,{...form,valor:parseBRNumber(form.valor)}]); setForm(vazio); }
  function copiar(txt){ navigator.clipboard?.writeText(txt); alert('Copiado.'); }
  function salvar(){ addItem('malotes',{destinatario,itens,assunto:email.assunto,corpo:email.corpo}); alert('Malote salvo no histórico.'); }
  return <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
    <div className="space-y-6"><div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6"><h3 className="font-bold text-lg mb-4">Novo malote</h3><label className="text-sm font-semibold">Destinatário</label><input value={destinatario} onChange={e=>setDestinatario(e.target.value)} className="mt-1 mb-4 w-full rounded-2xl border p-3"/><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <input placeholder="Fornecedor" value={form.fornecedor} onChange={e=>setForm({...form,fornecedor:e.target.value})} className="rounded-2xl border p-3"/>
      <input placeholder="Número da NF" value={form.nf} onChange={e=>setForm({...form,nf:e.target.value})} className="rounded-2xl border p-3"/>
      <input placeholder="Valor em R$" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} className="rounded-2xl border p-3"/>
      <input placeholder="Centro de custo" value={form.centroCusto} onChange={e=>setForm({...form,centroCusto:e.target.value})} className="rounded-2xl border p-3"/>
      <textarea placeholder="Observação, se necessário" value={form.observacao} onChange={e=>setForm({...form,observacao:e.target.value})} className="md:col-span-2 rounded-2xl border p-3 h-24"/>
    </div><button onClick={add} className="mt-4 px-5 py-3 bg-blue-600 text-white rounded-2xl font-semibold flex gap-2"><Plus size={18}/>Adicionar ao malote</button></div>
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5"><h3 className="font-bold mb-4">Itens adicionados</h3><Tabela columns={[{key:'fornecedor',label:'Fornecedor'},{key:'nf',label:'NF'},{key:'centroCusto',label:'Centro de custo'},{key:'acao',label:'',render:(_,idx)=><button className="text-rose-600" onClick={()=>setItens(itens.filter((_,i)=>i!==idx))}><Trash2 size={16}/></button>}]} rows={itens}/></div></div>
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6"><div className="flex items-center gap-2 mb-4"><Mail className="text-teal-600"/><h3 className="font-bold text-lg">E-mail pronto</h3></div><label className="text-sm font-semibold">Assunto</label><textarea readOnly value={email.assunto} className="mt-2 w-full h-24 rounded-2xl border p-4 text-sm bg-slate-50"/><div className="flex gap-2 mt-2 mb-5"><button onClick={()=>copiar(email.assunto)} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm flex gap-2"><Copy size={15}/>Copiar assunto</button></div><label className="text-sm font-semibold">Corpo do e-mail</label><textarea readOnly value={email.corpo} className="mt-2 w-full h-[420px] rounded-2xl border p-4 text-sm bg-slate-50"/><div className="flex flex-wrap gap-2 mt-3"><button onClick={()=>copiar(email.corpo)} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm flex gap-2"><Copy size={15}/>Copiar corpo</button><button onClick={()=>copiar(`Assunto: ${email.assunto}\n\n${email.corpo}`)} className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm">Copiar tudo</button><button onClick={salvar} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm">Salvar no histórico</button></div></div>
  </div>
}
