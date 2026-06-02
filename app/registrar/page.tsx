'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Setor, Colaborador, TipoAdvertencia, TIPO_LABEL } from '@/lib/types'

const TIPO_STYLE: Record<TipoAdvertencia, { active: string; border: string }> = {
  verbal:    { active: 'background:#f59e0b;color:#fff;border-color:#f59e0b', border: '#f0f2f5' },
  escrita:   { active: 'background:#f97316;color:#fff;border-color:#f97316', border: '#f0f2f5' },
  suspensao: { active: 'background:#ef4444;color:#fff;border-color:#ef4444', border: '#f0f2f5' },
}

export default function Registrar() {
  const [setores, setSetores] = useState<Setor[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [filtrados, setFiltrados] = useState<Colaborador[]>([])
  const [form, setForm] = useState({
    colaborador_id: '',
    data: new Date().toISOString().split('T')[0],
    tipo: 'verbal' as TipoAdvertencia,
    motivo: '',
    dias_suspensao: '',
  })
  const [busca, setBusca] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [novoColab, setNovoColab] = useState(false)
  const [nomeNovo, setNomeNovo] = useState('')
  const [setorNovo, setSetorNovo] = useState('')
  const supabase = createClient()

  useEffect(() => {
    Promise.all([
      supabase.from('setores').select('*').order('nome'),
      supabase.from('colaboradores').select('*, setores(nome)').eq('ativo', true).order('nome'),
    ]).then(([{ data: s }, { data: c }]) => {
      setSetores(s || [])
      setColaboradores(c || [])
      setFiltrados(c || [])
    })
  }, [])

  useEffect(() => {
    const q = busca.toLowerCase()
    setFiltrados(colaboradores.filter(c =>
      c.nome.toLowerCase().includes(q) || (c.setores?.nome || '').toLowerCase().includes(q)
    ))
  }, [busca, colaboradores])

  async function salvarNovoColab() {
    if (!nomeNovo.trim() || !setorNovo) return
    const { data } = await supabase
      .from('colaboradores')
      .insert({ nome: nomeNovo.trim(), setor_id: Number(setorNovo) })
      .select('*, setores(nome)').single()
    if (data) {
      const updated = [...colaboradores, data as Colaborador].sort((a, b) => a.nome.localeCompare(b.nome))
      setColaboradores(updated)
      setForm(f => ({ ...f, colaborador_id: data.id }))
      setBusca(data.nome)
      setNovoColab(false)
      setNomeNovo('')
      setSetorNovo('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.colaborador_id || !form.motivo) return
    setSalvando(true)
    const payload: Record<string, unknown> = {
      colaborador_id: form.colaborador_id,
      data: form.data,
      tipo: form.tipo,
      motivo: form.motivo.trim(),
    }
    if (form.tipo === 'suspensao' && form.dias_suspensao) {
      payload.dias_suspensao = Number(form.dias_suspensao)
    }
    await supabase.from('advertencias').insert(payload)
    setSalvando(false)
    setSucesso(true)
    setForm(f => ({ ...f, colaborador_id: '', motivo: '', dias_suspensao: '' }))
    setBusca('')
    setTimeout(() => setSucesso(false), 4000)
  }

  const inputStyle = {
    border: '1.5px solid #e2e8f0',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 14,
    outline: 'none',
    width: '100%',
    background: '#fafbfc',
    color: '#0d1f3c',
  }

  return (
    <div>
      {/* Header */}
      <div className="px-10 py-7 border-b" style={{ background: '#0d1f3c', borderColor: '#1e3a6e' }}>
        <h1 className="text-2xl font-black text-white tracking-tight uppercase">Registrar Advertência</h1>
        <p className="text-sm mt-0.5" style={{ color: '#7a9cc4' }}>Preencha os dados para registrar uma ocorrência</p>
      </div>

      <div className="p-8 max-w-2xl">
        {sucesso && (
          <div className="mb-6 px-5 py-4 rounded-xl flex items-center gap-3"
               style={{ background: '#e6f9f0', border: '1.5px solid #34d399', color: '#065f46' }}>
            <span className="text-lg">✓</span>
            <span className="font-semibold text-sm">Advertência registrada com sucesso!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-8 space-y-6">

          {/* Colaborador */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-2" style={{ color: '#0d1f3c' }}>
              Colaborador
            </label>
            <input
              type="text"
              placeholder="Buscar por nome ou setor..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={inputStyle}
            />
            {busca && (
              <div className="mt-1 rounded-xl overflow-hidden shadow-lg border" style={{ borderColor: '#e2e8f0', maxHeight: 220, overflowY: 'auto' }}>
                {filtrados.slice(0, 8).map(c => (
                  <button key={c.id} type="button"
                    onClick={() => { setForm(f => ({ ...f, colaborador_id: c.id })); setBusca(c.nome) }}
                    className="w-full text-left px-4 py-3 flex justify-between items-center transition-colors"
                    style={{
                      background: form.colaborador_id === c.id ? '#fff8f0' : '#fff',
                      borderBottom: '1px solid #f5f5f5',
                    }}
                  >
                    <span className="text-sm font-semibold" style={{ color: '#0d1f3c' }}>{c.nome}</span>
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#f0f2f5', color: '#666' }}>
                      {c.setores?.nome}
                    </span>
                  </button>
                ))}
                {filtrados.length === 0 && (
                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="text-sm" style={{ color: '#aaa' }}>Nenhum resultado</span>
                    <button type="button" onClick={() => setNovoColab(true)}
                      className="text-sm font-bold" style={{ color: '#e97b2e' }}>
                      + Cadastrar novo
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Novo colaborador */}
          {novoColab && (
            <div className="rounded-xl p-5 space-y-3" style={{ background: '#fff8f0', border: '1.5px solid #f97316' }}>
              <p className="text-sm font-black uppercase tracking-wide" style={{ color: '#e97b2e' }}>
                Novo colaborador
              </p>
              <input type="text" placeholder="Nome completo" value={nomeNovo}
                onChange={e => setNomeNovo(e.target.value)} style={inputStyle} />
              <select value={setorNovo} onChange={e => setSetorNovo(e.target.value)} style={inputStyle}>
                <option value="">Selecione o setor</option>
                {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
              <div className="flex gap-2">
                <button type="button" onClick={salvarNovoColab}
                  className="px-5 py-2 rounded-lg text-sm font-bold text-white"
                  style={{ background: '#e97b2e' }}>Salvar</button>
                <button type="button" onClick={() => setNovoColab(false)}
                  className="px-5 py-2 rounded-lg text-sm font-semibold" style={{ color: '#888' }}>Cancelar</button>
              </div>
            </div>
          )}

          {/* Data */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-2" style={{ color: '#0d1f3c' }}>
              Data da advertência
            </label>
            <input type="date" value={form.data}
              onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
              style={{ ...inputStyle, width: 'auto' }} required />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-3" style={{ color: '#0d1f3c' }}>
              Tipo
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['verbal', 'escrita', 'suspensao'] as TipoAdvertencia[]).map(t => {
                const active = form.tipo === t
                return (
                  <button key={t} type="button"
                    onClick={() => setForm(f => ({ ...f, tipo: t }))}
                    className="py-3 rounded-xl text-sm font-bold border-2 transition-all"
                    style={active ? {
                      background: t === 'verbal' ? '#f59e0b' : t === 'escrita' ? '#f97316' : '#ef4444',
                      color: '#fff',
                      borderColor: 'transparent',
                    } : {
                      background: '#fafbfc',
                      color: '#888',
                      borderColor: '#e2e8f0',
                    }}
                  >
                    {TIPO_LABEL[t].replace('Advertência ', '')}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Dias suspensão */}
          {form.tipo === 'suspensao' && (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-2" style={{ color: '#0d1f3c' }}>
                Dias de suspensão
              </label>
              <input type="number" min={1} value={form.dias_suspensao}
                onChange={e => setForm(f => ({ ...f, dias_suspensao: e.target.value }))}
                placeholder="ex: 1"
                style={{ ...inputStyle, width: 100 }} />
            </div>
          )}

          {/* Motivo */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-2" style={{ color: '#0d1f3c' }}>
              Motivo
            </label>
            <textarea value={form.motivo}
              onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
              rows={3} placeholder="Descreva o motivo da advertência..."
              style={{ ...inputStyle, resize: 'none' }} required />
          </div>

          <button type="submit" disabled={salvando || !form.colaborador_id}
            className="w-full py-4 rounded-xl text-sm font-black uppercase tracking-wider transition-all"
            style={{
              background: salvando || !form.colaborador_id ? '#ccc' : '#e97b2e',
              color: '#fff',
            }}>
            {salvando ? 'Salvando...' : '⚠ Registrar Advertência'}
          </button>
        </form>
      </div>
    </div>
  )
}
