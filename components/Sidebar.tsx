'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/',               label: 'Dashboard',     icon: '▣' },
  { href: '/registrar',     label: 'Registrar',     icon: '+' },
  { href: '/historico',     label: 'Histórico',     icon: '≡' },
  { href: '/colaboradores', label: 'Colaboradores', icon: '◉' },
  { href: '/importar',      label: 'Importar Excel', icon: '↑' },
]

export default function Sidebar() {
  const path = usePathname()

  return (
    <aside className="w-60 min-h-screen flex flex-col" style={{ background: '#0d1f3c' }}>
      <div className="px-6 py-5 border-b" style={{ borderColor: '#1e3a6e' }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm"
               style={{ background: '#e97b2e', color: '#fff' }}>A</div>
          <span className="font-black text-white tracking-wider text-base uppercase">AçosVital</span>
        </div>
        <div className="ml-11">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#e97b2e' }}>
            Segurança do Trabalho
          </span>
        </div>
      </div>

      <nav className="flex-1 py-5 px-3 space-y-1">
        {nav.map(({ href, label, icon }) => {
          const active = path === href
          return (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: active ? '#e97b2e' : 'transparent',
                color: active ? '#fff' : '#7a9cc4',
              }}
            >
              <span className="text-base w-5 text-center">{icon}</span>
              {label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-80" />}
            </Link>
          )
        })}
      </nav>

      <div className="px-6 py-4 border-t" style={{ borderColor: '#1e3a6e' }}>
        <p className="text-xs" style={{ color: '#4a6a8a' }}>Sistema de Advertências</p>
        <p className="text-xs mt-0.5" style={{ color: '#2a4a6a' }}>v1.0 · {new Date().getFullYear()}</p>
      </div>
    </aside>
  )
}
