import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anon) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(url, anon)

async function main() {
  try {
    const { data: subtopics, error: subtopicsErr } = await supabase
      .from('subtopics')
      .select('id,key,name,enabled')
      .order('name')

    if (subtopicsErr) throw subtopicsErr
    console.log('Subtopics:', subtopics)

    if (!subtopics || subtopics.length === 0) {
      console.warn('No subtopics found. Did you run database/schema.sql and database/seed.sql?')
      process.exit(2)
    }

    const enabled = subtopics.filter(s => s.enabled)
    console.log(`Enabled subtopics: ${enabled.map(s => s.key).join(', ')}`)

    for (const s of enabled) {
      const { error: qErr } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('subtopic_id', s.id)
        .eq('enabled', true)

      if (qErr) throw qErr
      console.log(`Questions exist for subtopic ${s.key}`)
    }

    console.log('✅ Supabase connection OK and seed appears present.')
    process.exit(0)
  } catch (e) {
    console.error('❌ Healthcheck failed:', e?.message || e)
    process.exit(1)
  }
}

main()



