import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const root = path.resolve(process.cwd())
const envPath = path.join(root, '.env')

function readEnv(file) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
  const values = {}
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
    values[key] = value
  }
  return values
}

const env = readEnv(envPath)
const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não foram encontrados em .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const { data: mundos, error: listError } = await supabase
  .from('mundos')
  .select('*')
  .order('criado_em', { ascending: true })

if (listError) {
  console.error('Erro ao listar mundos:', listError)
  process.exit(1)
}

console.log('Mundos encontrados:', mundos.map((m) => ({ id: m.id, nome: m.nome, campanha_ativa: m.campanha_ativa })))

const match = mundos.find((m) => m.nome && m.nome.toLowerCase() === 'olvia')

if (!match) {
  console.error('Mundo "Olvia" não foi encontrado.')
  process.exit(1)
}

const { error: updateError } = await supabase
  .from('mundos')
  .update({ campanha_ativa: true })
  .eq('id', match.id)

if (updateError) {
  console.error('Erro ao ativar campanha:', updateError)
  process.exit(1)
}

console.log(`Campanha ativada para o mundo "${match.nome}" (id ${match.id}).`)
