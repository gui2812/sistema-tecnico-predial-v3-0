import { supabase } from "./supabaseClient";

export async function testarConexaoSupabase() {
  const { data, error } = await supabase
    .from("usuarios_app")
    .select("*")
    .limit(10);

  if (error) {
    console.error("Erro ao conectar no Supabase:", error);
    return { sucesso: false, erro: error.message };
  }

  console.log("Conexão Supabase OK:", data);
  return { sucesso: true, dados: data };
}