import { supabase } from "./supabaseClient";

export async function buscarSenhaExclusao(){

    const {data,error}=await supabase

    .from("configuracoes")

    .select("valor")

    .eq("chave","senha_exclusao")

    .single();


    if(error) throw error;

    return data.valor;

}



export async function alterarSenhaExclusao(novaSenha){

    const {error}=await supabase

    .from("configuracoes")

    .update({

        valor:novaSenha,

        atualizado_em:new Date()

    })

    .eq("chave","senha_exclusao");


    if(error) throw error;

}
