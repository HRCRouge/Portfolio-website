import './globals.css'
import Link from 'next/link'
import { db } from '@/lib/db'
import Theme from '@/components/Theme'

export const dynamic = 'force-dynamic' // always read fresh data, so /admin edits show instantly
export const metadata = {
  title: 'Ankit Gajurel — Hunter',
  description: 'Game development, design, photography, video and community programs by Ankit Gajurel.',
}

export default async function Layout({ children }) {
  // Menu and footer come straight from the database: change them in /admin, no code needed
  const [{ data: cats }, { data: socials }] = await Promise.all([
    db.from('categories').select('name,slug').eq('is_hidden', false).order('sort_order'),
    db.from('socials').select('id,label,url').order('sort_order'),
  ])
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Instrument+Serif&family=JetBrains+Mono&display=swap" />
      </head>
      <body>
        <header>
          <Link href="/" className="logo">Ankit Gajurel</Link>
          <nav>
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
            {(cats || []).map(c => <Link key={c.slug} href={`/${c.slug}`}>{c.name}</Link>)}
            <Link href="/contact">Contact</Link>
            <Theme />
          </nav>
        </header>
        <main>{children}</main>
        {/* footer only exists once at least one social link has been added */}
        {socials?.length > 0 && (
          <footer>
            <b className="mono">Socials</b>
            {socials.map(s => <a key={s.id} href={s.url} target="_blank" rel="noopener">{s.label}</a>)}
          </footer>
        )}
      </body>
    </html>
  )
}
