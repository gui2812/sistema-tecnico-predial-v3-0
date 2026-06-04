import { supabase } from "./supabaseClient";

const BUCKET_MAPA3D = "mapa3d-arquivos";

// =========================
// NORMALIZADORES
// =========================
function normalizarAndar(row) {
  if (!row) return null;

  return {
    id: row.id,
    nome: row.nome || "",
    ordem: Number(row.ordem || 0),
    altura: Number(row.altura || 3),
    cor: row.cor || "#2563eb",
    observacao: row.observacao || "",
    categoria: row.categoria || "comercial",
    tituloCurto: row.titulo_curto || "",
    mostrarRotulo: row.mostrar_rotulo !== false,
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

function normalizarItemExterno(row) {
  if (!row) return null;

  return {
    id: row.id,
    nome: row.nome || "",
    categoria: row.categoria || "Operação",
    lado: row.lado || "frente",
    tipoVisual: row.tipo_visual || "retangular",
    modoImplantacao: row.modo_implantacao || "superficie",
    descricao: row.descricao || "",
    observacao: row.observacao || "",
    status: row.status || "Ativo",
    cor: row.cor || "#64748b",
    x: Number(row.x || 0),
    y: Number(row.y || 0),
    z: Number(row.z || 0),
    largura: Number(row.largura || 1.4),
    altura: Number(row.altura || 1.2),
    profundidade: Number(row.profundidade || 1.4),
    ordem: Number(row.ordem || 0),
    ativo: row.ativo !== false,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
  };
}

function normalizarArquivo(row) {
  if (!row) return null;

  return {
    id: row.id,
    entidadeTipo: row.entidade_tipo || "",
    entidadeId: row.entidade_id || "",
    tipoArquivo: row.tipo_arquivo || "arquivo",
    nome: row.nome || "",
    caminhoStorage: row.caminho_storage || "",
    urlPublica: row.url_publica || "",
    mimeType: row.mime_type || "",
    legenda: row.legenda || "",
    ativo: row.ativo !== false,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
  };
}

function gerarNomeArquivo(file) {
  const ext = file?.name?.split(".").pop() || "bin";
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}_${random}.${ext}`;
}

async function uploadArquivoStorage(file, pasta = "geral") {
  if (!file) throw new Error("Arquivo não informado.");

  const fileName = gerarNomeArquivo(file);
  const path = `${pasta}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_MAPA3D)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Erro ao subir arquivo do mapa 3D:", uploadError);
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from(BUCKET_MAPA3D).getPublicUrl(path);

  return {
    caminhoStorage: path,
    urlPublica: data?.publicUrl || "",
    nome: file.name || fileName,
    mimeType: file.type || "",
  };
}

// =========================
// ANDARES
// =========================
export async function listarAndaresMapa3D() {
  const { data, error } = await supabase
    .from("mapa3d_andares")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  if (error) {
    console.error("Erro ao listar andares:", error);
    throw new Error(error.message);
  }

  return (data || []).map(normalizarAndar).filter(Boolean);
}

export async function criarAndarMapa3D({
  nome,
  ordem = 0,
  altura = 3,
  cor = "#2563eb",
  observacao = "",
  categoria = "comercial",
  tituloCurto = "",
  mostrarRotulo = true,
}) {
  const payload = {
    nome,
    ordem: Number(ordem || 0),
    altura: Number(altura || 3),
    cor,
    observacao,
    categoria,
    titulo_curto: tituloCurto,
    mostrar_rotulo: Boolean(mostrarRotulo),
    ativo: true,
  };

  const { data, error } = await supabase
    .from("mapa3d_andares")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar andar:", error);
    throw new Error(error.message);
  }

  return normalizarAndar(data);
}

export async function atualizarAndarMapa3D(id, dados = {}) {
  const payload = {};

  if (dados.nome !== undefined) payload.nome = dados.nome;
  if (dados.ordem !== undefined) payload.ordem = Number(dados.ordem || 0);
  if (dados.altura !== undefined) payload.altura = Number(dados.altura || 3);
  if (dados.cor !== undefined) payload.cor = dados.cor;
  if (dados.observacao !== undefined) payload.observacao = dados.observacao;
  if (dados.categoria !== undefined) payload.categoria = dados.categoria;
  if (dados.tituloCurto !== undefined) payload.titulo_curto = dados.tituloCurto;
  if (dados.mostrarRotulo !== undefined)
    payload.mostrar_rotulo = Boolean(dados.mostrarRotulo);
  if (dados.ativo !== undefined) payload.ativo = Boolean(dados.ativo);

  const { data, error } = await supabase
    .from("mapa3d_andares")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar andar:", error);
    throw new Error(error.message);
  }

  return normalizarAndar(data);
}

export async function excluirAndarMapa3D(id) {
  const { error } = await supabase
    .from("mapa3d_andares")
    .update({ ativo: false })
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir andar:", error);
    throw new Error(error.message);
  }

  return true;
}

// =========================
// LOCAIS
// =========================
export async function listarLocaisMapa3D() {
  const { data, error } = await supabase
    .from("mapa3d_locais")
    .select("*")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) {
    console.error("Erro ao listar locais:", error);
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
    console.error("Erro ao listar locais por andar:", error);
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
  };

  const { data, error } = await supabase
    .from("mapa3d_locais")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar local:", error);
    throw new Error(error.message);
  }

  return normalizarLocal(data);
}

export async function atualizarLocalMapa3D(id, dados = {}) {
  const payload = {};

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
    console.error("Erro ao atualizar local:", error);
    throw new Error(error.message);
  }

  return normalizarLocal(data);
}

export async function excluirLocalMapa3D(id) {
  const { error } = await supabase
    .from("mapa3d_locais")
    .update({ ativo: false })
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir local:", error);
    throw new Error(error.message);
  }

  return true;
}

// =========================
// ITENS EXTERNOS
// =========================
export async function listarItensExternosMapa3D() {
  const { data, error } = await supabase
    .from("mapa3d_itens_externos")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });

  if (error) {
    console.error("Erro ao listar itens externos:", error);
    throw new Error(error.message);
  }

  return (data || []).map(normalizarItemExterno).filter(Boolean);
}

export async function criarItemExternoMapa3D({
  nome,
  categoria = "Operação",
  lado = "frente",
  tipoVisual = "retangular",
  modoImplantacao = "superficie",
  descricao = "",
  observacao = "",
  status = "Ativo",
  cor = "#64748b",
  x = 0,
  y = 0,
  z = 0,
  largura = 1.4,
  altura = 1.2,
  profundidade = 1.4,
  ordem = 0,
}) {
  const payload = {
    nome,
    categoria,
    lado,
    tipo_visual: tipoVisual,
    modo_implantacao: modoImplantacao,
    descricao,
    observacao,
    status,
    cor,
    x: Number(x || 0),
    y: Number(y || 0),
    z: Number(z || 0),
    largura: Number(largura || 1.4),
    altura: Number(altura || 1.2),
    profundidade: Number(profundidade || 1.4),
    ordem: Number(ordem || 0),
    ativo: true,
  };

  const { data, error } = await supabase
    .from("mapa3d_itens_externos")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar item externo:", error);
    throw new Error(error.message);
  }

  return normalizarItemExterno(data);
}

export async function atualizarItemExternoMapa3D(id, dados = {}) {
  const payload = {};

  if (dados.nome !== undefined) payload.nome = dados.nome;
  if (dados.categoria !== undefined) payload.categoria = dados.categoria;
  if (dados.lado !== undefined) payload.lado = dados.lado;
  if (dados.tipoVisual !== undefined) payload.tipo_visual = dados.tipoVisual;
  if (dados.modoImplantacao !== undefined)
    payload.modo_implantacao = dados.modoImplantacao;
  if (dados.descricao !== undefined) payload.descricao = dados.descricao;
  if (dados.observacao !== undefined) payload.observacao = dados.observacao;
  if (dados.status !== undefined) payload.status = dados.status;
  if (dados.cor !== undefined) payload.cor = dados.cor;
  if (dados.x !== undefined) payload.x = Number(dados.x || 0);
  if (dados.y !== undefined) payload.y = Number(dados.y || 0);
  if (dados.z !== undefined) payload.z = Number(dados.z || 0);
  if (dados.largura !== undefined)
    payload.largura = Number(dados.largura || 1.4);
  if (dados.altura !== undefined) payload.altura = Number(dados.altura || 1.2);
  if (dados.profundidade !== undefined)
    payload.profundidade = Number(dados.profundidade || 1.4);
  if (dados.ordem !== undefined) payload.ordem = Number(dados.ordem || 0);
  if (dados.ativo !== undefined) payload.ativo = Boolean(dados.ativo);

  const { data, error } = await supabase
    .from("mapa3d_itens_externos")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar item externo:", error);
    throw new Error(error.message);
  }

  return normalizarItemExterno(data);
}

export async function excluirItemExternoMapa3D(id) {
  const { error } = await supabase
    .from("mapa3d_itens_externos")
    .update({ ativo: false })
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir item externo:", error);
    throw new Error(error.message);
  }

  return true;
}

// =========================
// ARQUIVOS
// =========================
export async function listarArquivosMapa3DPorEntidade(entidadeTipo, entidadeId) {
  const { data, error } = await supabase
    .from("mapa3d_arquivos")
    .select("*")
    .eq("entidade_tipo", entidadeTipo)
    .eq("entidade_id", entidadeId)
    .eq("ativo", true)
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("Erro ao listar arquivos:", error);
    throw new Error(error.message);
  }

  return (data || []).map(normalizarArquivo).filter(Boolean);
}

export async function criarArquivoMapa3D({
  entidadeTipo,
  entidadeId,
  tipoArquivo = "arquivo",
  legenda = "",
  arquivo,
}) {
  const upload = await uploadArquivoStorage(
    arquivo,
    `${entidadeTipo}/${entidadeId}`
  );

  const payload = {
    entidade_tipo: entidadeTipo,
    entidade_id: entidadeId,
    tipo_arquivo: tipoArquivo,
    nome: upload.nome,
    caminho_storage: upload.caminhoStorage,
    url_publica: upload.urlPublica,
    mime_type: upload.mimeType,
    legenda,
    ativo: true,
  };

  const { data, error } = await supabase
    .from("mapa3d_arquivos")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar arquivo do mapa 3D:", error);
    throw new Error(error.message);
  }

  return normalizarArquivo(data);
}

export async function excluirArquivoMapa3D(id, caminhoStorage) {
  if (caminhoStorage) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET_MAPA3D)
      .remove([caminhoStorage]);

    if (storageError) {
      console.warn("Aviso ao excluir arquivo do storage:", storageError.message);
    }
  }

  const { error } = await supabase
    .from("mapa3d_arquivos")
    .update({ ativo: false })
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir arquivo do mapa 3D:", error);
    throw new Error(error.message);
  }

  return true;
}
