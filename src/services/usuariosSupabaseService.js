import { supabase } from "./supabaseClient";

export async function listarUsuariosSupabase() {
  const { data, error } = await supabase
    .from("usuarios_app")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("Erro ao listar usuários:", error);
    return [];
  }

  return data || [];
}

export async function criarUsuarioSupabase(usuario) {
  const payload = {
    nome: usuario.nome,
    usuario: usuario.usuario.trim().toLowerCase(),
    senha: usuario.senha,
    setor: usuario.setor,
    perfil: usuario.perfil,
    ativo: usuario.ativo ?? true,
    permissoes: usuario.permissoes || [],
  };

  const { data, error } = await supabase
    .from("usuarios_app")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar usuário:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function atualizarUsuarioSupabase(id, patch) {
  const payload = {
    nome: patch.nome,
    usuario: patch.usuario?.trim().toLowerCase(),
    senha: patch.senha,
    setor: patch.setor,
    perfil: patch.perfil,
    ativo: patch.ativo,
    permissoes: patch.permissoes,
    atualizado_em: new Date().toISOString(),
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  const { data, error } = await supabase
    .from("usuarios_app")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar usuário:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function excluirUsuarioSupabase(id) {
  const { error } = await supabase
    .from("usuarios_app")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir usuário:", error);
    throw new Error(error.message);
  }

  return true;
}