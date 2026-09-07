-- Rode este script no SQL Editor do seu projeto Supabase
-- (Dashboard do Supabase > SQL Editor > New query > colar e rodar)

create extension if not exists "uuid-ossp";

-- Personagens
create table if not exists personagens (
  id uuid primary key default uuid_generate_v4(),
  nome text not null default 'Novo personagem',
  genero text not null default 'Elu' check (genero in ('Ele', 'Ela', 'Elu')),
  imagem_url text,
  criado_em timestamp with time zone default now()
);

-- Atributos (Força, Destreza, etc. - lista livre por personagem)
create table if not exists atributos (
  id uuid primary key default uuid_generate_v4(),
  personagem_id uuid references personagens(id) on delete cascade not null,
  nome text not null,
  valor integer not null default 0,
  ordem integer not null default 0
);

-- Barras de status (Vida, Energia, Mana etc. - lista livre por personagem)
create table if not exists barras_status (
  id uuid primary key default uuid_generate_v4(),
  personagem_id uuid references personagens(id) on delete cascade not null,
  nome text not null,
  valor_atual integer not null default 0,
  valor_maximo integer not null default 0,
  ordem integer not null default 0
);

-- Habilidades
create table if not exists habilidades (
  id uuid primary key default uuid_generate_v4(),
  personagem_id uuid references personagens(id) on delete cascade not null,
  nome text not null,
  descricao text default '',
  custo text default '',
  ordem integer not null default 0
);

-- RLS: como o app não tem login, liberamos acesso total para a chave "anon".
-- Isso é aceitável para um grupo fechado de amigos com o link privado,
-- mas significa que qualquer pessoa com o link pode ler/editar tudo.
alter table personagens enable row level security;
alter table atributos enable row level security;
alter table barras_status enable row level security;
alter table habilidades enable row level security;

create policy "acesso_total_personagens" on personagens for all using (true) with check (true);
create policy "acesso_total_atributos" on atributos for all using (true) with check (true);
create policy "acesso_total_barras" on barras_status for all using (true) with check (true);
create policy "acesso_total_habilidades" on habilidades for all using (true) with check (true);

-- Realtime: habilita transmissão de mudanças em tempo real para essas tabelas
alter publication supabase_realtime add table personagens, atributos, barras_status, habilidades;
