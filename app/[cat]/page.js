import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import Card from '@/components/Card'
import Folders from '@/components/Folders'

export default async function Category({ params, searchParams }) {
  const { cat: slug } = await params
  const { folder } = await searchParams // ?folder=slug => folder view
  const { data: cat } = await db.from('categories').select('*').eq('slug', slug).eq('is_hidden', false).maybeSingle()
  if (!cat) notFound()

  // Published projects in THIS category (inner join keeps only matching ones), plus their folder
  const { data: inCat } = await db.from('projects')
    .select('*, folders(name,slug), project_categories!inner(category_id,is_pinned)')
    .eq('status', 'published').eq('project_categories.category_id', cat.id)
    .order('created_at', { ascending: false })

  // Sidebar folders = unique folders that appear in this category
  const folders = [...new Map((inCat || []).filter(p => p.folders).map(p => [p.folders.slug, p.folders])).values()]

  // Folder view: EVERYTHING in the folder, from any category, each with its category names
  let items = inCat || []
  if (folder) {
    const { data } = await db.from('projects')
      .select('*, folders!inner(slug), project_categories(categories(name,slug))')
      .eq('status', 'published').eq('folders.slug', folder)
    items = data || []
  }

  return (
    <div className={folders.length ? 'split' : ''}>
      <section>
        <h1>{cat.name}{folder && <small> / {folders.find(f => f.slug === folder)?.name || folder}</small>}</h1>
        <div className="grid">
          {items.map(p => {
            const cats = (p.project_categories || []).map(x => x.categories).filter(Boolean) // only filled in folder view
            const home = cats.find(c => c.slug === slug) || cats[0] || cat                     // link into this category when possible
            const tags = folder
              ? cats.filter(c => c !== home).map(c => c.name)                                    // folder view: tag other categories
              : [p.project_categories?.[0]?.is_pinned && 'Featured', p.folders?.name].filter(Boolean) // list view: Featured + folder
            return <Card key={p.id} p={p} cat={home} tags={tags} />
          })}
        </div>
        {!items.length && <p className="mono">Nothing published here yet.</p>}
      </section>
      {folders.length > 0 && <Folders folders={folders} slug={slug} current={folder} />}
    </div>
  )
}
