import { Copy, Mail, Plus, Trash2, Calculator, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import Tabela from '../components/Tabela';
import { gerarMalote } from '../utils/malote';
import { brl, parseBRNumber } from '../utils/formatters';
import { addItem } from '../services/storageService';

const vazio = {
  fornecedor:'',
  nf:'',
  valor:'',
  centroCusto:'',
  observacao:''
};

export default function Malote(){
  const [destinatario,setDestinatario]=useState('Amanda');
  const [emailDestinatario,setEmailDestinatario]=useState('');
  const [emailCopia,setEmailCopia]=useState('');
  const [form,setForm]=useState(vazio);
  const [itens,setItens]=useState([]);

  const [pagamentoParcial,setPagamentoParcial]=useState({
    valorTotal:'',
    valorPago:'',
    transferencia:false
  });

  const valorTotalParcial = parseBRNumber(pagamentoParcial.valorTotal);
  const valorPagoParcial = parseBRNumber(pagamentoParcial.valorPago);

  const percentualPago =
    valorTotalParcial > 0 ? (valorPagoParcial / valorTotalParcial) * 100 : 0;

  const saldoRestante =
    valorTotalParcial > 0 ? valorTotalParcial - valorPagoParcial : 0;

  const percentualRestante =
    valorTotalParcial > 0 ? 100 - percentualPago : 0;

  const email=useMemo(()=>gerarMalote({destinatario,itens}),[destinatario,itens]);

  function add(){
    if(!form.fornecedor || !form.nf) return alert('Preencha fornecedor e NF.');

    setItens([
      ...itens,
      {
        ...form,
        valor:parseBRNumber(form.valor)
      }
    ]);

    setForm(vazio);
  }

  function copiar(txt){
    navigator.clipboard?.writeText(txt);
    alert('Copiado.');
  }

  function salvar(){
    addItem('malotes',{
      destinatario,
      emailDestinatario,
      emailCopia,
      itens,
      assunto:email.assunto,
      corpo:email.corpo
    });

    alert('Malote salvo no histórico.');
  }

  function abrirEmailParaEnvio(){
    if(!emailDestinatario.trim()){
      alert('Informe o e-mail do destinatário.');
      return;
    }

    if(!itens.length){
      alert('Adicione pelo menos um item ao malote antes de abrir o e-mail.');
      return;
    }

    const para = emailDestinatario.trim().replaceAll(',', ';');
    const cc = emailCopia.trim().replaceAll(',', ';');

    const assunto = encodeURIComponent(email.assunto);
    const corpo = encodeURIComponent(email.corpo);

    const ccParam = cc ? `&cc=${encodeURIComponent(cc)}` : '';

    window.location.href = `mailto:${para}?subject=${assunto}&body=${corpo}${ccParam}`;
  }

  function gerarObservacaoAutomatica(){
    const partes = [];

    if (pagamentoParcial.transferencia) {
      partes.push('Pagamento via transferência.');
    }

    if (valorTotalParcial > 0 && valorPagoParcial > 0) {
      partes.push(
        `Pagamento parcial referente a ${percentualPago.toFixed(2).replace('.', ',')}% do valor total de ${brl(valorTotalParcial)}. Valor pago neste malote: ${brl(valorPagoParcial)}. Saldo restante: ${brl(saldoRestante)} (${percentualRestante.toFixed(2).replace('.', ',')}%).`
      );
    }

    if (!partes.length) {
      alert('Informe os dados do pagamento parcial ou marque pagamento via transferência.');
      return;
    }

    const observacaoAutomatica = partes.join(' ');

    setForm({
      ...form,
      observacao: form.observacao
        ? `${form.observacao}\n${observacaoAutomatica}`
        : observacaoAutomatica
    });
  }

  return <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-bold text-lg mb-4">Novo malote</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-semibold">Destinatário do texto</label>
            <input
              value={destinatario}
              onChange={e=>setDestinatario(e.target.value)}
              className="mt-1 w-full rounded-2xl border p-3"
              placeholder="Ex: Amanda"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">E-mail para envio</label>
            <input
              value={emailDestinatario}
              onChange={e=>setEmailDestinatario(e.target.value)}
              className="mt-1 w-full rounded-2xl border p-3"
              placeholder="amanda@empresa.com; financeiro@empresa.com"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-semibold">E-mails em cópia / CC</label>
            <input
              value={emailCopia}
              onChange={e=>setEmailCopia(e.target.value)}
              className="mt-1 w-full rounded-2xl border p-3"
              placeholder="gestor@empresa.com; controladoria@empresa.com"
            />
            <p className="text-xs text-slate-400 mt-1">
              Para mais de um e-mail, separe por ponto e vírgula.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            placeholder="Fornecedor"
            value={form.fornecedor}
            onChange={e=>setForm({...form,fornecedor:e.target.value})}
            className="rounded-2xl border p-3"
          />

          <input
            placeholder="Número da NF"
            value={form.nf}
            onChange={e=>setForm({...form,nf:e.target.value})}
            className="rounded-2xl border p-3"
          />

          <input
            placeholder="Valor em R$"
            value={form.valor}
            onChange={e=>setForm({...form,valor:e.target.value})}
            className="rounded-2xl border p-3"
          />

          <input
            placeholder="Centro de custo"
            value={form.centroCusto}
            onChange={e=>setForm({...form,centroCusto:e.target.value})}
            className="rounded-2xl border p-3"
          />

          <textarea
            placeholder="Observação, se necessário"
            value={form.observacao}
            onChange={e=>setForm({...form,observacao:e.target.value})}
            className="md:col-span-2 rounded-2xl border p-3 h-24"
          />
        </div>

        <button
          onClick={add}
          className="mt-4 px-5 py-3 bg-blue-600 text-white rounded-2xl font-semibold flex gap-2"
        >
          <Plus size={18}/>Adicionar ao malote
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="text-blue-600"/>
          <h3 className="font-bold text-lg">Pagamento parcial / transferência</h3>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          Use quando o malote for pagamento parcial ou pagamento via transferência.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            placeholder="Valor total"
            value={pagamentoParcial.valorTotal}
            onChange={e=>setPagamentoParcial({...pagamentoParcial,valorTotal:e.target.value})}
            className="rounded-2xl border p-3"
          />

          <input
            placeholder="Valor pago neste malote"
            value={pagamentoParcial.valorPago}
            onChange={e=>setPagamentoParcial({...pagamentoParcial,valorPago:e.target.value})}
            className="rounded-2xl border p-3"
          />
        </div>

        <label className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 p-3 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={pagamentoParcial.transferencia}
            onChange={e=>setPagamentoParcial({...pagamentoParcial,transferencia:e.target.checked})}
            className="w-4 h-4"
          />
          Pagamento via transferência
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-sm">
          <div className="rounded-2xl bg-blue-50 p-3">
            <p className="font-bold text-blue-700">Percentual pago</p>
            <p>{percentualPago ? `${percentualPago.toFixed(2).replace('.', ',')}%` : '-'}</p>
          </div>

          <div className="rounded-2xl bg-teal-50 p-3">
            <p className="font-bold text-teal-700">Saldo restante</p>
            <p>{valorTotalParcial ? brl(saldoRestante) : '-'}</p>
          </div>

          <div className="rounded-2xl bg-amber-50 p-3">
            <p className="font-bold text-amber-700">Percentual restante</p>
            <p>{percentualRestante ? `${percentualRestante.toFixed(2).replace('.', ',')}%` : '-'}</p>
          </div>
        </div>

        <button
          onClick={gerarObservacaoAutomatica}
          className="mt-4 px-5 py-3 rounded-2xl bg-slate-950 text-white font-semibold"
        >
          Adicionar observação automática
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
        <h3 className="font-bold mb-4">Itens adicionados</h3>

        <Tabela
          columns={[
            {key:'fornecedor',label:'Fornecedor'},
            {key:'nf',label:'NF'},
            {key:'centroCusto',label:'Centro de custo'},
            {
              key:'acao',
              label:'',
              render:(_,idx)=>
                <button
                  className="text-rose-600"
                  onClick={()=>setItens(itens.filter((_,i)=>i!==idx))}
                >
                  <Trash2 size={16}/>
                </button>
            }
          ]}
          rows={itens}
        />
      </div>
    </div>

    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="text-teal-600"/>
        <h3 className="font-bold text-lg">E-mail pronto</h3>
      </div>

      <label className="text-sm font-semibold">Assunto</label>

      <textarea
        readOnly
        value={email.assunto}
        className="mt-2 w-full h-24 rounded-2xl border p-4 text-sm bg-slate-50"
      />

      <div className="flex gap-2 mt-2 mb-5">
        <button
          onClick={()=>copiar(email.assunto)}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm flex gap-2"
        >
          <Copy size={15}/>Copiar assunto
        </button>
      </div>

      <label className="text-sm font-semibold">Corpo do e-mail</label>

      <textarea
        readOnly
        value={email.corpo}
        className="mt-2 w-full h-[420px] rounded-2xl border p-4 text-sm bg-slate-50"
      />

      <div className="flex flex-wrap gap-2 mt-3">
        <button
          onClick={()=>copiar(email.corpo)}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm flex gap-2"
        >
          <Copy size={15}/>Copiar corpo
        </button>

        <button
          onClick={()=>copiar(`Assunto: ${email.assunto}\n\n${email.corpo}`)}
          className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm"
        >
          Copiar tudo
        </button>

        <button
          onClick={salvar}
          className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm"
        >
          Salvar no histórico
        </button>

        <button
          onClick={abrirEmailParaEnvio}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm flex gap-2"
        >
          <Send size={15}/>
          Abrir e-mail para envio
        </button>
      </div>
    </div>
  </div>
}
