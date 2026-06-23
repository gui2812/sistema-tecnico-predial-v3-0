import {
  useEffect,
  useState,
} from "react";
import {
  testarConexaoSupabase,
} from "./services/supabaseTestService";
import Layout from "./components/Layout";
import CalculadoraEletrica from "./pages/CalculadoraEletrica";
import Climas from "./pages/Climas";
import Dashboard from "./pages/Dashboard";
import FerramentasPDF from "./pages/FerramentasPDF";
import Geradores from "./pages/Geradores";
import Historico from "./pages/Historico";
import JK1455 from "./pages/JK1455";
import Locatarios from "./pages/Locatarios";
import Login from "./pages/Login";
import Malote from "./pages/Malote";
import Mapa3D from "./pages/Mapa3D";
import MapaCotacao from "./pages/MapaCotacao";
import Pendencias from "./pages/Pendencias";
import RelatoriosPDF from "./pages/RelatoriosPDF";
import RateioAgua from "./pages/RateioAgua";
import SolicitacoesMaterial from "./pages/SolicitacoesMaterial";
import Tecnicos from "./pages/Tecnicos";
import Usuarios from "./pages/Usuarios";
import {
  getSession,
  hasPermission,
} from "./services/storageService";

function usuarioAdmin(user) {
  const perfil = String(user?.perfil || "").toLowerCase();
  const usuario = String(user?.usuario || "").toLowerCase();

  return (
    usuario === "admin" ||
    perfil === "admin" ||
    perfil === "administrador"
  );
}

function temAcessoPagina(user, page) {
  if (!user) {
    return false;
  }

  if (usuarioAdmin(user)) {
    return true;
  }

  if (page === "pendencias") {
    return hasPermission(user, "dashboard");
  }

  return hasPermission(user, page);
}

function primeiraPaginaPermitida(user) {
  if (!user) {
    return "dashboard";
  }

  const ordem = [
    "dashboard",
    "pendencias",
    "solicitacoes",
    "mapaCotacao",
    "ferramentasPdf",
    "mapa3d",
    "jk1455",
    "climas",
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

  return (
    ordem.find((pagina) =>
      temAcessoPagina(user, pagina)
    ) || "solicitacoes"
  );
}

export default function App() {
  const [user, setUser] = useState(getSession());

  const [page, setPage] = useState(
    primeiraPaginaPermitida(getSession())
  );

  useEffect(() => {
    testarConexaoSupabase();
  }, []);

  useEffect(() => {
    if (user && !temAcessoPagina(user, page)) {
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

  function renderPage() {
    if (!temAcessoPagina(user, page)) {
      return null;
    }

    switch (page) {
      case "dashboard":
        return <Dashboard />;

      case "pendencias":
        return <Pendencias user={user} />;

      case "solicitacoes":
        return (
          <SolicitacoesMaterial
            user={user}
          />
        );

      case "mapaCotacao":
        return (
          <MapaCotacao
            user={user}
          />
        );

      case "ferramentasPdf":
        return (
          <FerramentasPDF
            user={user}
          />
        );

      case "mapa3d":
        return (
          <Mapa3D
            user={user}
            modo="gestao"
          />
        );

      case "jk1455":
        return (
          <JK1455
            user={user}
          />
        );

      case "climas":
        return (
          <Climas
            user={user}
          />
        );

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

      case "historico":
        return <Historico />;

      case "relatorios":
        return <RelatoriosPDF />;

      case "usuarios":
        return (
          <Usuarios
            currentUser={user}
            onUserUpdated={() =>
              setUser(getSession())
            }
          />
        );

      default:
        return <Dashboard />;
    }
  }

  return (
    <Layout
      page={page}
      setPage={setPage}
      user={user}
    >
      {renderPage()}
    </Layout>
  );
}
