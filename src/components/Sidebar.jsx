import {
  AlertTriangle,
  BarChart3,
  Building2,
  Calculator,
  ClipboardList,
  CloudSun,
  Droplets,
  Eye,
  FileSpreadsheet,
  FileText,
  Fuel,
  History,
  LogOut,
  Mail,
  PackagePlus,
  Users,
  Wrench,
} from "lucide-react";
import {
  hasPermission,
  logout,
} from "../services/storageService";
import BuildingLogo from "./BuildingLogo";

const items = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: BarChart3,
  },
  {
    id: "pendencias",
    label: "Pendências",
    icon: AlertTriangle,
  },
  {
    id: "solicitacoes",
    label: "Solicitação Material",
    icon: PackagePlus,
  },
  {
    id: "mapaCotacao",
    label: "Mapa de Cotação",
    icon: FileSpreadsheet,
  },
  {
    id: "mapa3d",
    label: "Mapa 3D",
    icon: Building2,
  },
  {
    id: "jk1455",
    label: "JK 1455",
    icon: Eye,
  },
  {
    id: "climas",
    label: "Climas",
    icon: CloudSun,
  },
  {
    id: "calculadora",
    label: "Calculadora Elétrica",
    icon: Calculator,
  },
  {
    id: "tecnicos",
    label: "Cálculos Técnicos",
    icon: Wrench,
  },
  {
    id: "geradores",
    label: "Geradores",
    icon: Fuel,
  },
  {
    id: "locatarios",
    label: "Energia dos Locatários",
    icon: ClipboardList,
  },
  {
    id: "malote",
    label: "Malote",
    icon: Mail,
  },
  {
    id: "rateioAgua",
    label: "Rateio de Água",
    icon: Droplets,
  },
  {
    id: "historico",
    label: "Histórico",
    icon: History,
  },
  {
    id: "relatorios",
    label: "Relatórios PDF",
    icon: FileText,
  },
  {
    id: "usuarios",
    label: "Usuários",
    icon: Users,
  },
];

export default function Sidebar({
  page,
  setPage,
  user,
}) {
  const visibleItems =
    items.filter(
      (item) =>
        hasPermission(
          user,
          item.id
        )
    );

  function sair() {
    logout();

    window.location.reload();
  }

  return (
    <aside
      className="
        z-30
        flex w-full gap-3
        overflow-hidden
        bg-slate-950 p-3 text-white

        md:sticky
        md:left-0
        md:top-0
        md:h-screen
        md:w-72
        md:flex-col
        md:gap-5
        md:p-5
      "
    >
      <div className="hidden shrink-0 items-center gap-3 md:flex">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/15">
          <BuildingLogo
            size={38}
          />
        </div>

        <div>
          <h1 className="font-bold leading-tight">
            Sistema Técnico
            <br />
            Predial
          </h1>

          <p className="mt-1 text-xs text-slate-400">
            Edifício JK 1455
          </p>
        </div>
      </div>

      <nav
        className="
          no-scrollbar
          flex max-w-full shrink-0 gap-2
          overflow-x-auto

          md:min-h-0
          md:flex-1
          md:flex-col
          md:overflow-x-hidden
          md:overflow-y-auto
          md:pr-1
        "
      >
        {visibleItems.map(
          (item) => {
            const Icon =
              item.icon;

            const active =
              page ===
              item.id;

            return (
              <button
                key={
                  item.id
                }
                type="button"
                onClick={() =>
                  setPage(
                    item.id
                  )
                }
                className={`flex shrink-0 items-center gap-3 whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                <Icon
                  size={18}
                />

                {item.label}
              </button>
            );
          }
        )}
      </nav>

      <div className="hidden shrink-0 border-t border-white/10 pt-3 md:block">
        <button
          type="button"
          onClick={sair}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/10"
        >
          <LogOut
            size={18}
          />

          Sair
        </button>
      </div>
    </aside>
  );
}
