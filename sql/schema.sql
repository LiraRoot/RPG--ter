-- Rode este script no SQL Editor do seu projeto Supabase.
-- Ele é seguro para rodar várias vezes e não apaga dados existentes.

create extension if not exists "uuid-ossp";

-- Mundos
create table if not exists public.mundos (
  id uuid primary key default uuid_generate_v4(),
  nome text not null default 'Novo mundo',
  mestre text not null default 'Sem mestre',
  imagem_url text,
  campanha_ativa boolean not null default false,
  criado_em timestamp with time zone default now()
);

alter table if exists public.mundos
  add column if not exists campanha_ativa boolean default false;

update public.mundos
set campanha_ativa = false
where campanha_ativa is null;

alter table if exists public.mundos
  alter column campanha_ativa set not null,
  alter column campanha_ativa set default false;

-- Personagens
create table if not exists public.personagens (
  id uuid primary key default uuid_generate_v4(),
  mundo_id uuid references mundos(id) on delete set null,
  nome text not null default 'Novo personagem',
  genero text not null default 'Elu' check (genero in ('Ele', 'Ela', 'Elu')),
  nivel integer not null default 1,
  imagem_url text,
  criado_em timestamp with time zone default now()
);

-- Atributos
create table if not exists public.atributos (
  id uuid primary key default uuid_generate_v4(),
  personagem_id uuid references personagens(id) on delete cascade not null,
  nome text not null,
  valor integer not null default 0,
  ordem integer not null default 0
);

-- Barras de status
create table if not exists public.barras_status (
  id uuid primary key default uuid_generate_v4(),
  personagem_id uuid references personagens(id) on delete cascade not null,
  nome text not null,
  valor_atual integer not null default 0,
  valor_maximo integer not null default 0,
  ordem integer not null default 0
);

-- Perícias
create table if not exists public.pericias (
  id uuid primary key default uuid_generate_v4(),
  personagem_id uuid references personagens(id) on delete cascade not null,
  atributo text not null,
  nome text not null,
  valor integer not null default 0,
  ordem integer not null default 0
);

-- Habilidades (campo seguro para versões novas e legadas)
create table if not exists public.habilidades (
  id uuid primary key default uuid_generate_v4(),
  personagem_id uuid references personagens(id) on delete cascade not null,
  nome text not null,
  descricao text default '',
  custo text default '',
  dano text default '',
  cooldown_turnos integer not null default 0,
  tipo text not null default 'ativa' check (tipo in ('ativa', 'passiva')),
  ordem integer not null default 0
);

alter table if exists public.habilidades
  add column if not exists custo text default '';

alter table if exists public.habilidades
  add column if not exists dano text default '';

alter table if exists public.habilidades
  add column if not exists cooldown_turnos integer default 0;

alter table if exists public.habilidades
  add column if not exists tipo text default 'ativa';

alter table if exists public.habilidades
  add column if not exists ordem integer default 0;

update public.habilidades
set cooldown_turnos = 0
where cooldown_turnos is null;

update public.habilidades
set tipo = 'ativa'
where tipo is null or tipo not in ('ativa', 'passiva');

alter table if exists public.habilidades
  alter column cooldown_turnos set default 0,
  alter column cooldown_turnos set not null,
  alter column tipo set default 'ativa',
  alter column tipo set not null;

-- RLS
alter table if exists mundos enable row level security;
alter table if exists personagens enable row level security;
alter table if exists atributos enable row level security;
alter table if exists barras_status enable row level security;
alter table if exists pericias enable row level security;
alter table if exists habilidades enable row level security;

drop policy if exists "acesso_total_mundos" on mundos;
drop policy if exists "acesso_total_personagens" on personagens;
drop policy if exists "acesso_total_atributos" on atributos;
drop policy if exists "acesso_total_barras" on barras_status;
drop policy if exists "acesso_total_pericias" on pericias;
drop policy if exists "acesso_total_habilidades" on habilidades;

create policy "acesso_total_mundos" on mundos for all using (true) with check (true);
create policy "acesso_total_personagens" on personagens for all using (true) with check (true);
create policy "acesso_total_atributos" on atributos for all using (true) with check (true);
create policy "acesso_total_barras" on barras_status for all using (true) with check (true);
create policy "acesso_total_pericias" on pericias for all using (true) with check (true);
create policy "acesso_total_habilidades" on habilidades for all using (true) with check (true);

-- Realtime
alter publication supabase_realtime add table if not exists mundos;
alter publication supabase_realtime add table if not exists personagens;
alter publication supabase_realtime add table if not exists atributos;
alter publication supabase_realtime add table if not exists barras_status;
alter publication supabase_realtime add table if not exists pericias;
alter publication supabase_realtime add table if not exists habilidades;
