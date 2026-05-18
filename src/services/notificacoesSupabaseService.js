import { supabase } from "./supabaseClient";

export async function listarNotificacoesSupabase(user) {
  if (!user) return [];

  const isAdmin =
    user?.perfil === "admin" || user?.perfil === "administrador";

  let query = supabase
    .from("notificacoes")
    .select("*")
    .order("criado_em", { ascending: false })
    .limit(50);

  if (!isAdmin) {
    query = query.or(
      [
        `destinatario_id.eq.${user.id}`,
        `destinatario_usuario.eq.${user.usuario}`,
        `destinatario_nome.eq.${user.nome}`,
        `destinatario_setor.eq.${user.setor}`,
      ]
        .filter(Boolean)
        .join(",")
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao listar notificações:", error);
    return [];
  }

  return data || [];
}

export async function criarNotificacaoSupabase({
  tipo = "sistema",
  titulo = "",
  mensagem = "",
  destinatario_id = null,
  destinatario_usuario = "",
  destinatario_nome = "",
  destinatario_setor = "",
  somente_admin = false,
  referencia_id = null,
  criada_por = "",
}) {
  const payload = {
    tipo,
    titulo,
    mensagem,
    destinatario_id,
    destinatario_usuario,
    destinatario_nome,
    destinatario_setor,
    somente_admin,
    referencia_id,
    lida: false,
    criada_por,
  };

  const { data, error } = await supabase
    .from("notificacoes")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar notificação:", error);
    return null;
  }

  return data;
}

export async function marcarNotificacaoLidaSupabase(id) {
  const { data, error } = await supabase
    .from("notificacoes")
    .update({
      lida: true,
      lida_em: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao marcar notificação como lida:", error);
    return null;
  }

  return data;
}

export async function marcarTodasNotificacoesLidasSupabase(user) {
  if (!user) return false;

  const isAdmin =
    user?.perfil === "admin" || user?.perfil === "administrador";

  let query = supabase
    .from("notificacoes")
    .update({
      lida: true,
      lida_em: new Date().toISOString(),
    });

  if (!isAdmin) {
    query = query.or(
      [
        `destinatario_id.eq.${user.id}`,
        `destinatario_usuario.eq.${user.usuario}`,
        `destinatario_nome.eq.${user.nome}`,
        `destinatario_setor.eq.${user.setor}`,
      ]
        .filter(Boolean)
        .join(",")
    );
  }

  const { error } = await query;

  if (error) {
    console.error("Erro ao marcar todas notificações como lidas:", error);
    return false;
  }

  return true;
}

export async function excluirNotificacaoSupabase(id) {
  const { error } = await supabase
    .from("notificacoes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir notificação:", error);
    return false;
  }

  return true;
}

export async function limparNotificacoesSupabase(user) {
  if (!user) return false;

  const isAdmin =
    user?.perfil === "admin" || user?.perfil === "administrador";

  let query = supabase.from("notificacoes").delete();

  if (!isAdmin) {
    query = query.or(
      [
        `destinatario_id.eq.${user.id}`,
        `destinatario_usuario.eq.${user.usuario}`,
        `destinatario_nome.eq.${user.nome}`,
        `destinatario_setor.eq.${user.setor}`,
      ]
        .filter(Boolean)
        .join(",")
    );
  }

  const { error } = await query;

  if (error) {
    console.error("Erro ao limpar notificações:", error);
    return false;
  }

  return true;
}
