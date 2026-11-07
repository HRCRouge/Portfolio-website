import { createClient } from '@supabase/supabase-js'

// Fallbacks let `next build` run before the .env file exists
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost'
export const db = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon')

// Turn a storage path into a public image URL
export const img = p => (p ? `${url}/storage/v1/object/public/media/${p}` : '/placeholder.svg')

// Blog-style fields for "Programs & Projects" (used by the admin form AND the public page)
export const PROGRAM = {
  role: 'Role', organization: 'Organization', dates: 'Dates', location: 'Location',
  participants: 'Participants', team_size: 'Team size', goal: 'Goal', audience: 'Audience',
  plan: 'How it was run', challenges: 'Challenges & solutions', results: 'Results',
  lessons: 'Lessons learned', tools: 'Tools & templates used', budget: 'Budget', quotes: 'Quotes',
}
