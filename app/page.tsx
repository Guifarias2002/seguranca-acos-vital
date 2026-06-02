'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { AdvertenciaView, TIPO_LABEL, TipoAdvertencia } from '@/lib/types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { format, parseISO, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const TIPO_BADGE: Record<TipoAdvertencia, { bg: string; text: string; dot: string }> = {
  verbal:    { bg: '#fff8e6', text: '#b45309', dot: '#f59e0b' },
  escrita:   { bg: '#fff3e6', text: '#c2410c', dot: '#f97316' },
  suspensao: { bg: '#fde8e8', text: '#b91c1c', dot: '#ef4444' },
}

export default function Dashboard() {
  const [dados, setDados] = useState<AdvertenciaView[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('advertencias_view').select('*').then(({ data }) => {
      setDados(data || [])
      setLoading(false)
    })
  }, [])

  const total     = dados.length
  const verbal    = dados.filter(d => d.tipo === 'verbal').length
  const escrita   = dados.filter(d => d.tipo === 'escrita').length
  const suspensao = dados.filter(d => d.tipo === 'suspensao').length

  const meses = Array.from({ length: 6 }, (_, i) => {
    const mes = subMonths(new Date(), 5 - i)
    const chave = format(mes, 'yyyy-MM')
    return {
      nome: format(mes, 'MMM', { locale: ptBR }),
      Verbais:    dados.filter(d => d.data.startsWith(chave) && d.tipo === 'verbal').length,
      Escritas:   dados.filter(d => d.data.startsWith(chave) && d.tipo === 'escrita').length,
      Suspensões: dados.filter(d => d.data.startsWith(chave) && d.tipo === 'suspensao').length,
    }
  })

  const porTipo = [
    { name: 'Verbal',    value: verbal,    color: '#f59e0b' },
    { name: 'Escrita',   value: escrita,   color: '#f97316' },
    { name: 'Suspensão', value: suspensao, color: '#ef4444' },
  ].filter(d => d.value > 0)

  const setorMap: Record<string, number> = {}
  dados.forEach(d => { setorMap[d.setor] = (setorMap[d.setor] || 0) + 1 })
  const topSetores = Object.entries(setorMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const recentes = dados.slice(0, 6)

  const cards = [
    { label: 'Total de registros', valor: total,    cor: '#0d1f3c', textCor: '#fff', accent: '#e97b2e' },
    { label: 'Advertências verbais', valor: verbal,   cor: '#fff8e6', textCor: '#0d1f3c', accent: '#f59e0b' },
    { label: 'Advertências escritas', valor: escrita,  cor: '#fff3e6', textCor: '#0d1f3c', accent: '#f97316' },
    { label: 'Suspensões',           valor: suspensao, cor: '#fde8e8', textCor: '#0d1f3c', accent: '#ef4444' },
  ]

  return (
    <div>
      {/* Header banner */}
      <div className="px-10 py-7 border-b" style={{ background: '#0d1f3c', borderColor: '#1e3a6e' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Dashboard</h1>
            <p className="text-sm mt-0.5" style={{ color: '#7a9cc4' }}>Visão geral das advertências registradas</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
               style={{ background: '#e97b2e', color: '#fff' }}>
            <span>⚠</span> {total} registro{total !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="p-8 space-y-7 max-w-6xl">
        {/* Cards */}
        <div className="grid grid-cols-4 gap-4">
          {cards.map(({ label, valor, cor, textCor, accent }) => (
            <div key={label} className="rounded-xl p-5 shadow-sm" style={{ background: cor }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accent }}>{label}</p>
                <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
              </div>
              <p className="text-5xl font-black" style={{ color: textCor === '#fff' ? '#fff' : accent }}>{valor}</p>
            </div>
          ))}
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-black uppercase tracking-wide" style={{ color: '#0d1f3c' }}>Últimos 6 meses</h2>
              <div className="flex gap-3 text-xs">
                {[['#f59e0b','Verbal'],['#f97316','Escrita'],['#ef4444','Suspensão']].map(([c,l]) => (
                  <span key={l} className="flex items-center gap-1 font-medium" style={{ color: '#666' }}>
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: c }} />{l}
                  </span>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={meses} barSize={12}>
                <XAxis dataKey="nome" tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#999' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="Verbais"    fill="#f59e0b" radius={[4,4,0,0]} />
                <Bar dataKey="Escritas"   fill="#f97316" radius={[4,4,0,0]} />
                <Bar dataKey="Suspensões" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wide mb-5" style={{ color: '#0d1f3c' }}>Distribuição por tipo</h2>
            {porTipo.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={porTipo} dataKey="value" nameKey="name" cx="45%" cy="50%" outerRadius={75} innerRadius={40}>
                    {porTipo.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-sm" style={{ color: '#aaa' }}>
                Nenhum dado ainda
              </div>
            )}
          </div>
        </div>

        {/* Setores + Recentes */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wide mb-5" style={{ color: '#0d1f3c' }}>
              Setores com mais ocorrências
            </h2>
            <div className="space-y-4">
              {topSetores.length === 0 && <p className="text-sm" style={{ color: '#aaa' }}>Nenhum dado ainda</p>}
              {topSetores.map(([nome, qtd], i) => (
                <div key={nome}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-semibold" style={{ color: '#0d1f3c' }}>{nome}</span>
                    <span className="font-black" style={{ color: '#e97b2e' }}>{qtd}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: '#f0f2f5' }}>
                    <div className="h-full rounded-full transition-all"
                         style={{ width: `${(qtd / (topSetores[0]?.[1] || 1)) * 100}%`,
                                  background: i === 0 ? '#e97b2e' : '#0d1f3c' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wide mb-5" style={{ color: '#0d1f3c' }}>
              Últimas advertências
            </h2>
            <div className="space-y-3">
              {recentes.length === 0 && (
                <p className="text-sm" style={{ color: '#aaa' }}>Nenhuma advertência registrada ainda.</p>
              )}
              {recentes.map(d => {
                const badge = TIPO_BADGE[d.tipo as TipoAdvertencia]
                return (
                  <div key={d.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: '#f0f2f5' }}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: badge.dot }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: '#0d1f3c' }}>{d.colaborador}</p>
                      <p className="text-xs" style={{ color: '#888' }}>{d.setor}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold px-2 py-0.5 rounded"
                            style={{ background: badge.bg, color: badge.text }}>
                        {TIPO_LABEL[d.tipo as TipoAdvertencia].replace('Advertência ', '')}
                      </span>
                      <p className="text-xs mt-1" style={{ color: '#aaa' }}>
                        {format(parseISO(d.data), 'dd/MM/yy')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
