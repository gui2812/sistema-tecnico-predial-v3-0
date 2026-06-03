import { supabase } from "./supabaseClient";

const BUCKET_PLANTAS = "mapa3d-plantas";

function numeroSeguro(valor, padrao = 0) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : padrao;
}

function textoSeguro(valor, padrao = "") {
  return valor == null ? padrao : String(valor);
}

function slugArquivo(valor = "") {
  return textoSeguro(valor, "arquivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function normalizarAndar(row) {
  if (!row) return null;

  return {
    id: row.id,
    nome: row.nome || "",
    ordem: numeroSeguro(row.ordem, 0),
    altura: numeroSeguro(row.altura, 1),
    alturaVisual: numeroSeguro(
      row.altura_visual,
      numeroSeguro(row.altura, 1)
    ),
    cor: row.cor || "#2563eb",
    observacao: row.observacao || "",
    codigoProjeto: row.codigo_projeto || "",
    plantaUrl: row.planta_url || "",
    categoria: row.categoria || "",
    destaque: row.destaque || "",
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

function montarPayloadAndar(dados = {}, incluirPadroes = false) {
  const payload = {
    atualizado_em: new Date().toISOString(),
  };

  if (incluirPadroes || dados.nome !== undefined) {
    payload.nome = textoSeguro(dados.nome);
  }

  if (incluirPadroes || dados.ordem !== undefined) {
    payload.ordem = numeroSeguro(dados.ordem, 0);
  }

  if (incluirPadroes || dados.altura !== undefined) {
    payload.altura = numeroSeguro(dados.altura, 1);
  }

  if (incluirPadroes || dados.alturaVisual !== undefined) {
    payload.altura_visual = numeroSeguro(
      dados.alturaVisual,
      numeroSeguro(dados.altura, 1)
    );
  }

  if (incluirPadroes || dados.cor !== undefined) {
    payload.cor = textoSeguro(dados.cor, "#2563eb");
  }

  if (incluirPadroes || dados.observacao !== undefined) {
    payload.observacao = textoSeguro(dados.observacao);
  }

  if (incluirPadroes || dados.codigoProjeto !== undefined) {
    payload.codigo_projeto = textoSeguro(dados.codigoProjeto);
  }

  if (incluirPadroes || dados.plantaUrl !== undefined) {
    payload.planta_url = textoSeguro(dados.plantaUrl);
  }

  if (incluirPadroes || dados.categoria !== undefined) {
    payload.categoria = textoSeguro(dados.categoria);
  }

  if (incluirPadroes || dados.destaque !== undefined) {
    payload.destaque = textoSeguro(dados.destaque);
  }

  if (incluirPadroes || dados.ativo !== undefined) {
    payload.ativo = dados.ativo !== false;
  }

  return payload;
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

export async function criarAndarMapa3D(dados = {}) {
  const payload = montarPayloadAndar(dados, true);

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
  const payload = montarPayloadAndar(dados, false);

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

export async function sincronizarAndaresBaseMapa3D(andaresBase = []) {
  const atuais = await listarAndaresMapa3D();
  const resultado = [];

  for (const andarBase of andaresBase) {
    const existente =
      atuais.find(
        (andar) => Number(andar.ordem) === Number(andarBase.ordem)
      ) ||
      atuais.find(
        (andar) =>
          String(andar.nome || "").trim().toLowerCase() ===
          String(andarBase.nome || "").trim().toLowerCase()
      );

    if (existente) {
      resultado.push(
        await atualizarAndarMapa3D(existente.id, andarBase)
      );
    } else {
      resultado.push(await criarAndarMapa3D(andarBase));
    }
  }

  return resultado;
}

export async function uploadPlantaAndarMapa3D(
  arquivo,
  ordem = "sem-ordem"
) {
  if (!arquivo) {
    throw new Error("Selecione um arquivo antes de enviar.");
  }

  const extensao = slugArquivo(
    arquivo.name.split(".").pop() || "pdf"
  );

  const nomeBase = slugArquivo(
    arquivo.name.replace(/\.[^/.]+$/, "") || `planta-${ordem}`
  );

  const pasta =
    String(ordem).replace(/[^0-9-]/g, "") || "andar";

  const caminho = `${pasta}/${Date.now()}-${nomeBase}.${extensao}`;

  const { error } = await supabase.storage
    .from(BUCKET_PLANTAS)
    .upload(caminho, arquivo, {
      upsert: true,
      cacheControl: "3600",
      contentType: arquivo.type || undefined,
    });

  if (error) {
    console.error("Erro ao enviar planta do mapa 3D:", error);
    throw new Error(error.message);
  }

  const { data } = supabase.storage
    .from(BUCKET_PLANTAS)
    .getPublicUrl(caminho);

  if (!data?.publicUrl) {
    throw new Error("Não foi possível obter a URL pública da planta.");
  }

  return data.publicUrl;
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
    console.error("Erro ao listar locais do andar:", error);
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

  if (dados.andarId !== undefined) {
    payload.andar_id = dados.andarId;
  }

  if (dados.nome !== undefined) {
    payload.nome = dados.nome;
  }

  if (dados.tipo !== undefined) {
    payload.tipo = dados.tipo;
  }

  if (dados.descricao !== undefined) {
    payload.descricao = dados.descricao;
  }

  if (dados.observacao !== undefined) {
    payload.observacao = dados.observacao;
  }

  if (dados.responsavel !== undefined) {
    payload.responsavel = dados.responsavel;
  }

  if (dados.status !== undefined) {
    payload.status = dados.status;
  }

  if (dados.ativo !== undefined) {
    payload.ativo = Boolean(dados.ativo);
  }

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
