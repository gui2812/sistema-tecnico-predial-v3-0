import { supabase } from "./supabaseClient";

export async function listarUsuariosSupabase() {
  const { data, error } = await supabase.rpc("listar_usuarios_app");

  if (error) {
    console.error("Erro ao listar usuários:", error);
    return [];
  }

  return data || [];
}

export async function criarUsuarioSupabase(usuario) {
  const { data, error } = await supabase.rpc("criar_usuario_app", {
    p_nome: usuario.nome,
    p_usuario: usuario.usuario.trim().toLowerCase(),
    p_senha: usuario.senha,
    p_setor: usuario.setor,
    p_perfil: usuario.perfil,
    p_ativo: usuario.ativo ?? true,
    p_permissoes: usuario.permissoes || [],
    p_tema: usuario.tema || "claro",
    p_preferencias: usuario.preferencias || {},
  });

  if (error) {
    console.error("Erro ao criar usuário:", error);
    throw new Error(error.message);
  }

  return Array.isArray(data) ? data[0] : data;
}

export async function atualizarUsuarioSupabase(id, patch) {
  const { data, error } = await supabase.rpc("atualizar_usuario_app", {
    p_id: id,
    p_nome: patch.nome ?? null,
    p_usuario: patch.usuario ? patch.usuario.trim().toLowerCase() : null,
    // Vazio/undefined = manter a senha atual (tratado dentro da função no banco).
    p_senha: patch.senha ? patch.senha : null,
    p_setor: patch.setor ?? null,
    p_perfil: patch.perfil ?? null,
    p_ativo: patch.ativo ?? null,
    p_permissoes: patch.permissoes ?? null,
    p_tema: patch.tema ?? null,
    p_preferencias: patch.preferencias ?? null,
  });

  if (error) {
    console.error("Erro ao atualizar usuário:", error);
    throw new Error(error.message);
  }

  return Array.isArray(data) ? data[0] : data;
}

export async function atualizarTemaUsuarioSupabase(id, tema) {
  return atualizarUsuarioSupabase(id, { tema });
}

export async function atualizarPreferenciasUsuarioSupabase(id, preferencias = {}) {
  return atualizarUsuarioSupabase(id, { preferencias });
}

export async function excluirUsuarioSupabase(id) {
  const { error } = await supabase.rpc("excluir_usuario_app", {
    p_id: id,
  });

  if (error) {
    console.error("Erro ao excluir usuário:", error);
    throw new Error(error.message);
  }

  return true;
}
