-- =========================================================
-- MAPA 3D V10
-- Proteção por senha para excluir fotos e plantas
-- Remoção do 13º andar
-- =========================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.mapa3d_configuracoes_seguras (
  chave text primary key,
  valor_hash text not null,
  atualizado_em timestamptz not null default now()
);

alter table public.mapa3d_configuracoes_seguras
enable row level security;

revoke all
on table public.mapa3d_configuracoes_seguras
from anon, authenticated;

insert into public.mapa3d_configuracoes_seguras (
  chave,
  valor_hash,
  atualizado_em
)
values (
  'senha_exclusao_arquivos',
  extensions.crypt(
    'TROQUE_AQUI_PARA_UMA_SENHA_FORTE',
    extensions.gen_salt('bf')
  ),
  now()
)
on conflict (chave)
do update set
  valor_hash = excluded.valor_hash,
  atualizado_em = now();

create or replace function public.validar_senha_exclusao_mapa3d(
  senha_informada text
)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.mapa3d_configuracoes_seguras
    where chave = 'senha_exclusao_arquivos'
      and valor_hash = extensions.crypt(
        coalesce(senha_informada, ''),
        valor_hash
      )
  );
$$;

revoke all
on function public.validar_senha_exclusao_mapa3d(text)
from public;

grant execute
on function public.validar_senha_exclusao_mapa3d(text)
to anon, authenticated;

-- O edifício não possui identificação de 13º andar.
update public.mapa3d_andares
set
  ativo = false,
  atualizado_em = now()
where ordem = 13
  and ativo = true;

-- Conferência
select
  nome,
  ordem,
  ativo
from public.mapa3d_andares
where ordem between 12 and 14
order by ordem;
