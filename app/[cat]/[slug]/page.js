import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { db, img, PROGRAM } from '@/lib/db'
import Gallery from '@/components/Gallery'

export default async function Project({ params }) {
  const { cat, slug } = await params
  // drafts are hidden by RLS, so an unpublished slug simply returns nothing => 404
  const { data: p } = await db.from('projects')
    .select('*, folders(name,slug), project_media(*)').eq('slug', slug).maybeSingle()
  if (!p) notFound()
  const media = [...p.project_media].sort((a, b) => a.sort_order - b.sort_order)
  const blog = Object.entries(p.program_data || {}).filter(([, v]) => v) // filled-in program fields only

  return (
    <article>
      <p className="mono">
        <Link href={`/${cat}`}>← Back</Link>
        {p.folders && <> · <Link href={`/${cat}?folder=${p.folders.slug}`}>📁 {p.folders.name}</Link></>}
        {p.client && <> · {p.client}</>}{p.year && <> · {p.year}</>}
      </p>
      <h1>{p.title}</h1>
      <p className="lead">{p.summary}</p>

      {/* video projects: the thumbnail links out to the facebook/insta/youtube post */}
      {p.external_url && (
        <a className="thumb big" href={p.external_url} target="_blank" rel="noopener">
          <Image src={img(p.thumbnail_path)} alt={p.title} fill sizes="100vw" quality={90} priority />
          <span className="play">▶ Watch</span>
        </a>
      )}
      {/* game projects: button to the itch.io / store page */}
      {p.cta_url && <p><a className="btn" href={p.cta_url} target="_blank" rel="noopener">{p.cta_label || 'Open'} ↗</a></p>}

      {/* Programs & Projects: blog-style sections */}
      {blog.length > 0 && (
        <dl>{blog.map(([k, v]) => <div key={k}><dt className="mono">{PROGRAM[k]}</dt><dd>{v}</dd></div>)}</dl>
      )}
      <div className="body">{p.description}</div>
      <Gallery media={media} />
    </article>
  )
}
