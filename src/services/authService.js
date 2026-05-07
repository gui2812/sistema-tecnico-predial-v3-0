import { supabase } from "./supabaseClient";

const SESSION_KEY = "stp_session";

function normalizarPermissoes(permissoes = [], perfil = "") {
  // Converte nomes que vieram do Supabase para os nomes usados no sistema
  const mapa = {
    energia: "locatarios",
    calculos_tecnicos: "tecnicos",
    rateio_agua: "rateioAgua",
  };

  let lista = Array.isArray(permissoes) ? permissoes : [];

  lista = lista.map((p) => mapa[p] || p);

  // Se for administrador, libera tudo para evitar sumir menu
  if (perfil === "administrador" || perfil === "admin") {
    return [
      "dashboard",
      "calculadora",
      "tecnicos",
      "geradores",
      "locatarios",
      "malote",
      "rateioAgua",
      "solicitacoes",
      "historico",
      "relatorios",
      "usuarios",
    ];
  }

  return lista;
}

export async function loginComSupabase(usuario, senha) {
  const usuarioLimpo = usuario.trim().toLowerCase();

  const { data, error } = await supabase
    .from("usuarios_app")
    .select("*")
    .eq("usuario", usuarioLimpo)
    .eq("senha", senha)
    .eq("ativo", true)
    .single();

  if (error || !data) {
    return {
      sucesso: false,
      erro: "Usuário ou senha incorretos.",
    };
  }

  const session = {
    id: data.id,
    nome: data.nome,
    usuario: data.usuario,
    senha: data.senha,
    setor: data.setor,
    perfil: data.perfil,
    ativo: data.ativo,
    permissoes: normalizarPermissoes(data.permissoes, data.perfil),
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  return {
    sucesso: true,
    usuario: session,
  };
}

export function sairDoSistema() {
  localStorage.removeItem(SESSION_KEY);
  window.location.reload();
}