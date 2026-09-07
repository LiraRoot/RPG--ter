# App de fichas de RPG

App bem simples pra gerenciar fichas de personagem de RPG (sistema próprio) em
grupo, à distância. Sem login: qualquer pessoa com o link vê a lista de
personagens e pode criar, editar ou remover qualquer um. Mudanças aparecem em
tempo real pra todo mundo.

O visual é propositalmente básico — o objetivo agora é a estrutura funcionar
bem, e a aparência pode ser refeita depois sem quebrar nada.

## 1. Criar o projeto no Supabase (gratuito)

1. Crie uma conta em https://supabase.com e um novo projeto (escolha uma senha
   de banco de dados qualquer, você não vai precisar usá-la diretamente).
2. No painel do projeto, vá em **SQL Editor** → **New query**, cole o
   conteúdo do arquivo `sql/schema.sql` deste projeto e rode. Isso cria as
   tabelas de personagens, atributos, barras de status e habilidades.
3. Vá em **Storage** → **New bucket**, crie um bucket chamado `personagens` e
   marque como **público** (pra imagens dos personagens carregarem no site).
4. Vá em **Project Settings** → **API**. Você vai precisar de dois valores:
   - **Project URL**
   - **anon public key**

## 2. Configurar o projeto localmente

1. Copie `.env.example` para um arquivo novo chamado `.env`.
2. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores do
   passo anterior.
3. Instale as dependências e rode localmente:

```bash
npm install
npm run dev
```

Isso abre o app em `http://localhost:5173`.

## 3. Colocar no ar (grátis, com um link pra compartilhar)

1. Suba este projeto num repositório no GitHub.
2. Crie uma conta em https://vercel.com e importe o repositório.
3. Nas configurações do projeto na Vercel, adicione as mesmas variáveis de
   ambiente (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`).
4. Publique. A Vercel vai gerar um link tipo `seu-app.vercel.app` — esse é o
   link que você compartilha com o grupo.

## Antes de cada sessão

O Supabase pausa o projeto depois de 1 semana sem uso no plano gratuito.
Antes de jogar, entre no painel do Supabase e clique em "reativar" caso o
projeto esteja pausado (leva menos de um minuto).

## Estrutura do projeto

```
src/
  lib/
    supabaseClient.js   -> conexão com o Supabase
    api.js              -> TODAS as chamadas ao banco ficam aqui
  components/
    AttributeList.jsx   -> lista editável de atributos (Força, Destreza...)
    StatusBarList.jsx   -> lista editável de barras (Vida, Energia, Mana...)
    AbilityList.jsx     -> lista editável de habilidades
  pages/
    CharacterListPage.jsx  -> tela inicial com todos os personagens
    CreateCharacterPage.jsx -> formulário de criação
    CharacterSheetPage.jsx  -> ficha completa, editável
sql/
  schema.sql          -> script para criar as tabelas no Supabase
```

Atributos, barras de status e habilidades são listas livres guardadas no
banco (não colunas fixas) — dá pra adicionar ou remover qualquer um pela
própria interface, sem precisar mexer no código ou no banco de dados.

## Próximos passos possíveis

- Melhorar o visual (hoje é propositalmente básico)
- Adicionar campo de descrição/história do personagem
- Adicionar rolagem de dados
- Restringir edição por personagem, se um dia vocês quiserem
