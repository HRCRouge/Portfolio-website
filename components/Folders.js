'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Right-hand folder list. Also gives each category a "memory":
// the last open folder is saved in the browser and reopened when you come back.
export default function Folders({ folders, slug, current }) {
  const router = useRouter()
  const key = `folder:${slug}`
  useEffect(() => {
    if (current) localStorage.setItem(key, current) // a folder is open: remember it
    else {
      const last = localStorage.getItem(key) // nothing open: restore the remembered folder (if it still exists here)
      if (last && folders.some(f => f.slug === last)) router.replace(`/${slug}?folder=${last}`)
    }
  }, [current])
  return (
    <aside>
      <b className="mono">Folders</b>
      {folders.map(f => (
        <Link key={f.slug} href={`/${slug}?folder=${f.slug}`} className={f.slug === current ? 'on' : ''}>📁 {f.name}</Link>
      ))}
      {/* closing clears the memory first, so it won't pop back open */}
      {current && <Link href={`/${slug}`} onClick={() => localStorage.removeItem(key)}>✕ Close folder</Link>}
    </aside>
  )
}
