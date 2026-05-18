import {
  Bell,
  CalendarDays,
  CheckCheck,
  LogOut,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  getNotifications,
  logout,
  markAllNotificationsRead,
} from '../services/storageService';

const titles = {
  dashboard: 'Dashboard',
  pendencias: 'Pendências',
  calculadora: 'Calculadora Elétrica',
  tecnicos: 'Cálculos Técnicos',
  geradores: 'Controle de Geradores',
  locatarios: 'Medição de Energia dos Locatários',
  malote: 'Malote',
  rateioAgua: 'Rateio de Água',
  solicitacoes: 'Solicitação de Material',
  historico: 'Histórico',
  relatorios: 'Relatórios PDF',
  usuarios: 'Usuários e Permissões',
};

function formatarData(data) {
  if (!data) return '';

  try {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return data;
  }
}

function obterTipoNotificacao(n) {
  const texto = `${n?.titulo || ''} ${n?.mensagem || ''}`.toLowerCase();

  if (texto.includes('reprov')) return 'Reprovado';
  if (texto.includes('aprov')) return 'Aprovado';
  if (texto.includes('entreg')) return 'Entregue';
  if (texto.includes('malote')) return 'Malote';
  if (texto.includes('energia') || texto.includes('medição')) return 'Energia';
  if (texto.includes('água') || texto.includes('agua') || texto.includes('rateio')) return 'Água';
  if (texto.includes('diesel') || texto.includes('gerador')) return 'Gerador';

  return 'Sistema';
}

function corTipo(tipo) {
  const cores = {
    Aprovado: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    Reprovado: 'bg-rose-50 text-rose-700 border-rose-100',
    Entregue: 'bg-teal-50 text-teal-700 border-teal-100',
    Malote: 'bg-amber-50 text-amber-700 border-amber-100',
    Energia: 'bg-blue-50 text-blue-700 border-blue-100',
    Água: 'bg-purple-50 text-purple-700 border-purple-100',
    Gerador: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    Sistema: 'bg-slate-50 text-slate-600 border-slate-100',
  };

  return cores[tipo] || cores.Sistema;
}

export default function Header({ page, user }) {
  const [aberto, setAberto] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const notificacoes = useMemo(() => {
    return getNotifications(user).slice(0, 30);
  }, [user, refresh, page, aberto]);

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  function sair() {
    logout();
    window.location.reload();
  }

  function marcarLidas() {
    markAllNotificationsRead(user);
    setRefresh((v) => v + 1);
  }

  return (
    <header className="bg-white border-b border-slate-100 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-20">
      <div className="min-w-0">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 truncate">
          {titles[page] || 'Sistema'}
        </h2>

        <p className="text-xs md:text-sm text-slate-400 truncate">
          Edifício JK 1455 • {user?.nome}
        </p>
      </div>

      <div className="flex items-center gap-2 md:gap-3 relative">
        <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-100 text-slate-600 text-sm">
          <CalendarDays size={16} />
          {new Date().toLocaleDateString('pt-BR', {
            month: 'long',
            year: 'numeric',
          })}
        </div>

        <button
          onClick={() => setAberto(!aberto)}
          className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition ${
            aberto
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
          title="Notificações"
        >
          <Bell size={18} />

          {naoLidas > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          )}
        </button>

        {aberto && (
          <div className="absolute right-0 top-14 w-[420px] max-w-[calc(100vw-24px)] bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
            <div className="bg-gradient-to-br from-slate-950 to-blue-950 text-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-lg">Central de notificações</h3>
                  <p className="text-xs text-blue-100 mt-1">
                    {naoLidas > 0
                      ? `${naoLidas} notificação(ões) não lida(s)`
                      : 'Tudo lido no momento'}
                  </p>
                </div>

                <button
                  onClick={() => setAberto(false)}
                  className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20"
                  title="Fechar"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={marcarLidas}
                  className="px-3 py-2 rounded-2xl bg-white/10 border border-white/10 text-white text-xs font-bold flex items-center gap-2 hover:bg-white/20"
                >
                  <CheckCheck size={14} />
                  Marcar todas como lidas
                </button>

                <span className="px-3 py-2 rounded-2xl bg-white/10 border border-white/10 text-white text-xs font-bold">
                  {notificacoes.length} recentes
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50">
              <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
                {notificacoes.length === 0 && (
                  <div className="bg-white rounded-3xl border border-slate-100 p-8 text-center">
                    <Bell className="mx-auto text-slate-300 mb-3" size={30} />
                    <p className="text-sm text-slate-400">
                      Nenhuma notificação por enquanto.
                    </p>
                  </div>
                )}

                {notificacoes.map((n) => {
                  const tipo = obterTipoNotificacao(n);

                  return (
                    <div
                      key={n.id}
                      className={`rounded-3xl border p-4 transition ${
                        n.lida
                          ? 'bg-white border-slate-100'
                          : 'bg-blue-50 border-blue-100 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span
                          className={`px-3 py-1 rounded-full border text-[11px] font-black ${corTipo(tipo)}`}
                        >
                          {tipo}
                        </span>

                        {!n.lida && (
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 mt-2 shrink-0" />
                        )}
                      </div>

                      {n.titulo && (
                        <p className="text-sm font-black text-slate-900 mb-1 break-words">
                          {n.titulo}
                        </p>
                      )}

                      <p className="text-sm font-semibold text-slate-700 whitespace-pre-line break-words">
                        {n.mensagem}
                      </p>

                      <div className="flex items-center justify-between gap-3 mt-3">
                        <p className="text-xs text-slate-400">
                          {formatarData(n.criadoEm)}
                        </p>

                        <p className="text-[11px] text-slate-400">
                          {n.lida ? 'Lida' : 'Não lida'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {notificacoes.length > 0 && (
                <div className="mt-3 rounded-2xl bg-white border border-slate-100 p-3 text-xs text-slate-400 flex items-center gap-2">
                  <Trash2 size={14} />
                  Para limpar notificações antigas, podemos adicionar um botão de limpeza no próximo ajuste.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="w-10 h-10 rounded-2xl bg-teal-500 text-white font-bold flex items-center justify-center">
          STP
        </div>

        <button
          onClick={sair}
          className="md:hidden p-3 rounded-2xl bg-slate-900 text-white"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
