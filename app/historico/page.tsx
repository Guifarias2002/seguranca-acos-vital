'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { AdvertenciaView, TIPO_LABEL, TipoAdvertencia } from '@/lib/types'
import { format, parseISO } from 'date-fns'

const TIPO_BADGE: Record<TipoAdvertencia, { bg: string; text: string }> = {
  verbal:    { bg: '#fff8e6', text: '#b45309' },
  escrita:   { bg: '#fff3e6', text: '#c2410c' },
  suspensao: { bg: '#fde8e8', text: '#b91c1c' },
}

export default function Historico() {
  const [dados, setDados] = useState<AdvertenciaView[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.from('advertencias_view').select('*').then(({ data }) => {
      setDados(data || [])
      setLoading(false)
    })
  }, [])

  const setores = [...new Set(dados.map(d => d.setor))].sort()
  const filtrados = dados.filter(d => {
    const q = busca.toLowerCase()
    return (
      (!q || d.colaborador.toLowerCase().includes(q) || d.motivo.toLowerCase().includes(q)) &&
      (!filtroTipo  || d.tipo === filtroTipo) &&
      (!filtroSetor || d.setor === filtroSetor)
    )
  })

  const selectStyle = {
    border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '9px 14px',
    fontSize: 13, outline: 'none', background: '#fafbfc', color: '#0d1f3c',
  }

  return (
    <div>
      <div className="px-10 py-7 border-b" style={{ background: '#0d1f3c', borderColor: '#1e3a6e' }}>
        <h1 className="text-2xl font-black text-white tracking-tight uppercase">Histórico</h1>
        <p className="text-sm mt-0.5" style={{ color: '#7a9cc4' }}>Todas as advertências registradas</p>
      </div>

      <div className="p-8 max-w-6xl space-y-5">
        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm p-4 flex gap-3 flex-wrap items-center">
          <input type="text" placeholder="Buscar colaborador ou motivo..."
            value={busca} onChange={e => setBusca(e.target.value)}
            style={{ ...selectStyle, flex: 1, minWidth: 200 }} />
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={selectStyle}>
            <option value="">Todos os tipos</option>
            <option value="verbal">Verbal</option>
            <option value="escrita">Escrita</option>
            <option value="suspensao">Suspensão</option>
          </select>
          <select value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)} style={selectStyle}>
            <option value="">Todos os setores</option>
            {setores.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {(busca || filtroTipo || filtroSetor) && (
            <button onClick={() => { setBusca(''); setFiltroTipo(''); setFiltroSetor('') }}
              className="text-sm font-semibold" style={{ color: '#e97b2e' }}>Limpar</button>
          )}
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-3 flex items-center justify-between border-b" style={{ borderColor: '#f0f2f5', background: '#0d1f3c' }}>
            <p className="text-xs font-black uppercase tracking-wider text-white">
              {filtrados.length} registro{filtrados.length !== 1 ? 's' : ''}
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm" style={{ color: '#aaa' }}>Carregando...</div>
          ) : filtrados.length === 0 ? (
            <div className="p-12 text-center text-sm" style={{ color: '#aaa' }}>Nenhuma advertência encontrada.</div>
          ) : (
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  {['Data','Colaborador','Setor','Tipo','Motivo'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11,
                      fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0d1f3c' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((d, i) => {
                  const badge = TIPO_BADGE[d.tipo as TipoAdvertencia]
                  return (
                    <tr key={d.id} style={{ borderTop: '1px solid #f0f2f5', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                      <td style={{ padding: '13px 20px', color: '#666', whiteSpace: 'nowrap' }}>
                        {format(parseISO(d.data), 'dd/MM/yyyy')}
                      </td>
                      <td style={{ padding: '13px 20px', fontWeight: 700, color: '#0d1f3c' }}>{d.colaborador}</td>
                      <td style={{ padding: '13px 20px', color: '#666' }}>{d.setor}</td>
                      <td style={{ padding: '13px 20px' }}>
                        <span style={{ background: badge.bg, color: badge.text, padding: '3px 10px',
                          borderRadius: 20, fontWeight: 700, fontSize: 11 }}>
                          {TIPO_LABEL[d.tipo as TipoAdvertencia].replace('Advertência ', '')}
                        </span>
                        {d.tipo === 'suspensao' && d.dias_suspensao && (
                          <span style={{ color: '#aaa', fontSize: 11, marginLeft: 4 }}>{d.dias_suspensao}d</span>
                        )}
                      </td>
                      <td style={{ padding: '13px 20px', color: '#555', maxWidth: 280 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              title={d.motivo}>{d.motivo}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
