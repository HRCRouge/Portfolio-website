'use client'
import { useEffect, useState } from 'react'

// Dark / light toggle. Choice is saved in the browser; dark is the default.
export default function Theme() {
  const [t, setT] = useState('dark')
  const set = v => { setT(v); document.documentElement.dataset.theme = v; localStorage.setItem('theme', v) }
  useEffect(() => { const s = localStorage.getItem('theme'); if (s) set(s) }, []) // restore saved choice
  return <button onClick={() => set(t === 'dark' ? 'light' : 'dark')} aria-label="Toggle light/dark">{t === 'dark' ? '☾' : '☀'}</button>
}
