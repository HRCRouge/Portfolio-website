'use client'
import { useEffect, useState } from 'react'
import { db, img, PROGRAM } from '@/lib/db'

/* ---------- helpers ---------- */

// Shrink an image in the browser (max 2560px, WebP 90%) before uploading: saves free storage,
// keeps it sharp, and re-encoding drops GPS/location metadata. Returns { path, w, h }.
async function up(file) {
  if (!file) return null
  const bmp = await createImageBitmap(file), s = Math.min(1, 2560 / Math.max(bmp.width, bmp.height))
  const c = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * s), height: Math.round(bmp.height * s) })
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
  const blob = await new Promise(r => c.toBlob(r, 'image/webp', 0.9))
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`
  const { error } = await db.storage.from('media').upload(path, blob, { contentType: 'image/webp' })
  if (error) { alert(error.message); return null }
  return { path, w: c.width, h: c.height }
}
const slugify = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/* ---------- login ---------- */
function Login() {
  const submit = async e => {
    e.preventDefault()
    const f = new FormData(e.target)
    const { error } = await db.auth.signInWithPassword({ email: f.get('email'), password: f.get('password') })
    if (error) alert(error.message)
  }
  return (
    <form onSubmit={submit} className="form">
      <h1>Admin</h1>
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      <button className="btn">Log in</button>
    </form>
  )
}

/* ---------- one generic editor, reused for categories, folders, socials, site text and inbox ----------
   cols = [[field, label, type]]  type: text (default) | number | check | area | img | ro (read-only) | select:a,b,c
   blank = function returning the starting values of a new row (omit to disable "+ Add")
   single = true for a one-row table (site_settings: no delete button) */
function Crud({ table, cols, order, desc, blank, single }) {
  const [rows, setRows] = useState([])
  const load = async () => setRows((await db.from(table).select('*').order(order, { ascending: !desc })).data || [])
  useEffect(() => { load() }, [])
  const edit = (id, k, v) => setRows(rs => rs.map(r => (r.id === id ? { ...r, [k]: v } : r))) // change a field locally
  const save = async r => { const { error } = await db.from(table).upsert(r); alert(error ? error.message : 'Saved'); load() }
  const del = async r => {
    if (!confirm('Delete this?')) return
    const { error } = await db.from(table).delete().eq('id', r.id)
    if (error) alert(error.code === '23503' ? 'This category still has projects. Hide it instead, or move its projects first.' : error.message)
    load()
  }
  const input = (r, [k, , t = 'text']) => {
    const v = r[k]
    if (t === 'ro') return <span>{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}</span>
    if (t === 'check') return <input type="checkbox" checked={!!v} onChange={e => edit(r.id, k, e.target.checked)} />
    if (t === 'area') return <textarea rows="6" value={v ?? ''} onChange={e => edit(r.id, k, e.target.value)} />
    if (t.startsWith('select')) return <select value={v ?? ''} onChange={e => edit(r.id, k, e.target.value)}>{t.slice(7).split(',').map(o => <option key={o}>{o}</option>)}</select>
    if (t === 'img') return <><input type="file" accept="image/*" onChange={async e => edit(r.id, k, (await up(e.target.files[0]))?.path)} />{v && <img src={img(v)} alt="" width="60" />}</>
    return <input type={t} value={v ?? ''} onChange={e => edit(r.id, k, t === 'number' ? +e.target.value : e.target.value)} />
  }
  return (
    <>
      {rows.map(r => (
        <div className="row" key={r.id}>
          {cols.map(c => <label key={c[0]}>{c[1]}{input(r, c)}</label>)}
          <button className="btn" onClick={() => save(r)}>Save</button>
          {!single && <button className="btn" onClick={() => del(r)}>Delete</button>}
        </div>
      ))}
      {blank && <button className="btn" onClick={() => save(blank())}>+ Add</button>}
    </>
  )
}

/* ---------- projects: list + editor ---------- */
function Projects() {
  const [list, setList] = useState([]), [cats, setCats] = useState([]), [folders, setFolders] = useState([])
  const [p, setP] = useState(null) // the project being edited (null = show the list)
  const load = async () => {
    setList((await db.from('projects').select('id,title,status').order('created_at', { ascending: false })).data || [])
    setCats((await db.from('categories').select('*').order('sort_order')).data || [])
    setFolders((await db.from('folders').select('id,name').order('name')).data || [])
  }
  useEffect(() => { load() }, [])

  // open a project: also load which categories it's in (links = {categoryId: isPinned}) and its images
  const open = async id => {
    if (!id) return setP({ title: '', slug: '', status: 'draft', program_data: {}, links: {}, media: [] })
    const { data } = await db.from('projects').select('*, project_categories(category_id,is_pinned), project_media(*)').eq('id', id).single()
    setP({ ...data, links: Object.fromEntries(data.project_categories.map(x => [x.category_id, x.is_pinned])),
      media: data.project_media.sort((a, b) => a.sort_order - b.sort_order) })
  }
  const set = (k, v) => setP(x => ({ ...x, [k]: v }))
  const F = (k, label, t = 'text') => (
    <label>{label}{t === 'area'
      ? <textarea rows="6" value={p[k] ?? ''} onChange={e => set(k, e.target.value)} />
      : <input type={t} value={p[k] ?? ''} onChange={e => set(k, t === 'number' ? (e.target.value ? +e.target.value : null) : e.target.value)} />}</label>
  )

  const save = async () => {
    const { links, media, project_categories, project_media, ...row } = p // strip the helper fields; the rest is the DB row
    if (!row.title) return alert('Title is required')
    if (row.status === 'published' && !row.photo_consent && !confirm('Written photo consent is not ticked. Publish anyway?')) return
    row.slug = row.slug || slugify(row.title)
    if (!row.id) delete row.id                                    // new project: let the database create the id
    const { data, error } = await db.from('projects').upsert(row).select().single()
    if (error) return alert(error.message)

    // categories + pins: first free each pinned category (only 1 pin per category), then rewrite this project's links
    const ids = Object.keys(links), pins = ids.filter(c => links[c] && row.status === 'published')
    for (const c of pins) await db.from('project_categories').update({ is_pinned: false }).eq('category_id', c).eq('is_pinned', true)
    await db.from('project_categories').delete().eq('project_id', data.id)
    if (ids.length) await db.from('project_categories').insert(ids.map(c => ({ project_id: data.id, category_id: c, is_pinned: pins.includes(c) })))

    // images: rewrite the list in the current order
    await db.from('project_media').delete().eq('project_id', data.id)
    if (media.length) await db.from('project_media').insert(media.map((m, n) => ({ project_id: data.id, path: m.path, w: m.w, h: m.h, alt: m.alt, caption: m.caption, sort_order: n })))
    setP(null); load()
  }
  const del = async () => { if (confirm('Delete this project for good?')) { await db.from('projects').delete().eq('id', p.id); setP(null); load() } }

  // gallery helpers: upload, move up/down, edit alt/caption
  const add = async files => {
    const out = []
    for (const f of files) { const u = await up(f); if (u) out.push({ ...u, alt: '', caption: '' }) }
    set('media', [...p.media, ...out])
  }
  const mv = (i, d) => { const m = [...p.media], j = i + d; if (j < 0 || j >= m.length) return;[m[i], m[j]] = [m[j], m[i]]; set('media', m) }
  const upd = (i, k, v) => set('media', p.media.map((m, n) => (n === i ? { ...m, [k]: v } : m)))

  if (!p) return (
    <>
      <button className="btn" onClick={() => open()}>+ New project</button>
      {list.map(x => <div className="row" key={x.id}><button onClick={() => open(x.id)}>{x.title}</button><span className="mono">{x.status}</span></div>)}
    </>
  )
  const isProgram = cats.some(c => c.layout === 'program' && c.id in p.links) // show blog fields?
  return (
    <div className="form" style={{ maxWidth: 760 }}>
      <button onClick={() => setP(null)}>← All projects</button>
      {F('title', 'Title')}{F('slug', 'URL slug (blank = from title)')}{F('summary', 'Short summary')}{F('description', 'Description', 'area')}
      {F('year', 'Year', 'number')}{F('client', 'Client')}
      <label>Folder<select value={p.folder_id ?? ''} onChange={e => set('folder_id', e.target.value || null)}>
        <option value="">(none)</option>{folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
      <label>Status<select value={p.status} onChange={e => set('status', e.target.value)}><option>draft</option><option>published</option></select></label>

      <b className="mono">Categories (tick all that apply, 📌 = show on Home)</b>
      {cats.map(c => (
        <div key={c.id} className="check">
          <input type="checkbox" checked={c.id in p.links} onChange={e => { const l = { ...p.links }; if (e.target.checked) l[c.id] = false; else delete l[c.id]; set('links', l) }} /> {c.name}
          {c.id in p.links && <label className="check">📌 <input type="checkbox" checked={p.links[c.id]} disabled={p.status !== 'published'}
            onChange={e => set('links', { ...p.links, [c.id]: e.target.checked })} /></label>}
        </div>
      ))}

      <b className="mono">Links</b>
      {F('external_url', 'Video link (Facebook / Instagram / YouTube post)')}{F('cta_label', 'Button text (e.g. Play on itch.io)')}{F('cta_url', 'Button link')}
      <label>Thumbnail<input type="file" accept="image/*" onChange={async e => set('thumbnail_path', (await up(e.target.files[0]))?.path)} />
        {p.thumbnail_path && <img src={img(p.thumbnail_path)} alt="" width="120" />}</label>

      {isProgram && <>
        <b className="mono">Programs & Projects write-up</b>
        {Object.entries(PROGRAM).map(([k, label]) => (
          <label key={k}>{label}<textarea rows="2" value={p.program_data?.[k] ?? ''} onChange={e => set('program_data', { ...p.program_data, [k]: e.target.value })} /></label>
        ))}</>}

      <b className="mono">Images (first = top of gallery)</b>
      <input type="file" accept="image/*" multiple onChange={e => add([...e.target.files])} />
      {p.media.map((m, i) => (
        <div className="media" key={m.path}>
          <img src={img(m.path)} alt="" />
          <input placeholder="Alt text" value={m.alt ?? ''} onChange={e => upd(i, 'alt', e.target.value)} />
          <input placeholder="Caption" value={m.caption ?? ''} onChange={e => upd(i, 'caption', e.target.value)} />
          <button onClick={() => mv(i, -1)}>↑</button><button onClick={() => mv(i, 1)}>↓</button>
          <button onClick={() => set('media', p.media.filter((_, n) => n !== i))}>✕</button>
        </div>
      ))}

      <label className="check"><input type="checkbox" checked={!!p.photo_consent} onChange={e => set('photo_consent', e.target.checked)} /> Written consent is on file for anyone shown in the photos</label>
      <button className="btn" onClick={save}>Save</button>
      {p.id && <button className="btn" onClick={del}>Delete project</button>}
    </div>
  )
}

/* ---------- the page: login gate + tabs ---------- */
export default function Admin() {
  const [user, setUser] = useState(null), [ready, setReady] = useState(false), [tab, setTab] = useState('Projects')
  useEffect(() => {
    db.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setReady(true) })
    const { data: { subscription } } = db.auth.onAuthStateChange((_, s) => setUser(s?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])
  if (!ready) return null
  if (!user) return <Login />

  // each tab is just a configured <Crud> (except Projects)
  const tabs = {
    Projects: <Projects />,
    Categories: <Crud table="categories" order="sort_order" blank={() => ({ name: 'New category', slug: 'new-' + Date.now() })}
      cols={[['name', 'Name'], ['slug', 'URL slug'], ['sort_order', 'Menu order', 'number'], ['is_hidden', 'Hidden', 'check'], ['layout', 'Layout', 'select:standard,program']]} />,
    Folders: <Crud table="folders" order="name" blank={() => ({ name: 'New folder', slug: 'new-' + Date.now() })}
      cols={[['name', 'Name'], ['slug', 'URL slug'], ['client', 'Client'], ['description', 'Description']]} />,
    Site: <Crud table="site_settings" order="id" single
      cols={[['tagline', 'Tagline'], ['intro', 'Home intro', 'area'], ['about', 'About page text', 'area'], ['about_photo', 'About photo', 'img']]} />,
    Socials: <Crud table="socials" order="sort_order" blank={() => ({ label: 'New link', url: 'https://' })}
      cols={[['label', 'Label'], ['url', 'URL'], ['sort_order', 'Order', 'number']]} />,
    Inbox: <Crud table="messages" order="created_at" desc
      cols={[['name', 'Name', 'ro'], ['email', 'Email', 'ro'], ['message', 'Message', 'ro'], ['wants_cv', 'CV request', 'ro'], ['cv_answers', 'Answers', 'ro'], ['status', 'Status', 'select:new,approved,declined,archived']]} />,
  }
  return (
    <>
      <h1>Admin</h1>
      <div className="tabs">
        {Object.keys(tabs).map(t => <button key={t} className={`btn ${t === tab ? 'on' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
        <button className="btn" onClick={() => db.auth.signOut()}>Log out</button>
      </div>
      {tabs[tab]}
    </>
  )
}
