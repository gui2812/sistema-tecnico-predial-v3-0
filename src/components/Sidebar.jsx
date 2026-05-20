import {
  AlertTriangle,
  BarChart3,
  Calculator,
  ClipboardList,
  Droplets,
  FileText,
  Fuel,
  History,
  LogOut,
  Mail,
  PackagePlus,
  Users,
  Wrench,
} from 'lucide-react';
import { hasPermission, logout } from '../services/storageService';
import BuildingLogo from './BuildingLogo';

const items = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'pendencias', label: 'Pendências', icon: AlertTriangle },
  { id: 'calculadora', label: 'Calculadora Elétrica', icon: Calculator },
  { id: 'tecnicos', label: 'Cálculos Técnicos', icon: Wrench },
  { id: 'geradores', label: 'Geradores', icon: Fuel },
  { id: 'locatarios', label: 'Energia dos Locatários', icon: ClipboardList },
  { id: 'malote', label: 'Malote', icon: Mail },
  { id: 'rateioAgua', label: 'Rateio de Água', icon: Droplets },
  { id: 'solicitacoes', label: 'Solicitação Material', icon: PackagePlus },
  { id: 'historico', label: 'Histórico', icon: History },
  { id: 'relatorios', label: 'Relatórios PDF', icon: FileText },
  { id: 'usuarios', label: 'Usuários', icon: Users },
];

export default function Sidebar({ page, setPage, user }) {
  const visibleItems = items.filter((item) => hasPermission(user, item.id));

  function sair() {
    logout();
    window.location.reload();
  }

  return (
    <aside className="
      bg-slate-950 text-white
      w-full md:w-72
      md:h-screen md:sticky md:top-0 md:left-0
      p-3 md:p-5
      flex md:flex-col
      gap-3 md:gap-6
      overflow-x-auto md:overflow-hidden
      no-scrollbar
      z-30
    ">
      <div className="hidden md:flex items-center gap-3 shrink-0">
        <div className="w-12 h-12 rounded-2xl bg-teal-500/15 flex items-center justify-center">
          <BuildingLogo size={38} />
        </div>

        <div>
          <h1 className="font-bold leading-tight">
            Sistema Técnico
            <br />
            Predial
          </h1>

          <p className="text-xs text-slate-400 mt-1">Edifício JK 1455</p>
        </div>
      </div>

      <nav className="
        flex md:flex-col
        gap-2
        shrink-0 md:grow
        overflow-x-auto md:overflow-y-auto
        md:overflow-x-hidden
        md:pr-1
        no-scrollbar
        max-w-full
      ">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = page === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium whitespace-nowrap transition shrink-0 ${
                active
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="hidden md:block shrink-0 pt-3 border-t border-white/10">
        <button
          onClick={sair}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-slate-300 hover:bg-white/10"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
}
