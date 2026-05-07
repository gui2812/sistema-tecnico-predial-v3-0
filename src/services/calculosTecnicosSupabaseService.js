import { supabase } from "./supabaseClient";

function limparJson(valor) {
  if (valor === null || valor === undefined) return null;

  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : null;
  }

  if (Array.isArray(valor)) {
    return valor.map(limparJson);
  }

  if (typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor).map(([chave, item]) => [chave, limparJson(item)])
    );
  }

  return valor;
}

export async function listarCalculosTecnicosSupabase(filtros = {}) {
  let query = supabase
    .from("calculos_tecnicos")
    .select("*")
    .order("data_calculo", { ascending: false })
    .order("criado_em", { ascending: false });

  if (filtros.tipo) query = query.eq("tipo", filtros.tipo);
  if (filtros.dataInicio) query = query.gte("data_calculo", filtros.dataInicio);
  if (filtros.dataFim) query = query.lte("data_calculo", filtros.dataFim);
  if (filtros.mesReferencia) query = query.eq("mes_referencia", filtros.mesReferencia);

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao listar cálculos técnicos:", error);
    throw new Error(error.message);
  }

  return data || [];
}

export async function criarCalculoTecnicoSupabase(calculo) {
  const payload = {
    tipo: calculo.tipo || "geral",
    titulo: calculo.titulo || calculo.tipo || "Cálculo técnico",
    dados: limparJson(calculo.dados || {}),
    resultado: limparJson(calculo.resultado || {}),
    observacao: calculo.observacao || "",
    usuario_nome: calculo.usuario_nome || "",
    usuario_id: calculo.usuario_id ? String(calculo.usuario_id) : null,
    mes_referencia:
      calculo.mes_referencia || String(calculo.data_calculo || "").slice(0, 7),
    data_calculo:
      calculo.data_calculo || new Date().toISOString().slice(0, 10),
  };

  const { data, error } = await supabase
    .from("calculos_tecnicos")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Erro ao salvar cálculo técnico:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function excluirCalculoTecnicoSupabase(id) {
  const { error } = await supabase
    .from("calculos_tecnicos")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir cálculo técnico:", error);
    throw new Error(error.message);
  }

  return true;
}

export async function excluirCalculosTecnicosEmLoteSupabase(ids = []) {
  if (!ids.length) return true;

  const { error } = await supabase
    .from("calculos_tecnicos")
    .delete()
    .in("id", ids);

  if (error) {
    console.error("Erro ao zerar cálculos técnicos:", error);
    throw new Error(error.message);
  }

  return true;
}

// Correção: antes validava usuário + senha.
// Se a sessão estiver sem o campo "usuario", sempre dava senha incorreta.
// Agora valida qualquer usuário ativo de perfil admin/administrador com a senha informada.
export async function verificarSenhaAdminSupabase(usuario, senha) {
  const senhaDigitada = String(senha || "").trim();

  if (!senhaDigitada) return false;

  const { data, error } = await supabase
    .from("usuarios_app")
    .select("id, usuario, perfil, ativo")
    .eq("senha", senhaDigitada)
    .eq("ativo", true)
    .in("perfil", ["admin", "administrador", "Administrador", "ADMIN"]);

  if (error) {
    console.error("Erro ao validar senha de administrador:", error);
    return false;
  }

  return Array.isArray(data) && data.length > 0;
}

export function normalizarCalculoTecnicoParaTela(item) {
  const dados = item.dados || {};
  const resultado = item.resultado || {};

  return {
    id: item.id,
    tipo: item.tipo,
    titulo: item.titulo || item.tipo,
    data: item.data_calculo,
    mesReferencia: item.mes_referencia,
    dados,
    resultado,
    observacao: item.observacao || "",
    usuarioNome: item.usuario_nome || "",
    criadoEm: item.criado_em,
    ...dados,
    ...resultado,
  };
}

export function separarCalculosTecnicosPorTipo(lista = []) {
  const normalizados = lista.map(normalizarCalculoTecnicoParaTela);

  return {
    todos: normalizados,
    diesel: normalizados.filter((i) => i.tipo === "diesel"),
    fancoil: normalizados.filter((i) => i.tipo === "fancoil"),
    gas: normalizados.filter((i) => i.tipo === "gas"),
  };
}
