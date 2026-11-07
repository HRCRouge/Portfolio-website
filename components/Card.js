import Link from 'next/link'
import Image from 'next/image'
import { img } from '@/lib/db'

// One project tile: wide "letterbox" thumbnail + small label line + title.
// `cat` decides the link, `tags` are extra labels (other categories, folder name, "Featured")
export default function Card({ p, cat, tags = [] }) {
  return (
    <Link href={`/${cat.slug}/${p.slug}`} className="card">
      <div className="thumb">
        <Image src={img(p.thumbnail_path)} alt={p.title} fill sizes="(max-width:700px) 100vw, 33vw" quality={90} />
      </div>
      <span className="mono">{[cat.name, p.year, ...tags].filter(Boolean).join(' · ')}</span>
      <h3>{p.title}</h3>
    </Link>
  )
}
