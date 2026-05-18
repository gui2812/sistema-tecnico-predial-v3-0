import { supabase } from "./supabaseClient";

const BUCKET = "anexos-solicitacoes";

function limparNomeArquivo(nome = "") {
  return String(nome)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");
}

export async function listarAnexosItemSupabase(itemId) {
  if (!itemId) return [];

  const { data, error } = await supabase
    .from("anexos_solicitacoes")
    .select("*")
    .eq("item_id", itemId)
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("Erro ao listar anexos:", error);
    return [];
  }

  return data || [];
}

export async function uploadAnexoSolicitacaoSupabase({
  solicitacaoId,
  itemId,
  arquivo,
  categoria = "Anexo",
  observacao = "",
  enviadoPor = "",
}) {
  if (!arquivo) throw new Error("Nenhum arquivo selecionado.");
  if (!itemId) throw new Error("Item não informado.");

  const nomeSeguro = limparNomeArquivo(arquivo.name);
  const pastaSolicitacao = solicitacaoId || "sem-solicitacao";
  const pastaItem = itemId || "sem-item";

  const caminho = `${pastaSolicitacao}/${pastaItem}/${Date.now()}-${nomeSeguro}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, arquivo, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Erro ao enviar arquivo:", uploadError);
    throw new Error(uploadError.message);
  }

  const { data: publicData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(caminho);

  const urlPublica = publicData?.publicUrl || "";

  const payload = {
    solicitacao_id: solicitacaoId || null,
    item_id: itemId,
    nome_arquivo: arquivo.name,
    caminho_arquivo: caminho,
    url_publica: urlPublica,
    tipo_arquivo: arquivo.type || "",
    tamanho: arquivo.size || 0,
    categoria,
    observacao,
    enviado_por: enviadoPor,
  };

  const { data, error } = await supabase
    .from("anexos_solicitacoes")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Erro ao registrar anexo:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function excluirAnexoSolicitacaoSupabase(anexo) {
  if (!anexo?.id) return false;

  if (anexo.caminho_arquivo) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([anexo.caminho_arquivo]);

    if (storageError) {
      console.error("Erro ao remover arquivo do Storage:", storageError);
    }
  }

  const { error } = await supabase
    .from("anexos_solicitacoes")
    .delete()
    .eq("id", anexo.id);

  if (error) {
    console.error("Erro ao excluir anexo:", error);
    throw new Error(error.message);
  }

  return true;
}
