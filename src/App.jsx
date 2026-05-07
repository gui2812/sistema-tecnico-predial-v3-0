import { useEffect, useState } from "react";
import { testarConexaoSupabase } from "./services/supabaseTestService";
import Layout from "./components/Layout";
import CalculadoraEletrica from "./pages/CalculadoraEletrica";
import Dashboard from "./pages/Dashboard";
import Geradores from "./pages/Geradores";
import Historico from "./pages/Historico";
import Locatarios from "./pages/Locatarios";
import Login from "./pages/Login";
import Malote from "./pages/Malote";
import RelatoriosPDF from "./pages/RelatoriosPDF";
import RateioAgua from "./pages/RateioAgua";
import SolicitacoesMaterial from "./pages/SolicitacoesMaterial";
import Tecnicos from "./pages/Tecnicos";
import Usuarios from "./pages/Usuarios";
import { getSession, hasPermission } from "./services/storageService";

function primeiraPaginaPermitida(user) {
  if (!user) return "dashboard";

  const ordem = [
    "dashboard",
    "solicitacoes",
    "calculadora",
    "tecnicos",
    "geradores",
    "locatarios",
    "malote",
    "rateioAgua",
    "historico",
    "relatorios",
    "usuarios",
  ];

  return ordem.find((p) => hasPermission(user, p)) || "solicitacoes";
}

export default function App() {
  const [user, setUser] = useState(getSession());
  const [page, setPage] = useState(primeiraPaginaPermitida(user));

  useEffect(() => {
    testarConexaoSupabase();
  }, []);

  useEffect(() => {
    if (user && !hasPermission(user, page)) {
      setPage(primeiraPaginaPermitida(user));
    }
  }, [user, page]);

  if (!user) {
    return (
      <Login
        onLogin={(session) => {
          setUser(session);
          setPage(primeiraPaginaPermitida(session));
        }}
      />
    );
  }

  const renderPage = () => {
    if (!hasPermission(user, page)) return null;

    switch (page) {
      case "dashboard":
        return <Dashboard />;
      case "calculadora":
        return <CalculadoraEletrica />;
      case "tecnicos":
        return <Tecnicos />;
      case "geradores":
        return <Geradores />;
      case "locatarios":
        return <Locatarios />;
      case "malote":
        return <Malote />;
      case "rateioAgua":
        return <RateioAgua />;
      case "solicitacoes":
        return <SolicitacoesMaterial user={user} />;
      case "historico":
        return <Historico />;
      case "relatorios":
        return <RelatoriosPDF />;
      case "usuarios":
        return (
          <Usuarios
            currentUser={user}
            onUserUpdated={() => setUser(getSession())}
          />
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout page={page} setPage={setPage} user={user}>
      {renderPage()}
    </Layout>
  );
}