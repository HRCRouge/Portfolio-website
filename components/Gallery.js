'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { img } from '@/lib/db'

// Masonry thumbnails + full-screen lightbox (arrows, swipe, Esc, click-to-zoom, counter, captions)
export default function Gallery({ media }) {
  const [i, setI] = useState(null)   // index of the open image; null = closed
  const [zoom, setZoom] = useState(false)
  const [x0, setX0] = useState(0)    // where a swipe started
  const n = media.length
  const go = d => { setZoom(false); setI(k => (k + d + n) % n) }

  // keyboard controls + lock page scroll while open
  useEffect(() => {
    if (i === null) return
    const key = e => e.key === 'Escape' ? setI(null) : e.key === 'ArrowRight' ? go(1) : e.key === 'ArrowLeft' && go(-1)
    addEventListener('keydown', key)
    document.body.style.overflow = 'hidden'
    return () => { removeEventListener('keydown', key); document.body.style.overflow = '' }
  }, [i])

  if (!n) return null
  const cur = i !== null && media[i]
  // render previous + current + next (hidden ones are just pre-loading so navigation feels instant)
  const near = i === null ? [] : [...new Set([-1, 0, 1].map(o => (i + o + n) % n))]
  return (
    <>
      <div className="gal">
        {media.map((m, k) => (
          <button key={m.id || m.path} onClick={() => setI(k)}>
            <Image src={img(m.path)} alt={m.alt || ''} width={m.w || 1600} height={m.h || 1000} sizes="(max-width:700px) 100vw, 33vw" quality={90} />
          </button>
        ))}
      </div>
      {cur && (
        <div className="lb" onTouchStart={e => setX0(e.touches[0].clientX)}
          onTouchEnd={e => { const d = e.changedTouches[0].clientX - x0; if (Math.abs(d) > 50) go(d < 0 ? 1 : -1) }}>
          <button className="x" onClick={() => setI(null)} aria-label="Close">✕</button>
          {n > 1 && <button className="prev" onClick={() => go(-1)} aria-label="Previous">‹</button>}
          {n > 1 && <button className="next" onClick={() => go(1)} aria-label="Next">›</button>}
          <div className={`stage ${zoom ? 'zoom' : ''}`} onClick={() => setZoom(!zoom)}>
            {near.map(k => (
              <Image key={media[k].id || media[k].path} src={img(media[k].path)} alt={media[k].alt || ''} fill sizes="100vw"
                quality={90} loading="eager" className={k === i ? 'show' : 'hide'} />
            ))}
          </div>
          <p className="mono cap">{i + 1} / {n}{cur.caption && ` — ${cur.caption}`}</p>
        </div>
      )}
    </>
  )
}
