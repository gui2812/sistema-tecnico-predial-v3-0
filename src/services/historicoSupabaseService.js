import { supabase } from "./supabaseClient";

export async function listarHistoricoSupabase() {
  const { data, error } = await supabase
    .from("historico")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("Erro ao listar histórico:", error);
    throw new Error(error.message);
  }

  return data || [];
}

export async function registrarHistoricoSupabase({
  tipo = "Sistema",
  modulo = "Geral",
  acao = "",
  descricao = "",
  usuario = "",
  usuario_id = null,
  referencia_id = null,
  dados = {},
}) {
  const payload = {
    tipo,
    modulo,
    acao,
    descricao,
    usuario,
    usuario_id,
    referencia_id,
    dados,
  };

  const { data, error } = await supabase
    .from("historico")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Erro ao registrar histórico:", error);
    return null;
  }

  return data;
}

export async function excluirHistoricoSupabase(id) {
  const { error } = await supabase
    .from("historico")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir histórico:", error);
    throw new Error(error.message);
  }

  return true;
}

export async function limparHistoricoSupabase() {
  const { data, error } = await supabase
    .from("historico")
    .select("id");

  if (error) {
    console.error("Erro ao buscar histórico para limpar:", error);
    throw new Error(error.message);
  }

  const ids = (data || []).map((r) => r.id);

  if (!ids.length) return true;

  const { error: erroDelete } = await supabase
    .from("historico")
    .delete()
    .in("id", ids);

  if (erroDelete) {
    console.error("Erro ao limpar histórico:", erroDelete);
    throw new Error(erroDelete.message);
  }

  return true;
}
