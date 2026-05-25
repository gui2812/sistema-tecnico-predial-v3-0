import { supabase } from "./supabaseClient";

function numeroSeguro(valor) {
  const n = Number(valor || 0);
  return Number.isFinite(n) ? n : 0;
}

function recalcularResumo(linhas = []) {
  const lista = Array.isArray(linhas) ? linhas : [];

  const linhasComConsumo = lista.filter((linha) => numeroSeguro(linha.consumo) > 0);

  const total = lista.reduce((soma, linha) => {
    return soma + numeroSeguro(linha.consumo);
  }, 0);

  const quantidade = lista.length;

  const maior = linhasComConsumo.length
    ? linhasComConsumo.reduce((a, b) =>
        numeroSeguro(b.consumo) > numeroSeguro(a.consumo) ? b : a
      )
    : null;

  const menor = linhasComConsumo.length
    ? linhasComConsumo.reduce((a, b) =>
        numeroSeguro(b.consumo) < numeroSeguro(a.consumo) ? b : a
      )
    : null;

  return {
    total,
    quantidade,
    media: linhasComConsumo.length ? total / linhasComConsumo.length : 0,
    maior: maior
      ? {
          unidade: maior.unidade,
          consumo: numeroSeguro(maior.consumo),
        }
      : null,
    menor: menor
      ? {
          unidade: menor.unidade,
          consumo: numeroSeguro(menor.consumo),
        }
      : null,
  };
}

function normalizarMedicao(row) {
  if (!row) return null;

  const linhas = Array.isArray(row.linhas) ? row.linhas : [];

  // Sempre recalcula pelas linhas para evitar resumo antigo salvo no banco
  const resumoCalculado = recalcularResumo(linhas);

  return {
    id: row.id,
    mes: row.data_anterior || row.mes || "",
    dataMedicao: row.data_medicao || "",
    anterior: row.anterior || "",
    atual: row.atual || "",
    linhas,
    resumo: resumoCalculado,
    analise: Array.isArray(row.analise) ? row.analise : [],
    criadoPor: row.criado_por || "",
    criadoPorId: row.criado_por_id || "",
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
  };
}

export async function listarMedicoesLocatariosSupabase() {
  const { data, error } = await supabase
    .from("medicoes_locatarios")
    .select("*")
    .order("data_medicao", { ascending: false })
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("Erro ao listar medições dos locatários:", error);
    throw new Error(error.message);
  }

  return (data || []).map(normalizarMedicao).filter(Boolean);
}

export async function criarMedicaoLocatariosSupabase({
  mes = "",
  dataMedicao = "",
  anterior = "",
  atual = "",
  linhas = [],
  resumo = {},
  analise = [],
  criadoPor = "",
  criadoPorId = null,
}) {
  const linhasTratadas = Array.isArray(linhas) ? linhas : [];

  // Recalcula antes de salvar para garantir que o Supabase receba o total correto
  const resumoCalculado = recalcularResumo(linhasTratadas);

  const maior = resumoCalculado.maior || null;
  const menor = resumoCalculado.menor || null;

  const payload = {
    mes,
    data_anterior: mes || null,
    data_medicao: dataMedicao || null,
    anterior,
    atual,
    total: numeroSeguro(resumoCalculado.total),
    quantidade: numeroSeguro(resumoCalculado.quantidade),
    media: numeroSeguro(resumoCalculado.media),
    maior_unidade: maior?.unidade || null,
    maior_consumo: numeroSeguro(maior?.consumo),
    menor_unidade: menor?.unidade || null,
    menor_consumo: numeroSeguro(menor?.consumo),
    linhas: linhasTratadas,
    resumo: resumoCalculado,
    analise: analise || [],
    criado_por: criadoPor || "",
    criado_por_id: criadoPorId || null,
    atualizado_em: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("medicoes_locatarios")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Erro ao salvar medição dos locatários:", error);
    throw new Error(error.message);
  }

  return normalizarMedicao(data);
}

export async function excluirMedicaoLocatariosSupabase(id) {
  const { error } = await supabase
    .from("medicoes_locatarios")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao excluir medição dos locatários:", error);
    throw new Error(error.message);
  }

  return true;
}
