import { supabase } from "./supabaseClient";

function uuidOuNulo(valor) {
  const texto = String(valor || "").trim();

  if (!texto) return null;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidRegex.test(texto) ? texto : null;
}

function dataOuNulo(valor) {
  const texto = String(valor || "").trim();
  return texto ? texto : null;
}

function parseBRNumber(valor) {
  if (valor === null || valor === undefined || valor === "") return null;

  if (typeof valor === "number") return valor;

  const texto = String(valor)
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const numero = Number(texto);

  return Number.isFinite(numero) ? numero : null;
}

export async function listarSolicitacoesSupabase() {
  const { data, error } = await supabase
    .from("solicitacoes_material")
    .select(`
      *,
      itens:solicitacao_itens(*)
    `)
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("Erro ao listar solicitações:", error);
    return [];
  }

  return data || [];
}

export async function criarSolicitacaoSupabase(solicitacao, itens = []) {
  const payloadSolicitacao = {
    solicitante_id: uuidOuNulo(solicitacao.solicitante_id),
    solicitante_nome: solicitacao.solicitante_nome,
    setor: solicitacao.setor,
    area_solicitante: solicitacao.area_solicitante,
    prioridade: solicitacao.prioridade || "Média",
    observacao_geral: solicitacao.observacao_geral || "",
    status: "Nova",
  };

  const { data: solicitacaoCriada, error: erroSolicitacao } = await supabase
    .from("solicitacoes_material")
    .insert(payloadSolicitacao)
    .select()
    .single();

  if (erroSolicitacao) {
    console.error("Erro ao criar solicitação:", erroSolicitacao);
    throw new Error(erroSolicitacao.message);
  }

  if (itens.length > 0) {
    const itensPayload = itens.map((item) => ({
      solicitacao_id: solicitacaoCriada.id,
      quantidade: item.quantidade || null,
      unidade: item.unidade || "",
      descricao: item.descricao,
      marca_modelo: item.marca_modelo || item.marcaModelo || item.marca || "",
      local_aplicacao:
        item.local_aplicacao || item.localAplicacao || item.local || "",
      urgencia: item.urgencia || "",
      observacao: item.observacao || "",
      status: item.status || "Nova",
    }));

    const { error: erroItens } = await supabase
      .from("solicitacao_itens")
      .insert(itensPayload);

    if (erroItens) {
      console.error("Erro ao criar itens:", erroItens);
      throw new Error(erroItens.message);
    }
  }

  return solicitacaoCriada;
}

export async function atualizarSolicitacaoSupabase(id, patch) {
  const payload = {
    solicitante_nome: patch.solicitante_nome,
    setor: patch.setor,
    area_solicitante: patch.area_solicitante,
    prioridade: patch.prioridade,
    observacao_geral: patch.observacao_geral,
    status: patch.status,
    atualizado_em: new Date().toISOString(),
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  const { data, error } = await supabase
    .from("solicitacoes_material")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar solicitação:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function atualizarItemSolicitacaoSupabase(id, patch) {
  const payload = {
    quantidade: patch.quantidade,
    unidade: patch.unidade,
    descricao: patch.descricao,
    marca_modelo: patch.marca_modelo ?? patch.marcaModelo ?? patch.marca,
    local_aplicacao:
      patch.local_aplicacao ?? patch.localAplicacao ?? patch.local,
    urgencia: patch.urgencia,
    observacao: patch.observacao,
    status: patch.status,
    motivo_reprovacao: patch.motivo_reprovacao ?? patch.motivoReprovacao,

    valor_unitario:
      patch.valor_unitario !== undefined || patch.valorUnitario !== undefined
        ? parseBRNumber(patch.valor_unitario ?? patch.valorUnitario)
        : undefined,

    fornecedor: patch.fornecedor,
    numero_nota_fiscal:
      patch.numero_nota_fiscal ?? patch.numeroNotaFiscal ?? patch.notaFiscal,
    recebido_por: patch.recebido_por ?? patch.recebidoPor,
    data_recebimento: dataOuNulo(
      patch.data_recebimento ?? patch.dataRecebimento
    ),
    observacao_recebimento:
      patch.observacao_recebimento ??
      patch.obsRecebimento ??
      patch.observacaoRecebimento,
    enviado_malote:
      patch.enviado_malote ?? patch.enviadoMalote ?? patch.maloteEnviado,
    data_envio_malote: dataOuNulo(
      patch.data_envio_malote ?? patch.dataEnvioMalote ?? patch.dataMalote
    ),
    atualizado_por: patch.atualizado_por ?? patch.atualizadoPor,
    atualizado_em: new Date().toISOString(),
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  const { data, error } = await supabase
    .from("solicitacao_itens")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar item:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function atualizarItensEmLoteSupabase(ids, patch) {
  if (!ids || ids.length === 0) return [];

  const payload = {
    status: patch.status,
    motivo_reprovacao: patch.motivo_reprovacao ?? patch.motivoReprovacao,
    fornecedor: patch.fornecedor,

    valor_unitario:
      patch.valor_unitario !== undefined || patch.valorUnitario !== undefined
        ? parseBRNumber(patch.valor_unitario ?? patch.valorUnitario)
        : undefined,

    recebido_por: patch.recebido_por ?? patch.recebidoPor,
    data_recebimento: dataOuNulo(
      patch.data_recebimento ?? patch.dataRecebimento
    ),
    observacao_recebimento:
      patch.observacao_recebimento ??
      patch.obsRecebimento ??
      patch.observacaoRecebimento,
    atualizado_por: patch.atualizado_por ?? patch.atualizadoPor,
    atualizado_em: new Date().toISOString(),
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined || payload[key] === "") delete payload[key];
  });

  const { data, error } = await supabase
    .from("solicitacao_itens")
    .update(payload)
    .in("id", ids)
    .select();

  if (error) {
    console.error("Erro ao atualizar itens em lote:", error);
    throw new Error(error.message);
  }

  return data || [];
}

export async function verificarSenhaUsuarioSupabase(usuario, senha) {
  const senhaDigitada = String(senha || "").trim();

  if (!senhaDigitada) return false;

  const { data, error } = await supabase
    .from("usuarios_app")
    .select("id, usuario, perfil, ativo")
    .eq("senha", senhaDigitada)
    .eq("ativo", true)
    .in("perfil", ["admin", "administrador", "Administrador", "ADMIN"]);

  if (error) {
    console.error("Erro ao validar senha do administrador:", error);
    return false;
  }

  return Array.isArray(data) && data.length > 0;
}

export async function excluirItemSolicitacaoSupabase(id) {
  const { error } = await supabase
    .from("solicitacao_itens")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir item:", error);
    throw new Error(error.message);
  }

  return true;
}

export async function excluirSolicitacaoSupabase(id) {
  const { error } = await supabase
    .from("solicitacoes_material")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir solicitação:", error);
    throw new Error(error.message);
  }

  return true;
}
