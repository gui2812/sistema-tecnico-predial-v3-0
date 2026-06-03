begin;

alter table public.mapa3d_andares
  add column if not exists codigo_projeto text default '',
  add column if not exists planta_url text default '',
  add column if not exists categoria text default '',
  add column if not exists destaque text default '',
  add column if not exists altura_visual numeric default 1;

create index if not exists mapa3d_andares_ordem_idx
  on public.mapa3d_andares (ordem);

create index if not exists mapa3d_locais_andar_id_idx
  on public.mapa3d_locais (andar_id);

update public.mapa3d_andares
set
  nome = '1º Pav. Técnico',
  categoria = 'tecnico',
  codigo_projeto = '2446-AR-PE-007-R04',
  destaque = 'Primeiro pavimento técnico.',
  observacao = 'Áreas técnicas e apoio operacional.',
  altura_visual = 0.95,
  cor = '#0369a1',
  atualizado_em = now()
where ordem = 1;

update public.mapa3d_andares
set
  nome = '2º Pav. Técnico',
  categoria = 'tecnico',
  codigo_projeto = '2446-AR-PE-008-R02',
  destaque = 'Segundo pavimento técnico.',
  observacao = 'Geradores, elétrica, automação e áreas técnicas.',
  altura_visual = 0.95,
  cor = '#0369a1',
  atualizado_em = now()
where ordem = 2;

with estrutura (
  nome,
  ordem,
  altura,
  altura_visual,
  cor,
  categoria,
  codigo_projeto,
  observacao,
  destaque
) as (
  values
    ('5º Subsolo', -5, 1, 0.78, '#334155', 'subsolo', '2446-AR-PE-001-R04', 'Estacionamento e áreas técnicas.', 'Planta arquitetônica do 5º subsolo.'),
    ('4º Subsolo', -4, 1, 0.78, '#334155', 'subsolo', '2446-AR-PE-002-R03', 'Estacionamento e áreas técnicas.', 'Planta arquitetônica do 4º subsolo.'),
    ('3º Subsolo', -3, 1, 0.78, '#334155', 'subsolo', '2446-AR-PE-003-R03', 'Estacionamento e áreas técnicas.', 'Planta arquitetônica do 3º subsolo.'),
    ('2º Subsolo', -2, 1, 0.78, '#334155', 'subsolo', '2446-AR-PE-004-R04', 'Estacionamento e áreas técnicas.', 'Planta arquitetônica do 2º subsolo.'),
    ('1º Subsolo', -1, 1, 0.82, '#334155', 'subsolo', '2446-AR-PE-005-R05', 'Estacionamento e áreas técnicas.', 'Planta arquitetônica do 1º subsolo.'),
    ('Térreo', 0, 1, 1.38, '#0f766e', 'terreo', '2446-AR-PE-006-R18', 'Implantação, lobby, recepção, auditório e acessos.', 'Embasamento alto com pórtico principal.'),
    ('1º Pav. Técnico', 1, 1, 0.95, '#0369a1', 'tecnico', '2446-AR-PE-007-R04', 'Áreas técnicas e apoio operacional.', 'Primeiro pavimento técnico.'),
    ('2º Pav. Técnico', 2, 1, 0.95, '#0369a1', 'tecnico', '2446-AR-PE-008-R02', 'Geradores, elétrica, automação e áreas técnicas.', 'Segundo pavimento técnico.'),
    ('3º Andar', 3, 1, 0.82, '#2563eb', 'comercial', '2446-AR-PE-009-R01', 'Pavimento comercial.', 'Torre corporativa envidraçada.'),
    ('4º Andar', 4, 1, 0.82, '#2563eb', 'comercial', '2446-AR-PE-009-R01', 'Pavimento comercial.', 'Torre corporativa envidraçada.'),
    ('5º Andar', 5, 1, 0.82, '#2563eb', 'comercial', '2446-AR-PE-009-R01', 'Pavimento comercial.', 'Torre corporativa envidraçada.'),
    ('6º Andar', 6, 1, 0.82, '#2563eb', 'comercial', '2446-AR-PE-009-R01', 'Pavimento comercial.', 'Torre corporativa envidraçada.'),
    ('7º Andar', 7, 1, 0.82, '#2563eb', 'comercial', '2446-AR-PE-009-R01', 'Pavimento comercial.', 'Torre corporativa envidraçada.'),
    ('8º Andar', 8, 1, 0.82, '#2563eb', 'comercial', '2446-AR-PE-009-R01', 'Pavimento comercial.', 'Torre corporativa envidraçada.'),
    ('9º Andar', 9, 1, 0.82, '#2563eb', 'comercial', '2446-AR-PE-009-R01', 'Pavimento comercial.', 'Torre corporativa envidraçada.'),
    ('10º Andar', 10, 1, 0.82, '#2563eb', 'comercial', '2446-AR-PE-009-R01', 'Pavimento comercial.', 'Torre corporativa envidraçada.'),
    ('11º Andar', 11, 1, 0.82, '#2563eb', 'comercial', '2446-AR-PE-009-R01', 'Pavimento comercial.', 'Torre corporativa envidraçada.'),
    ('12º Andar', 12, 1, 0.82, '#2563eb', 'comercial', '2446-AR-PE-009-R01', 'Pavimento comercial.', 'Torre corporativa envidraçada.'),
    ('13º Andar', 13, 1, 0.82, '#2563eb', 'comercial', '2446-AR-PE-009-R01', 'Pavimento comercial.', 'Torre corporativa envidraçada.'),
    ('14º Andar', 14, 1, 0.82, '#2563eb', 'comercial', '2446-AR-PE-010-R01', 'Pavimento comercial.', 'Torre corporativa envidraçada.'),
    ('15º Andar', 15, 1, 0.82, '#2563eb', 'comercial', '2446-AR-PE-010-R01', 'Pavimento comercial.', 'Torre corporativa envidraçada.'),
    ('16º Andar', 16, 1, 0.82, '#2563eb', 'comercial', '2446-AR-PE-011-R01', 'Último pavimento comercial.', 'Fechamento superior da torre corporativa.'),
    ('Cobertura', 17, 1, 0.78, '#7c3aed', 'cobertura', '2446-AR-PE-012-R06', 'Cobertura e áreas técnicas.', 'Laje de cobertura.'),
    ('Casa de Máquinas', 18, 1, 1.08, '#7c3aed', 'maquinas', '2446-AR-PE-013-R06', 'Casa de máquinas.', 'Volume técnico superior.'),
    ('Heliponto', 19, 1, 0.38, '#ea580c', 'heliponto', '2446-AR-PE-013-R06', 'Heliponto.', 'Topo do edifício.')
)
insert into public.mapa3d_andares (
  nome,
  ordem,
  altura,
  altura_visual,
  cor,
  categoria,
  codigo_projeto,
  observacao,
  destaque,
  ativo,
  atualizado_em
)
select
  estrutura.nome,
  estrutura.ordem,
  estrutura.altura,
  estrutura.altura_visual,
  estrutura.cor,
  estrutura.categoria,
  estrutura.codigo_projeto,
  estrutura.observacao,
  estrutura.destaque,
  true,
  now()
from estrutura
where not exists (
  select 1
  from public.mapa3d_andares existente
  where existente.ordem = estrutura.ordem
    and existente.ativo = true
);

commit;

insert into storage.buckets (
  id,
  name,
  public
)
values (
  'mapa3d-plantas',
  'mapa3d-plantas',
  true
)
on conflict (id)
do update set public = excluded.public;

drop policy if exists "mapa3d_plantas_public_select"
on storage.objects;

create policy "mapa3d_plantas_public_select"
on storage.objects
for select
to public
using (
  bucket_id = 'mapa3d-plantas'
);

drop policy if exists "mapa3d_plantas_public_insert"
on storage.objects;

create policy "mapa3d_plantas_public_insert"
on storage.objects
for insert
to public
with check (
  bucket_id = 'mapa3d-plantas'
);

drop policy if exists "mapa3d_plantas_public_update"
on storage.objects;

create policy "mapa3d_plantas_public_update"
on storage.objects
for update
to public
using (
  bucket_id = 'mapa3d-plantas'
)
with check (
  bucket_id = 'mapa3d-plantas'
);

drop policy if exists "mapa3d_plantas_public_delete"
on storage.objects;

create policy "mapa3d_plantas_public_delete"
on storage.objects
for delete
to public
using (
  bucket_id = 'mapa3d-plantas'
);
