import { supabase } from "./supabaseClient";

function normalizarMedicao(row) {
  if (!row) return null;

  const resumo = row.resumo || {
    total: Number(row.total || 0),
    quantidade: Number(row.quantidade || 0),
    media: Number(row.media || 0),
    maior: row.maior_unidade
      ? { unidade: row.maior_unidade, consumo: Number(row.maior_consumo || 0) }
      : null,
    menor: row.menor_unidade
      ? { unidade: row.menor_unidade, consumo: Number(row.menor_consumo || 0) }
      : null,
    linhas: row.linhas || [],
  };

  return {
    id: row.id,
    mes: row.data_anterior || row.mes || "",
    dataMedicao: row.data_medicao || "",
    anterior: row.anterior || "",
    atual: row.atual || "",
    linhas: Array.isArray(row.linhas) ? row.linhas : [],
    resumo,
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
  const maior = resumo?.maior || null;
  const menor = resumo?.menor || null;

  const payload = {
    mes,
    data_anterior: mes || null,
    data_medicao: dataMedicao || null,
    anterior,
    atual,
    total: Number(resumo?.total || 0),
    quantidade: Number(resumo?.quantidade || linhas?.length || 0),
    media: Number(resumo?.media || 0),
    maior_unidade: maior?.unidade || null,
    maior_consumo: Number(maior?.consumo || 0),
    menor_unidade: menor?.unidade || null,
    menor_consumo: Number(menor?.consumo || 0),
    linhas: linhas || [],
    resumo: resumo || {},
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
