-- Rode este script no SQL Editor do seu projeto Supabase.
-- Ele é seguro para rodar várias vezes, sem quebrar por políticas ou tabelas duplicadas.

create extension if not exists "uuid-ossp";

-- Migração incremental para bancos já existentes
alter table if exists public.mundos
  add column if not exists campanha_ativa boolean not null default false;

update public.mundos
set campanha_ativa = false
where campanha_ativa is null;

-- Limpa o estado atual para iniciar sem conflitos no mesmo projeto
-- Se você ainda não cadastrou nada, isso não causa dano.
drop policy if exists "acesso_total_mundos" on mundos;
drop policy if exists "acesso_total_personagens" on personagens;
drop policy if exists "acesso_total_atributos" on atributos;
drop policy if exists "acesso_total_barras" on barras_status;
drop policy if exists "acesso_total_pericias" on pericias;
drop policy if exists "acesso_total_habilidades" on habilidades;

drop table if exists habilidades cascade;
drop table if exists pericias cascade;
drop table if exists barras_status cascade;
drop table if exists atributos cascade;
drop table if exists personagens cascade;
drop table if exists mundos cascade;

-- Mundos / Mesas
create table mundos (
  id uuid primary key default uuid_generate_v4(),
  nome text not null default 'Novo mundo',
  mestre text not null default 'Sem mestre',
  imagem_url text,
  campanha_ativa boolean not null default false,
  criado_em timestamp with time zone default now()
);

-- Personagens
create table personagens (
  id uuid primary key default uuid_generate_v4(),
  mundo_id uuid references mundos(id) on delete set null,
  nome text not null default 'Novo personagem',
  genero text not null default 'Elu' check (genero in ('Ele', 'Ela', 'Elu')),
  nivel integer not null default 1,
  imagem_url text,
  criado_em timestamp with time zone default now()
);

-- Atributos (Força, Destreza, etc.)
create table atributos (
  id uuid primary key default uuid_generate_v4(),
  personagem_id uuid references personagens(id) on delete cascade not null,
  nome text not null,
  valor integer not null default 0,
  ordem integer not null default 0
);

-- Barras de status (Vida, Energia, Mana etc.)
create table barras_status (
  id uuid primary key default uuid_generate_v4(),
  personagem_id uuid references personagens(id) on delete cascade not null,
  nome text not null,
  valor_atual integer not null default 0,
  valor_maximo integer not null default 0,
  ordem integer not null default 0
);

-- Perícias vinculadas aos atributos principais do personagem
create table pericias (
  id uuid primary key default uuid_generate_v4(),
  personagem_id uuid references personagens(id) on delete cascade not null,
  atributo text not null,
  nome text not null,
  valor integer not null default 0,
  ordem integer not null default 0
);

-- Habilidades
create table habilidades (
  id uuid primary key default uuid_generate_v4(),
  personagem_id uuid references personagens(id) on delete cascade not null,
  nome text not null,
  descricao text default '',
  custo text default '',
  ordem integer not null default 0
);

-- RLS: permite acesso total para quem usar a chave anon do projeto
alter table mundos enable row level security;
alter table personagens enable row level security;
alter table atributos enable row level security;
alter table barras_status enable row level security;
alter table pericias enable row level security;
alter table habilidades enable row level security;

create policy "acesso_total_mundos" on mundos for all using (true) with check (true);
create policy "acesso_total_personagens" on personagens for all using (true) with check (true);
create policy "acesso_total_atributos" on atributos for all using (true) with check (true);
create policy "acesso_total_barras" on barras_status for all using (true) with check (true);
create policy "acesso_total_pericias" on pericias for all using (true) with check (true);
create policy "acesso_total_habilidades" on habilidades for all using (true) with check (true);

-- Realtime: habilita streaming em tempo real
alter publication supabase_realtime add table if not exists mundos;
alter publication supabase_realtime add table if not exists personagens;
alter publication supabase_realtime add table if not exists atributos;
alter publication supabase_realtime add table if not exists barras_status;
alter publication supabase_realtime add table if not exists pericias;
alter publication supabase_realtime add table if not exists habilidades;
