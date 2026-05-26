import { supabase } from "./supabaseClient";

function normalizarAndar(row) {
  if (!row) return null;

  return {
    id: row.id,
    nome: row.nome || "",
    ordem: Number(row.ordem || 0),
    altura: Number(row.altura || 1),
    cor: row.cor || "#2563eb",
    observacao: row.observacao || "",
    ativo: row.ativo !== false,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
  };
}

function normalizarLocal(row) {
  if (!row) return null;

  return {
    id: row.id,
    andarId: row.andar_id || "",
    nome: row.nome || "",
    tipo: row.tipo || "Local",
    descricao: row.descricao || "",
    observacao: row.observacao || "",
    responsavel: row.responsavel || "",
    status: row.status || "Ativo",
    ativo: row.ativo !== false,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
  };
}

export async function listarAndaresMapa3D() {
  const { data, error } = await supabase
    .from("mapa3d_andares")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  if (error) {
    console.error("Erro ao listar andares do mapa 3D:", error);
    throw new Error(error.message);
  }

  return (data || []).map(normalizarAndar).filter(Boolean);
}

export async function criarAndarMapa3D({
  nome,
  ordem = 0,
  altura = 1,
  cor = "#2563eb",
  observacao = "",
}) {
  const payload = {
    nome,
    ordem: Number(ordem || 0),
    altura: Number(altura || 1),
    cor,
    observacao,
    ativo: true,
    atualizado_em: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("mapa3d_andares")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar andar do mapa 3D:", error);
    throw new Error(error.message);
  }

  return normalizarAndar(data);
}

export async function atualizarAndarMapa3D(id, dados = {}) {
  const payload = {
    atualizado_em: new Date().toISOString(),
  };

  if (dados.nome !== undefined) payload.nome = dados.nome;
  if (dados.ordem !== undefined) payload.ordem = Number(dados.ordem || 0);
  if (dados.altura !== undefined) payload.altura = Number(dados.altura || 1);
  if (dados.cor !== undefined) payload.cor = dados.cor;
  if (dados.observacao !== undefined) payload.observacao = dados.observacao;
  if (dados.ativo !== undefined) payload.ativo = Boolean(dados.ativo);

  const { data, error } = await supabase
    .from("mapa3d_andares")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar andar do mapa 3D:", error);
    throw new Error(error.message);
  }

  return normalizarAndar(data);
}

export async function excluirAndarMapa3D(id) {
  const { error } = await supabase
    .from("mapa3d_andares")
    .update({
      ativo: false,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir andar do mapa 3D:", error);
    throw new Error(error.message);
  }

  return true;
}

export async function listarLocaisMapa3D() {
  const { data, error } = await supabase
    .from("mapa3d_locais")
    .select("*")
    .eq("ativo", true)
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("Erro ao listar locais do mapa 3D:", error);
    throw new Error(error.message);
  }

  return (data || []).map(normalizarLocal).filter(Boolean);
}

export async function listarLocaisPorAndarMapa3D(andarId) {
  const { data, error } = await supabase
    .from("mapa3d_locais")
    .select("*")
    .eq("andar_id", andarId)
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) {
    console.error("Erro ao listar locais do andar no mapa 3D:", error);
    throw new Error(error.message);
  }

  return (data || []).map(normalizarLocal).filter(Boolean);
}

export async function criarLocalMapa3D({
  andarId,
  nome,
  tipo = "Local",
  descricao = "",
  observacao = "",
  responsavel = "",
  status = "Ativo",
}) {
  const payload = {
    andar_id: andarId,
    nome,
    tipo,
    descricao,
    observacao,
    responsavel,
    status,
    ativo: true,
    atualizado_em: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("mapa3d_locais")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar local do mapa 3D:", error);
    throw new Error(error.message);
  }

  return normalizarLocal(data);
}

export async function atualizarLocalMapa3D(id, dados = {}) {
  const payload = {
    atualizado_em: new Date().toISOString(),
  };

  if (dados.andarId !== undefined) payload.andar_id = dados.andarId;
  if (dados.nome !== undefined) payload.nome = dados.nome;
  if (dados.tipo !== undefined) payload.tipo = dados.tipo;
  if (dados.descricao !== undefined) payload.descricao = dados.descricao;
  if (dados.observacao !== undefined) payload.observacao = dados.observacao;
  if (dados.responsavel !== undefined) payload.responsavel = dados.responsavel;
  if (dados.status !== undefined) payload.status = dados.status;
  if (dados.ativo !== undefined) payload.ativo = Boolean(dados.ativo);

  const { data, error } = await supabase
    .from("mapa3d_locais")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar local do mapa 3D:", error);
    throw new Error(error.message);
  }

  return normalizarLocal(data);
}

export async function excluirLocalMapa3D(id) {
  const { error } = await supabase
    .from("mapa3d_locais")
    .update({
      ativo: false,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir local do mapa 3D:", error);
    throw new Error(error.message);
  }

  return true;
}
