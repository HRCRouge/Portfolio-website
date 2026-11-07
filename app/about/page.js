import Link from 'next/link'
import Image from 'next/image'
import { db, img } from '@/lib/db'

export default async function About() {
  const { data: s } = await db.from('site_settings').select('*').single()
  return (
    <section className="about">
      <div className="thumb portrait"><Image src={img(s?.about_photo)} alt="Ankit Gajurel" fill sizes="300px" quality={90} /></div>
      <div>
        <h1>About</h1>
        {/* plain text from /admin; blank lines become paragraphs (see .body in the CSS) */}
        <div className="body">{s?.about}</div>
        <Link href="/contact" className="btn">Get in touch</Link>
      </div>
    </section>
  )
}
