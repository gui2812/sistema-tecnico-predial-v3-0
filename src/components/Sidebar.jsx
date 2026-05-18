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
  Wrench
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

function podeVerItem(user, itemId) {
  if (itemId === 'pendencias') {
    return (
      hasPermission(user, 'dashboard') ||
      user?.perfil === 'admin' ||
      user?.perfil === 'administrador'
    );
  }

  return hasPermission(user, itemId);
}

export default function Sidebar({ page, setPage, user }) {
  const visibleItems = items.filter((item) => podeVerItem(user, item.id));

  function sair(){
    logout();
    window.location.reload();
  }

  return (
    <aside className="bg-slate-950 text-white w-full md:w-72 md:min-h-screen p-4 md:p-5 flex md:flex-col gap-4 md:gap-6 overflow-x-auto no-scrollbar">
      <div className="hidden md:flex items-center gap-3 shrink-0">
        <div className="w-12 h-12 rounded-2xl bg-teal-500/15 flex items-center justify-center">
          <BuildingLogo size={38}/>
        </div>

        <div>
          <h1 className="font-bold leading-tight">
            Sistema Técnico<br/>Predial
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Edifício JK 1455
          </p>
        </div>
      </div>

      <nav className="flex md:flex-col gap-2 shrink-0 md:grow">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = page === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium whitespace-nowrap transition ${
                active
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <Icon size={18}/>
              {item.label}
            </button>
          );
        })}
      </nav>

      <button
        onClick={sair}
        className="hidden md:flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-slate-300 hover:bg-white/10"
      >
        <LogOut size={18}/>
        Sair
      </button>
    </aside>
  );
}
