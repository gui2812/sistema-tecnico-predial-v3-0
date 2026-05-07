import { Bell, CalendarDays, LogOut } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getNotifications, logout, markAllNotificationsRead } from '../services/storageService';

const titles = { dashboard:'Dashboard', calculadora:'Calculadora Elétrica', tecnicos:'Cálculos Técnicos', geradores:'Controle de Geradores', locatarios:'Medição de Energia dos Locatários', malote:'Malote', rateioAgua:'Rateio de Água', solicitacoes:'Solicitação de Material', historico:'Histórico', relatorios:'Relatórios PDF', usuarios:'Usuários e Permissões' };

function formatarData(data) {
  if (!data) return '';
  try { return new Date(data).toLocaleString('pt-BR'); } catch { return data; }
}

export default function Header({ page, user }) {
  const [aberto, setAberto] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const notificacoes = useMemo(() => getNotifications(user).slice(0, 20), [user, refresh, page, aberto]);
  const naoLidas = notificacoes.filter(n => !n.lida).length;
  function sair(){ logout(); window.location.reload(); }
  function marcarLidas(){ markAllNotificationsRead(user); setRefresh(v => v + 1); }

  return <header className="bg-white border-b border-slate-100 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-20">
    <div><h2 className="text-xl md:text-2xl font-bold text-slate-900">{titles[page] || 'Sistema'}</h2><p className="text-xs md:text-sm text-slate-400">Edifício JK 1455 • {user?.nome}</p></div>
    <div className="flex items-center gap-2 md:gap-3 relative">
      <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-100 text-slate-600 text-sm"><CalendarDays size={16}/>{new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</div>

      <button onClick={() => setAberto(!aberto)} className="relative w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200 transition" title="Notificações">
        <Bell size={18}/>
        {naoLidas > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">{naoLidas}</span>}
      </button>

      {aberto && <div className="absolute right-0 top-14 w-[340px] max-w-[calc(100vw-24px)] bg-white rounded-3xl shadow-xl border border-slate-100 p-4 z-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-900">Notificações</h3>
          <button onClick={marcarLidas} className="text-xs font-bold text-blue-600 hover:text-blue-800">Marcar como lidas</button>
        </div>
        <div className="space-y-2 max-h-96 overflow-auto pr-1">
          {notificacoes.length === 0 && <p className="text-sm text-slate-400 text-center py-8">Nenhuma notificação.</p>}
          {notificacoes.map(n => <div key={n.id} className={`rounded-2xl border p-3 ${n.lida ? 'bg-slate-50 border-slate-100' : 'bg-blue-50 border-blue-100'}`}>
            <p className="text-sm font-semibold text-slate-800 whitespace-pre-line">{n.mensagem}</p>
            <p className="text-xs text-slate-400 mt-2">{formatarData(n.criadoEm)}</p>
          </div>)}
        </div>
      </div>}

      <div className="w-10 h-10 rounded-2xl bg-teal-500 text-white font-bold flex items-center justify-center">STP</div>
      <button onClick={sair} className="md:hidden p-3 rounded-2xl bg-slate-900 text-white"><LogOut size={18}/></button>
    </div>
  </header>
}
