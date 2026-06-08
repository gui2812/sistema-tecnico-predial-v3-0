import { supabase } from "./supabaseClient";

const BUCKET_MAPA3D = "mapa3d-arquivos";

// =========================================================
// HELPERS
// =========================================================

function agoraIso() {
  return new Date().toISOString();
}

function normalizarIdOpcional(valor) {
  if (
    valor === undefined ||
    valor === null ||
    valor === ""
  ) {
    return null;
  }

  return valor;
}

function ordenarLocais(lista = []) {
  return [...lista].sort((a, b) => {
    const ordemA = Number(a.ordem || 0);
    const ordemB = Number(b.ordem || 0);

    if (ordemA !== ordemB) {
      return ordemA - ordemB;
    }

    return String(a.nome || "").localeCompare(
      String(b.nome || ""),
      "pt-BR"
    );
  });
}

// =========================================================
// NORMALIZAÇÃO
// =========================================================

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
    localPaiId: row.local_pai_id || null,
    nome: row.nome || "",
    tipo: row.tipo || "Local",
    descricao: row.descricao || "",
    observacao: row.observacao || "",
    responsavel: row.responsavel || "",
    status: row.status || "Ativo",
    ordem: Number(row.ordem || 0),
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
    largura: Number(row.largura || 0.8),
    altura: Number(row.altura || 0.6),
    profundidade: Number(row.profundidade || 0.8),
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
  const extensao =
    file?.name?.split(".").pop() || "bin";

  const aleatorio =
    Math.random().toString(36).slice(2, 10);

  return `${Date.now()}_${aleatorio}.${extensao}`;
}

async function enviarArquivoStorage(
  arquivo,
  pasta = "geral"
) {
  if (!arquivo) {
    throw new Error("Arquivo não informado.");
  }

  const nomeInterno =
    gerarNomeArquivo(arquivo);

  const caminho =
    `${pasta}/${nomeInterno}`;

  const { error: uploadError } =
    await supabase.storage
      .from(BUCKET_MAPA3D)
      .upload(caminho, arquivo, {
        cacheControl: "3600",
        upsert: false,
      });

  if (uploadError) {
    console.error(
      "Erro ao enviar arquivo:",
      uploadError
    );

    throw new Error(uploadError.message);
  }

  const { data } =
    supabase.storage
      .from(BUCKET_MAPA3D)
      .getPublicUrl(caminho);

  return {
    caminhoStorage: caminho,
    urlPublica: data?.publicUrl || "",
    nome: arquivo.name || nomeInterno,
    mimeType: arquivo.type || "",
  };
}

// =========================================================
// ANDARES
// =========================================================

export async function listarAndaresMapa3D() {
  const { data, error } =
    await supabase
      .from("mapa3d_andares")
      .select("*")
      .eq("ativo", true)
      .order("ordem", {
        ascending: true,
      });

  if (error) {
    console.error(
      "Erro ao listar andares:",
      error
    );

    throw new Error(error.message);
  }

  return (data || [])
    .map(normalizarAndar)
    .filter(Boolean);
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
    atualizado_em: agoraIso(),
  };

  const { data, error } =
    await supabase
      .from("mapa3d_andares")
      .insert(payload)
      .select()
      .single();

  if (error) {
    console.error(
      "Erro ao criar andar:",
      error
    );

    throw new Error(error.message);
  }

  return normalizarAndar(data);
}

export async function atualizarAndarMapa3D(
  id,
  dados = {}
) {
  const payload = {
    atualizado_em: agoraIso(),
  };

  if (dados.nome !== undefined) {
    payload.nome = dados.nome;
  }

  if (dados.ordem !== undefined) {
    payload.ordem =
      Number(dados.ordem || 0);
  }

  if (dados.altura !== undefined) {
    payload.altura =
      Number(dados.altura || 3);
  }

  if (dados.cor !== undefined) {
    payload.cor = dados.cor;
  }

  if (dados.observacao !== undefined) {
    payload.observacao =
      dados.observacao;
  }

  if (dados.categoria !== undefined) {
    payload.categoria =
      dados.categoria;
  }

  if (dados.tituloCurto !== undefined) {
    payload.titulo_curto =
      dados.tituloCurto;
  }

  if (dados.mostrarRotulo !== undefined) {
    payload.mostrar_rotulo =
      Boolean(dados.mostrarRotulo);
  }

  if (dados.ativo !== undefined) {
    payload.ativo =
      Boolean(dados.ativo);
  }

  const { data, error } =
    await supabase
      .from("mapa3d_andares")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

  if (error) {
    console.error(
      "Erro ao atualizar andar:",
      error
    );

    throw new Error(error.message);
  }

  return normalizarAndar(data);
}

export async function excluirAndarMapa3D(id) {
  const { error } =
    await supabase
      .from("mapa3d_andares")
      .update({
        ativo: false,
        atualizado_em: agoraIso(),
      })
      .eq("id", id);

  if (error) {
    console.error(
      "Erro ao excluir andar:",
      error
    );

    throw new Error(error.message);
  }

  return true;
}

// =========================================================
// LOCAIS, AMBIENTES, EQUIPAMENTOS E LOCATÁRIOS
// =========================================================

export async function listarLocaisMapa3D() {
  const { data, error } =
    await supabase
      .from("mapa3d_locais")
      .select("*")
      .eq("ativo", true)
      .order("ordem", {
        ascending: true,
      })
      .order("nome", {
        ascending: true,
      });

  if (error) {
    console.error(
      "Erro ao listar locais:",
      error
    );

    throw new Error(error.message);
  }

  return ordenarLocais(
    (data || [])
      .map(normalizarLocal)
      .filter(Boolean)
  );
}

export async function listarLocaisPorAndarMapa3D(
  andarId
) {
  const { data, error } =
    await supabase
      .from("mapa3d_locais")
      .select("*")
      .eq("andar_id", andarId)
      .eq("ativo", true)
      .order("ordem", {
        ascending: true,
      })
      .order("nome", {
        ascending: true,
      });

  if (error) {
    console.error(
      "Erro ao listar locais do andar:",
      error
    );

    throw new Error(error.message);
  }

  return ordenarLocais(
    (data || [])
      .map(normalizarLocal)
      .filter(Boolean)
  );
}

/**
 * Lista apenas os itens diretamente ligados ao pavimento.
 *
 * Exemplo:
 * 9º Andar
 * ├── Hall social
 * ├── Hall de serviço
 * └── Sala técnica
 *
 * Não inclui Fan coil quando ele estiver dentro de Hall social.
 */
export async function listarLocaisRaizPorAndarMapa3D(
  andarId
) {
  const { data, error } =
    await supabase
      .from("mapa3d_locais")
      .select("*")
      .eq("andar_id", andarId)
      .is("local_pai_id", null)
      .eq("ativo", true)
      .order("ordem", {
        ascending: true,
      })
      .order("nome", {
        ascending: true,
      });

  if (error) {
    console.error(
      "Erro ao listar ambientes raiz do andar:",
      error
    );

    throw new Error(error.message);
  }

  return ordenarLocais(
    (data || [])
      .map(normalizarLocal)
      .filter(Boolean)
  );
}

/**
 * Lista os itens internos de um ambiente.
 *
 * Exemplo:
 * Hall social
 * ├── Fan coil
 * ├── Sensor
 * └── Quadro de iluminação
 */
export async function listarLocaisFilhosMapa3D(
  localPaiId
) {
  const { data, error } =
    await supabase
      .from("mapa3d_locais")
      .select("*")
      .eq("local_pai_id", localPaiId)
      .eq("ativo", true)
      .order("ordem", {
        ascending: true,
      })
      .order("nome", {
        ascending: true,
      });

  if (error) {
    console.error(
      "Erro ao listar itens internos:",
      error
    );

    throw new Error(error.message);
  }

  return ordenarLocais(
    (data || [])
      .map(normalizarLocal)
      .filter(Boolean)
  );
}

/**
 * Busca um ambiente ou equipamento específico.
 */
export async function buscarLocalMapa3D(id) {
  const { data, error } =
    await supabase
      .from("mapa3d_locais")
      .select("*")
      .eq("id", id)
      .eq("ativo", true)
      .maybeSingle();

  if (error) {
    console.error(
      "Erro ao buscar local:",
      error
    );

    throw new Error(error.message);
  }

  return normalizarLocal(data);
}

/**
 * Cria ambiente, locatário ou equipamento.
 *
 * Para criar diretamente no andar:
 * localPaiId: null
 *
 * Para criar Fan coil dentro de Hall social:
 * localPaiId: id do Hall social
 */
export async function criarLocalMapa3D({
  andarId,
  localPaiId = null,
  nome,
  tipo = "Local",
  descricao = "",
  observacao = "",
  responsavel = "",
  status = "Ativo",
  ordem = 0,
}) {
  const payload = {
    andar_id: andarId,
    local_pai_id:
      normalizarIdOpcional(localPaiId),
    nome,
    tipo,
    descricao,
    observacao,
    responsavel,
    status,
    ordem: Number(ordem || 0),
    ativo: true,
    atualizado_em: agoraIso(),
  };

  const { data, error } =
    await supabase
      .from("mapa3d_locais")
      .insert(payload)
      .select()
      .single();

  if (error) {
    console.error(
      "Erro ao criar local:",
      error
    );

    throw new Error(error.message);
  }

  return normalizarLocal(data);
}

export async function atualizarLocalMapa3D(
  id,
  dados = {}
) {
  const payload = {
    atualizado_em: agoraIso(),
  };

  if (dados.andarId !== undefined) {
    payload.andar_id =
      dados.andarId;
  }

  if (dados.localPaiId !== undefined) {
    payload.local_pai_id =
      normalizarIdOpcional(
        dados.localPaiId
      );
  }

  if (dados.nome !== undefined) {
    payload.nome = dados.nome;
  }

  if (dados.tipo !== undefined) {
    payload.tipo = dados.tipo;
  }

  if (dados.descricao !== undefined) {
    payload.descricao =
      dados.descricao;
  }

  if (dados.observacao !== undefined) {
    payload.observacao =
      dados.observacao;
  }

  if (dados.responsavel !== undefined) {
    payload.responsavel =
      dados.responsavel;
  }

  if (dados.status !== undefined) {
    payload.status =
      dados.status;
  }

  if (dados.ordem !== undefined) {
    payload.ordem =
      Number(dados.ordem || 0);
  }

  if (dados.ativo !== undefined) {
    payload.ativo =
      Boolean(dados.ativo);
  }

  const { data, error } =
    await supabase
      .from("mapa3d_locais")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

  if (error) {
    console.error(
      "Erro ao atualizar local:",
      error
    );

    throw new Error(error.message);
  }

  return normalizarLocal(data);
}

/**
 * Retorna todos os descendentes de um ambiente.
 *
 * Exemplo:
 * Hall social
 * └── Fan coil
 *     └── Motor
 */
export function obterIdsDescendentesLocaisMapa3D(
  locais = [],
  localPaiId
) {
  const ids = [];

  function percorrer(paiId) {
    locais
      .filter(
        (local) =>
          local.localPaiId === paiId
      )
      .forEach((filho) => {
        ids.push(filho.id);
        percorrer(filho.id);
      });
  }

  percorrer(localPaiId);

  return ids;
}

/**
 * Exclusão lógica do ambiente selecionado e de seus itens internos.
 *
 * Assim, ao remover Hall social, um Fan coil vinculado a ele
 * não fica solto no sistema.
 */
export async function excluirLocalMapa3D(id) {
  const locaisAtivos =
    await listarLocaisMapa3D();

  const descendentes =
    obterIdsDescendentesLocaisMapa3D(
      locaisAtivos,
      id
    );

  const idsParaDesativar = [
    id,
    ...descendentes,
  ];

  const { error } =
    await supabase
      .from("mapa3d_locais")
      .update({
        ativo: false,
        atualizado_em: agoraIso(),
      })
      .in("id", idsParaDesativar);

  if (error) {
    console.error(
      "Erro ao excluir ambiente e itens internos:",
      error
    );

    throw new Error(error.message);
  }

  return {
    sucesso: true,
    idsDesativados:
      idsParaDesativar,
  };
}

/**
 * Monta uma árvore pronta para renderização.
 *
 * Entrada:
 * lista simples de locais
 *
 * Saída:
 * [
 *   {
 *     nome: "Hall social",
 *     filhos: [
 *       {
 *         nome: "Fan coil",
 *         filhos: []
 *       }
 *     ]
 *   }
 * ]
 */
export function montarArvoreLocaisMapa3D(
  locais = []
) {
  const mapa =
    new Map();

  const raizes = [];

  ordenarLocais(locais)
    .forEach((local) => {
      mapa.set(
        local.id,
        {
          ...local,
          filhos: [],
        }
      );
    });

  mapa.forEach((local) => {
    if (
      local.localPaiId &&
      mapa.has(local.localPaiId)
    ) {
      mapa
        .get(local.localPaiId)
        .filhos
        .push(local);

      return;
    }

    raizes.push(local);
  });

  function ordenarRecursivamente(lista) {
    return ordenarLocais(lista)
      .map((local) => ({
        ...local,
        filhos:
          ordenarRecursivamente(
            local.filhos || []
          ),
      }));
  }

  return ordenarRecursivamente(
    raizes
  );
}

/**
 * Retorna o caminho completo do item.
 *
 * Exemplo:
 * [
 *   Hall social,
 *   Fan coil,
 *   Motor
 * ]
 */
export function montarTrilhaLocalMapa3D(
  locais = [],
  localId
) {
  const mapa =
    new Map(
      locais.map((local) => [
        local.id,
        local,
      ])
    );

  const trilha = [];

  let atual =
    mapa.get(localId);

  const idsVisitados =
    new Set();

  while (
    atual &&
    !idsVisitados.has(atual.id)
  ) {
    idsVisitados.add(
      atual.id
    );

    trilha.unshift(
      atual
    );

    atual =
      atual.localPaiId
        ? mapa.get(
            atual.localPaiId
          )
        : null;
  }

  return trilha;
}

// =========================================================
// ITENS EXTERNOS
// =========================================================

export async function listarItensExternosMapa3D() {
  const { data, error } =
    await supabase
      .from("mapa3d_itens_externos")
      .select("*")
      .eq("ativo", true)
      .order("ordem", {
        ascending: true,
      })
      .order("nome", {
        ascending: true,
      });

  if (error) {
    console.error(
      "Erro ao listar itens externos:",
      error
    );

    throw new Error(error.message);
  }

  return (data || [])
    .map(normalizarItemExterno)
    .filter(Boolean);
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
  largura = 0.8,
  altura = 0.6,
  profundidade = 0.8,
  ordem = 99,
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
    largura: Number(largura || 0.8),
    altura: Number(altura || 0.6),
    profundidade:
      Number(profundidade || 0.8),
    ordem: Number(ordem || 99),
    ativo: true,
    atualizado_em: agoraIso(),
  };

  const { data, error } =
    await supabase
      .from("mapa3d_itens_externos")
      .insert(payload)
      .select()
      .single();

  if (error) {
    console.error(
      "Erro ao criar item externo:",
      error
    );

    throw new Error(error.message);
  }

  return normalizarItemExterno(data);
}

export async function atualizarItemExternoMapa3D(
  id,
  dados = {}
) {
  const payload = {
    atualizado_em: agoraIso(),
  };

  if (dados.nome !== undefined) {
    payload.nome = dados.nome;
  }

  if (dados.categoria !== undefined) {
    payload.categoria =
      dados.categoria;
  }

  if (dados.lado !== undefined) {
    payload.lado = dados.lado;
  }

  if (dados.tipoVisual !== undefined) {
    payload.tipo_visual =
      dados.tipoVisual;
  }

  if (dados.modoImplantacao !== undefined) {
    payload.modo_implantacao =
      dados.modoImplantacao;
  }

  if (dados.descricao !== undefined) {
    payload.descricao =
      dados.descricao;
  }

  if (dados.observacao !== undefined) {
    payload.observacao =
      dados.observacao;
  }

  if (dados.status !== undefined) {
    payload.status =
      dados.status;
  }

  if (dados.cor !== undefined) {
    payload.cor = dados.cor;
  }

  if (dados.x !== undefined) {
    payload.x =
      Number(dados.x || 0);
  }

  if (dados.y !== undefined) {
    payload.y =
      Number(dados.y || 0);
  }

  if (dados.z !== undefined) {
    payload.z =
      Number(dados.z || 0);
  }

  if (dados.largura !== undefined) {
    payload.largura =
      Number(dados.largura || 0.8);
  }

  if (dados.altura !== undefined) {
    payload.altura =
      Number(dados.altura || 0.6);
  }

  if (dados.profundidade !== undefined) {
    payload.profundidade =
      Number(dados.profundidade || 0.8);
  }

  if (dados.ordem !== undefined) {
    payload.ordem =
      Number(dados.ordem || 99);
  }

  if (dados.ativo !== undefined) {
    payload.ativo =
      Boolean(dados.ativo);
  }

  const { data, error } =
    await supabase
      .from("mapa3d_itens_externos")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

  if (error) {
    console.error(
      "Erro ao atualizar item externo:",
      error
    );

    throw new Error(error.message);
  }

  return normalizarItemExterno(data);
}

export async function excluirItemExternoMapa3D(id) {
  const { error } =
    await supabase
      .from("mapa3d_itens_externos")
      .update({
        ativo: false,
        atualizado_em: agoraIso(),
      })
      .eq("id", id);

  if (error) {
    console.error(
      "Erro ao excluir item externo:",
      error
    );

    throw new Error(error.message);
  }

  return true;
}

// =========================================================
// ARQUIVOS
// =========================================================

export async function listarArquivosMapa3DPorEntidade(
  entidadeTipo,
  entidadeId
) {
  const { data, error } =
    await supabase
      .from("mapa3d_arquivos")
      .select("*")
      .eq("entidade_tipo", entidadeTipo)
      .eq("entidade_id", entidadeId)
      .eq("ativo", true)
      .order("criado_em", {
        ascending: false,
      });

  if (error) {
    console.error(
      "Erro ao listar arquivos:",
      error
    );

    throw new Error(error.message);
  }

  return (data || [])
    .map(normalizarArquivo)
    .filter(Boolean);
}

/**
 * O mesmo método atende:
 *
 * entidadeTipo: "andar"
 * entidadeTipo: "item_externo"
 * entidadeTipo: "local"
 *
 * Dessa forma, Hall social e Fan coil terão arquivos próprios.
 */
export async function criarArquivoMapa3D({
  entidadeTipo,
  entidadeId,
  tipoArquivo = "arquivo",
  legenda = "",
  arquivo,
}) {
  const upload =
    await enviarArquivoStorage(
      arquivo,
      `${entidadeTipo}/${entidadeId}`
    );

  const payload = {
    entidade_tipo: entidadeTipo,
    entidade_id: entidadeId,
    tipo_arquivo: tipoArquivo,
    nome: upload.nome,
    caminho_storage:
      upload.caminhoStorage,
    url_publica:
      upload.urlPublica,
    mime_type:
      upload.mimeType,
    legenda,
    ativo: true,
    atualizado_em: agoraIso(),
  };

  const { data, error } =
    await supabase
      .from("mapa3d_arquivos")
      .insert(payload)
      .select()
      .single();

  if (error) {
    console.error(
      "Erro ao cadastrar arquivo:",
      error
    );

    throw new Error(error.message);
  }

  return normalizarArquivo(data);
}

export async function excluirArquivoMapa3D(
  id,
  caminhoStorage
) {
  if (caminhoStorage) {
    const { error: storageError } =
      await supabase.storage
        .from(BUCKET_MAPA3D)
        .remove([
          caminhoStorage,
        ]);

    if (storageError) {
      console.warn(
        "Aviso ao excluir arquivo físico:",
        storageError.message
      );
    }
  }

  const { error } =
    await supabase
      .from("mapa3d_arquivos")
      .update({
        ativo: false,
        atualizado_em: agoraIso(),
      })
      .eq("id", id);

  if (error) {
    console.error(
      "Erro ao desativar arquivo:",
      error
    );

    throw new Error(error.message);
  }

  return true;
}

// =========================================================
// PROTEÇÃO POR SENHA
// =========================================================

export async function validarSenhaExclusaoMapa3D(
  senha
) {
  const { data, error } =
    await supabase.rpc(
      "validar_senha_exclusao_mapa3d",
      {
        senha_informada: senha,
      }
    );

  if (error) {
    console.error(
      "Erro ao validar senha:",
      error
    );

    throw new Error(error.message);
  }

  return data === true;
}

export async function excluirArquivoProtegidoMapa3D(
  id,
  caminhoStorage,
  senha
) {
  const senhaValida =
    await validarSenhaExclusaoMapa3D(
      senha
    );

  if (!senhaValida) {
    throw new Error(
      "Senha incorreta."
    );
  }

  return excluirArquivoMapa3D(
    id,
    caminhoStorage
  );
}
