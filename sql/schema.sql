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
  pontos_proficiencia integer not null default 2,
  criado_em timestamp with time zone default now()
);

alter table if exists public.personagens
  add column if not exists pontos_proficiencia integer default 2;

update public.personagens
set pontos_proficiencia = 2
where pontos_proficiencia is null;

alter table if exists public.personagens
  alter column pontos_proficiencia set not null,
  alter column pontos_proficiencia set default 2;

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
  proficiente boolean not null default false,
  ordem integer not null default 0
);

alter table if exists public.pericias
  add column if not exists proficiente boolean default false;

update public.pericias
set proficiente = false
where proficiente is null;

alter table if exists public.pericias
  alter column proficiente set not null,
  alter column proficiente set default false;

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

-- Solicitações de rolagem (Mestre pede uma rolagem específica a um jogador)
create table if not exists public.solicitacoes_rolagem (
  id uuid primary key default uuid_generate_v4(),
  mundo_id uuid references mundos(id) on delete cascade not null,
  personagem_id uuid references personagens(id) on delete cascade not null,
  tipo text not null check (tipo in ('acerto', 'pericia', 'dano')),
  status text not null default 'pendente' check (status in ('pendente', 'concluida', 'cancelada')),
  resultado_total integer,
  resultado_texto text,
  criado_em timestamp with time zone default now(),
  concluido_em timestamp with time zone
);

-- Anotações pessoais do personagem (bloco de notas)
alter table if exists public.personagens
  add column if not exists notas text default '';

update public.personagens
set notas = ''
where notas is null;

alter table if exists public.personagens
  alter column notas set not null,
  alter column notas set default '';

-- Inventário (9 compartimentos por personagem)
create table if not exists public.itens_inventario (
  id uuid primary key default uuid_generate_v4(),
  personagem_id uuid references personagens(id) on delete cascade not null,
  slot integer not null check (slot >= 0 and slot <= 8),
  nome text not null default '',
  unique (personagem_id, slot)
);

-- Desenhos no mapa (anotações livres a lápis, visíveis pra todo mundo na mesa)
create table if not exists public.desenhos_mapa (
  id uuid primary key default uuid_generate_v4(),
  mundo_id uuid references mundos(id) on delete cascade not null,
  pontos jsonb not null,
  cor text not null default '#000000',
  espessura integer not null default 3,
  criado_em timestamp with time zone default now()
);

-- Necessário para que eventos de DELETE filtrados por mundo_id (usado por
-- Ctrl+Z e "Limpar desenhos") cheguem via Realtime a todos os clientes -
-- sem isso o Postgres não tem os dados da linha apagada pra avaliar o filtro.
alter table if exists public.desenhos_mapa replica identity full;

-- RLS
alter table if exists mundos enable row level security;
alter table if exists personagens enable row level security;
alter table if exists atributos enable row level security;
alter table if exists barras_status enable row level security;
alter table if exists pericias enable row level security;
alter table if exists habilidades enable row level security;
alter table if exists solicitacoes_rolagem enable row level security;
alter table if exists itens_inventario enable row level security;
alter table if exists desenhos_mapa enable row level security;

drop policy if exists "acesso_total_mundos" on mundos;
drop policy if exists "acesso_total_personagens" on personagens;
drop policy if exists "acesso_total_atributos" on atributos;
drop policy if exists "acesso_total_barras" on barras_status;
drop policy if exists "acesso_total_pericias" on pericias;
drop policy if exists "acesso_total_habilidades" on habilidades;
drop policy if exists "acesso_total_solicitacoes_rolagem" on solicitacoes_rolagem;
drop policy if exists "acesso_total_itens_inventario" on itens_inventario;
drop policy if exists "acesso_total_desenhos_mapa" on desenhos_mapa;

create policy "acesso_total_mundos" on mundos for all using (true) with check (true);
create policy "acesso_total_personagens" on personagens for all using (true) with check (true);
create policy "acesso_total_atributos" on atributos for all using (true) with check (true);
create policy "acesso_total_barras" on barras_status for all using (true) with check (true);
create policy "acesso_total_pericias" on pericias for all using (true) with check (true);
create policy "acesso_total_habilidades" on habilidades for all using (true) with check (true);
create policy "acesso_total_solicitacoes_rolagem" on solicitacoes_rolagem for all using (true) with check (true);
create policy "acesso_total_itens_inventario" on itens_inventario for all using (true) with check (true);
create policy "acesso_total_desenhos_mapa" on desenhos_mapa for all using (true) with check (true);

-- Realtime
do $$
begin
  alter publication supabase_realtime add table mundos;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table personagens;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table atributos;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table barras_status;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table pericias;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table habilidades;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table solicitacoes_rolagem;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table itens_inventario;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table desenhos_mapa;
exception when duplicate_object then null;
end $$;
