import {
  AlertTriangle,
  BarChart3,
  Building2,
  Calculator,
  ClipboardList,
  CloudSun,
  Droplets,
  Eye,
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
        bg-slate-950 text-white
        w-full md:w-72
        md:h-screen md:sticky md:top-0 md:left-0
        p-3 md:p-5
        flex md
