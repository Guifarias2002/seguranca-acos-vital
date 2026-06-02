'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Colaborador, AdvertenciaView, TIPO_LABEL, TipoAdvertencia } from '@/lib/types'
import { format, parseISO } from 'date-fns'

const TIPO_BADGE: Record<TipoAdvertencia, { bg: string; text: string; dot: string }> = {
  verbal:    { bg: '#fff8e6', text: '#b45309', dot: '#f59e0b' },
  escrita:   { bg: '#fff3e6', text: '#c2410c', dot: '#f97316' },
  suspensao: { bg: '#fde8e8', text: '#b91c1c', dot: '#ef4444' },
}

export default function Colaboradores() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [advertencias, setAdvertencias] = useState<AdvertenciaView[]>([])
  const [selecionado, setSelecionado] = useState<Colaborador | null>(null)
  const [busca, setBusca] = useState('')
  const supabase = createClient()

  useEffect(() => {
    Promise.all([
      supabase.from('colaboradores').select('*, setores(nome)').eq('ativo', true).order('nome'),
      supabase.from('advertencias_view').select('*'),
    ]).then(([{ data: c }, { data: a }]) => {
      setColaboradores(c || [])
      setAdvertencias(a || [])
    })
  }, [])

  const filtrados = colaboradores.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()))

  function histColab(nome: string) {
    return advertencias.filter(a => a.colaborador === nome)
  }

  function contagem(nome: string, tipo?: string) {
    return histColab(nome).filter(a => !tipo || a.tipo === tipo).length
  }

  const hist = selecionado ? histColab(selecionado.nome) : []
  const totalSel = hist.length

  return (
    <div>
      <div className="px-10 py-7 border-b" style={{ background: '#0d1f3c', borderColor: '#1e3a6e' }}>
        <h1 className="text-2xl font-black text-white tracking-tight uppercase">Colaboradores</h1>
        <p className="text-sm mt-0.5" style={{ color: '#7a9cc4' }}>Histórico de advertências por pessoa</p>
      </div>

      <div className="p-8 max-w-6xl">
        <div className="grid gap-6" style={{ gridTemplateColumns: '280px 1fr' }}>
          {/* Lista */}
          <div className="space-y-3">
            <input type="text" placeholder="Buscar colaborador..."
              value={busca} onChange={e => setBusca(e.target.value)}
              style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '9px 14px',
                fontSize: 13, outline: 'none', width: '100%', background: '#fafbfc', color: '#0d1f3c' }} />
            <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {filtrados.map(c => {
                const total = contagem(c.nome)
                const active = selecionado?.id === c.id
                return (
                  <button key={c.id} onClick={() => setSelecionado(c)}
                    className="w-full text-left px-4 py-3.5 flex items-center justify-between transition-colors"
                    style={{
                      borderBottom: '1px solid #f5f5f5',
                      background: active ? '#fff8f0' : '#fff',
                      borderLeft: active ? '3px solid #e97b2e' : '3px solid transparent',
                    }}>
                    <div>
                      <p className="text-sm font-bold" style={{ color: '#0d1f3c' }}>{c.nome}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#888' }}>{(c.setores as any)?.nome}</p>
                    </div>
                    {total > 0 && (
                      <span className="text-xs font-black px-2 py-0.5 rounded-full"
                            style={{
                              background: total >= 3 ? '#fde8e8' : total === 2 ? '#fff3e6' : '#fff8e6',
                              color: total >= 3 ? '#b91c1c' : total === 2 ? '#c2410c' : '#b45309',
                            }}>
                        {total}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Detalhe */}
          <div>
            {!selecionado ? (
              <div className="bg-white rounded-xl shadow-sm p-12 flex flex-col items-center justify-center text-center"
                   style={{ minHeight: 300 }}>
                <div className="text-4xl mb-3">◉</div>
                <p className="text-sm font-semibold" style={{ color: '#aaa' }}>
                  Selecione um colaborador para ver o histórico
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Header do colaborador */}
                <div className="px-7 py-5" style={{ background: '#0d1f3c' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-black text-white">{selecionado.nome}</h2>
                      <p className="text-sm mt-0.5" style={{ color: '#7a9cc4' }}>
                        {(selecionado.setores as any)?.nome}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-black" style={{ color: totalSel >= 3 ? '#ef4444' : '#e97b2e' }}>
                        {totalSel}
                      </p>
                      <p className="text-xs" style={{ color: '#7a9cc4' }}>ocorrência{totalSel !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>

                {/* Contadores */}
                <div className="grid grid-cols-3 divide-x" style={{ borderBottom: '1px solid #f0f2f5' }}>
                  {(['verbal', 'escrita', 'suspensao'] as TipoAdvertencia[]).map(t => {
                    const badge = TIPO_BADGE[t]
                    const n = contagem(selecionado.nome, t)
                    return (
                      <div key={t} className="px-6 py-4 text-center" style={{ borderRight: '1px solid #f0f2f5' }}>
                        <p className="text-3xl font-black" style={{ color: badge.dot }}>{n}</p>
                        <p className="text-xs font-bold uppercase tracking-wide mt-1" style={{ color: '#888' }}>
                          {TIPO_LABEL[t].replace('Advertência ', '')}
                        </p>
                      </div>
                    )
                  })}
                </div>

                {/* Linha do tempo */}
                <div className="px-7 py-5">
                  <p className="text-xs font-black uppercase tracking-wider mb-4" style={{ color: '#0d1f3c' }}>
                    Linha do tempo
                  </p>
                  {hist.length === 0 ? (
                    <p className="text-sm" style={{ color: '#aaa' }}>Nenhuma advertência registrada.</p>
                  ) : (
                    <div className="space-y-3" style={{ maxHeight: 300, overflowY: 'auto' }}>
                      {hist.map(a => {
                        const badge = TIPO_BADGE[a.tipo as TipoAdvertencia]
                        return (
                          <div key={a.id} className="flex items-start gap-4 py-3"
                               style={{ borderBottom: '1px solid #f5f5f5' }}>
                            <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: badge.dot }} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold px-2 py-0.5 rounded"
                                      style={{ background: badge.bg, color: badge.text }}>
                                  {TIPO_LABEL[a.tipo as TipoAdvertencia].replace('Advertência ', '')}
                                </span>
                                <span className="text-xs" style={{ color: '#aaa' }}>
                                  {format(parseISO(a.data), 'dd/MM/yyyy')}
                                </span>
                                {a.tipo === 'suspensao' && a.dias_suspensao && (
                                  <span className="text-xs font-bold" style={{ color: '#ef4444' }}>
                                    {a.dias_suspensao} dia{a.dias_suspensao > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm" style={{ color: '#555' }}>{a.motivo}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
