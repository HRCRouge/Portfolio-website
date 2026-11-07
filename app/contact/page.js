'use client'
import { useState } from 'react'
import { db } from '@/lib/db'

// Extra questions shown only when "request CV" is ticked: [field, label, options?]
const CV_Q = [
  ['organization', 'Organization'],
  ['purpose', 'Purpose', ['Hiring', 'Project', 'Collaboration', 'Other']],
  ['details', 'Role or project details'],
  ['timeline', 'Timeline'],
  ['found_me', 'How did you find me?'],
]

export default function Contact() {
  const [cv, setCv] = useState(false)
  const [done, setDone] = useState(false)

  async function send(e) {
    e.preventDefault()
    const f = Object.fromEntries(new FormData(e.target))
    if (f.website) return setDone(true)                       // honeypot: real people never see/fill this field
    const { name, email, message, website, ...answers } = f   // everything else = CV screening answers
    const { error } = await db.from('messages').insert({ name, email, message, wants_cv: cv, cv_answers: cv ? answers : {} })
    error ? alert('Something went wrong, please try again.') : setDone(true)
  }

  if (done) return <section><h1>Thank you</h1><p className="lead">Your message is in. I'll get back to you soon.</p></section>
  return (
    <section>
      <h1>Contact</h1>
      <form onSubmit={send} className="form">
        <input name="name" placeholder="Your name" required />
        <input name="email" type="email" placeholder="Your email" required />
        <textarea name="message" rows="5" placeholder="Your message" required />
        <input name="website" tabIndex="-1" autoComplete="off" className="hp" aria-hidden="true" />
        <label className="check"><input type="checkbox" checked={cv} onChange={e => setCv(e.target.checked)} /> I'd like to request Ankit's CV</label>
        {cv && CV_Q.map(([k, label, opts]) => opts
          ? <select key={k} name={k} required defaultValue=""><option value="" disabled>{label}</option>{opts.map(o => <option key={o}>{o}</option>)}</select>
          : <input key={k} name={k} placeholder={label} required />)}
        <button className="btn">Send</button>
      </form>
    </section>
  )
}
