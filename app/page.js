import Link from 'next/link'
import { db } from '@/lib/db'
import Card from '@/components/Card'

export default async function Home() {
  const [{ data: s }, { data: pins }] = await Promise.all([
    db.from('site_settings').select('*').single(),
    // every pinned link, with its category and project (project is null if it's a draft: RLS hides it)
    db.from('project_categories').select('categories(name,slug,sort_order,is_hidden), projects(*)').eq('is_pinned', true),
  ])
  // keep visible categories with a published pinned project, in menu order => max one card per category
  const cards = (pins || [])
    .filter(x => x.projects && !x.categories.is_hidden)
    .sort((a, b) => a.categories.sort_order - b.categories.sort_order)
  return (
    <>
      <section className="hero">
        <p className="mono">{s?.tagline}</p>
        <h1>Ankit Gajurel</h1>
        <p className="lead">{s?.intro}</p>
      </section>
      <section className="grid">
        {cards.map(c => <Card key={c.projects.id} p={c.projects} cat={c.categories} />)}
      </section>
      <p className="center"><Link href="/contact" className="btn">Let's talk</Link></p>
    </>
  )
}
