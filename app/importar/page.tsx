'use client'
export const dynamic = 'force-dynamic'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import * as XLSX from 'xlsx'

interface Linha {
  data: string
  colaborador: string
  setor: string
  tipo: string
  motivo: string
  dias_suspensao: number | null
  registrado_por: string
  status?: 'ok' | 'erro' | 'duplicado'
  msg?: string
}

function excelDateToISO(val: unknown): string | null {
  if (!val) return null
  // Se já é string no formato dd/mm/yyyy
  if (typeof val === 'string') {
    const parts = val.trim().split('/')
    if (parts.length === 3) {
      return `${parts[2].padStart(4,'0')}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`
    }
    return null
  }
  // Serial numérico do Excel
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000))
    return date.toISOString().split('T')[0]
  }
  // Date object
  if (val instanceof Date) {
    return val.toISOString().split('T')[0]
  }
  return null
}

function normalizaTipo(val: unknown): string | null {
  const s = String(val || '').toLowerCase().trim()
  if (s.includes('verbal'))    return 'verbal'
  if (s.includes('escrita'))   return 'escrita'
  if (s.includes('suspens'))   return 'suspensao'
  return null
}

export default function Importar() {
  const [linhas, setLinhas]     = useState<Linha[]>([])
  const [etapa, setEtapa]       = useState<'idle' | 'preview' | 'importando' | 'concluido'>('idle')
  const [progresso, setProgresso] = useState(0)
  const [resumo, setResumo]     = useState({ ok: 0, erro: 0, duplicado: 0 })
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = ev.target?.result
      const wb   = XLSX.read(data, { type: 'array', cellDates: true })

      // Pega a primeira aba com dados (ignora aba de instruções)
      const abaAlvo = wb.SheetNames.find(n =>
        n.toLowerCase().includes('advertên') ||
        n.toLowerCase().includes('advertenc') ||
        n.toLowerCase().includes('2026') ||
        n.toLowerCase().includes('2025')
      ) || wb.SheetNames[0]

      const ws   = wb.Sheets[abaAlvo]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][]

      const parsed: Linha[] = []
      for (const row of rows) {
        // Pula linhas de cabeçalho e vazias
        const col0 = String(row[0] || '').trim()
        const col1 = String(row[1] || '').trim()
        if (!col0 || !col1) continue
        if (col0.toLowerCase().includes('data') || col0.toLowerCase().includes('aços')) continue

        const data    = excelDateToISO(row[0])
        const nome    = String(row[1] || '').trim()
        const setor   = String(row[2] || '').trim()
        const tipo    = normalizaTipo(row[3])
        const motivo  = String(row[4] || '').trim()
        const dias    = row[5] ? Number(row[5]) : null
        const regPor  = String(row[6] || '').trim()

        if (!data || !nome || !setor || !tipo || !motivo) continue

        parsed.push({ data, colaborador: nome, setor, tipo, motivo, dias_suspensao: dias, registrado_por: regPor })
      }

      setLinhas(parsed)
      setEtapa('preview')
    }
    reader.readAsArrayBuffer(file)
  }

  async function importar() {
    setEtapa('importando')
    setProgresso(0)

    // Carrega setores e colaboradores existentes
    const [{ data: setoresDB }, { data: colabsDB }] = await Promise.all([
      supabase.from('setores').select('id, nome'),
      supabase.from('colaboradores').select('id, nome, setor_id'),
    ])

    const setoresMap: Record<string, number> = {}
    for (const s of (setoresDB || [])) setoresMap[s.nome.toLowerCase().trim()] = s.id

    const colabsMap: Record<string, string> = {}
    for (const c of (colabsDB || [])) colabsMap[c.nome.toLowerCase().trim()] = c.id

    async function getOuCriarSetor(nome: string): Promise<number> {
      const key = nome.toLowerCase().trim()
      if (setoresMap[key]) return setoresMap[key]
      const { data } = await supabase.from('setores').insert({ nome: nome.trim() }).select().single()
      setoresMap[key] = data.id
      return data.id
    }

    async function getOuCriarColab(nome: string, setorId: number): Promise<string> {
      const key = nome.toLowerCase().trim()
      if (colabsMap[key]) return colabsMap[key]
      const { data } = await supabase.from('colaboradores')
        .insert({ nome: nome.trim(), setor_id: setorId }).select().single()
      colabsMap[key] = data.id
      return data.id
    }

    const resultado: Linha[] = []
    let ok = 0, erro = 0, duplicado = 0

    for (let i = 0; i < linhas.length; i++) {
      const l = { ...linhas[i] }
      try {
        // Verifica duplicado
        const { data: exist } = await supabase
          .from('advertencias')
          .select('id')
          .eq('data', l.data)
          .eq('tipo', l.tipo)
          .eq('motivo', l.motivo)
          .limit(1)

        if (exist && exist.length > 0) {
          l.status = 'duplicado'
          l.msg = 'Já existe no banco'
          duplicado++
        } else {
          const setorId = await getOuCriarSetor(l.setor)
          const colabId = await getOuCriarColab(l.colaborador, setorId)

          const payload: Record<string, unknown> = {
            colaborador_id: colabId,
            data: l.data,
            tipo: l.tipo,
            motivo: l.motivo,
          }
          if (l.tipo === 'suspensao' && l.dias_suspensao) payload.dias_suspensao = l.dias_suspensao
          if (l.registrado_por) payload.registrado_por = l.registrado_por

          const { error } = await supabase.from('advertencias').insert(payload)
          if (error) throw error

          l.status = 'ok'
          ok++
        }
      } catch (e: unknown) {
        l.status = 'erro'
        l.msg = e instanceof Error ? e.message : 'Erro desconhecido'
        erro++
      }

      resultado.push(l)
      setProgresso(Math.round(((i + 1) / linhas.length) * 100))
    }

    setLinhas(resultado)
    setResumo({ ok, erro, duplicado })
    setEtapa('concluido')
  }

  const TIPO_COR: Record<string, string> = {
    verbal:    '#f59e0b',
    escrita:   '#f97316',
    suspensao: '#ef4444',
  }
  const TIPO_LABEL: Record<string, string> = {
    verbal: 'Verbal', escrita: 'Escrita', suspensao: 'Suspensão',
  }

  return (
    <div>
      {/* Header */}
      <div className="px-10 py-7 border-b" style={{ background: '#0d1f3c', borderColor: '#1e3a6e' }}>
        <h1 className="text-2xl font-black text-white tracking-tight uppercase">Importar Planilha</h1>
        <p className="text-sm mt-0.5" style={{ color: '#7a9cc4' }}>
          Carregue o Excel para atualizar o banco de dados automaticamente
        </p>
      </div>

      <div className="p-8 max-w-4xl space-y-6">

        {/* Upload */}
        {(etapa === 'idle' || etapa === 'preview') && (
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all"
            style={{ borderColor: '#e97b2e', background: '#fff8f0' }}
          >
            <div className="text-4xl mb-3">📂</div>
            <p className="font-black text-lg" style={{ color: '#0d1f3c' }}>
              {etapa === 'preview' ? 'Clique para trocar o arquivo' : 'Clique para selecionar a planilha'}
            </p>
            <p className="text-sm mt-1" style={{ color: '#aaa' }}>Aceita .xlsx e .xls</p>
            <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleArquivo} className="hidden" />
          </div>
        )}

        {/* Preview */}
        {etapa === 'preview' && linhas.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between"
                 style={{ background: '#0d1f3c' }}>
              <div>
                <p className="font-black text-white">{linhas.length} registros encontrados</p>
                <p className="text-xs mt-0.5" style={{ color: '#7a9cc4' }}>
                  Verifique os dados antes de importar
                </p>
              </div>
              <button onClick={importar}
                className="px-6 py-2.5 rounded-xl font-black text-sm text-white transition-all"
                style={{ background: '#e97b2e' }}>
                ⬆ Importar tudo
              </button>
            </div>

            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
                    {['Data','Colaborador','Setor','Tipo','Motivo'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left',
                        fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                        letterSpacing: '0.06em', color: '#0d1f3c', borderBottom: '1px solid #eee' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f5f5f5',
                      background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                      <td style={{ padding: '8px 14px', color: '#666', whiteSpace: 'nowrap' }}>{l.data}</td>
                      <td style={{ padding: '8px 14px', fontWeight: 600, color: '#0d1f3c' }}>{l.colaborador}</td>
                      <td style={{ padding: '8px 14px', color: '#666' }}>{l.setor}</td>
                      <td style={{ padding: '8px 14px' }}>
                        <span style={{ background: TIPO_COR[l.tipo] + '22',
                          color: TIPO_COR[l.tipo], fontWeight: 700,
                          padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>
                          {TIPO_LABEL[l.tipo] || l.tipo}
                        </span>
                      </td>
                      <td style={{ padding: '8px 14px', color: '#555', maxWidth: 260 }}>
                        <span style={{ display: 'block', overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.motivo}>
                          {l.motivo}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Importando */}
        {etapa === 'importando' && (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center space-y-5">
            <div className="text-4xl">⏳</div>
            <p className="font-black text-xl" style={{ color: '#0d1f3c' }}>Importando...</p>
            <div className="w-full rounded-full overflow-hidden" style={{ background: '#f0f2f5', height: 10 }}>
              <div className="h-full rounded-full transition-all"
                   style={{ width: `${progresso}%`, background: '#e97b2e' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: '#aaa' }}>{progresso}%</p>
          </div>
        )}

        {/* Concluído */}
        {etapa === 'concluido' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl shadow-sm p-7">
              <p className="font-black text-lg mb-5" style={{ color: '#0d1f3c' }}>
                ✅ Importação concluída!
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl p-4 text-center" style={{ background: '#e6f9f0' }}>
                  <p className="text-3xl font-black" style={{ color: '#059669' }}>{resumo.ok}</p>
                  <p className="text-xs font-bold uppercase mt-1" style={{ color: '#059669' }}>Importados</p>
                </div>
                <div className="rounded-xl p-4 text-center" style={{ background: '#fff8e6' }}>
                  <p className="text-3xl font-black" style={{ color: '#d97706' }}>{resumo.duplicado}</p>
                  <p className="text-xs font-bold uppercase mt-1" style={{ color: '#d97706' }}>Duplicados</p>
                </div>
                <div className="rounded-xl p-4 text-center" style={{ background: '#fde8e8' }}>
                  <p className="text-3xl font-black" style={{ color: '#dc2626' }}>{resumo.erro}</p>
                  <p className="text-xs font-bold uppercase mt-1" style={{ color: '#dc2626' }}>Erros</p>
                </div>
              </div>
            </div>

            {/* Resultado linha a linha */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-3" style={{ background: '#0d1f3c' }}>
                <p className="text-xs font-black uppercase tracking-wider text-white">Resultado por linha</p>
              </div>
              <div style={{ maxHeight: 350, overflowY: 'auto' }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <tbody>
                    {linhas.map((l, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                        <td style={{ padding: '8px 14px', width: 24 }}>
                          {l.status === 'ok'        && <span style={{ color: '#059669' }}>✓</span>}
                          {l.status === 'duplicado' && <span style={{ color: '#d97706' }}>⟳</span>}
                          {l.status === 'erro'      && <span style={{ color: '#dc2626' }}>✕</span>}
                        </td>
                        <td style={{ padding: '8px 14px', fontWeight: 600, color: '#0d1f3c' }}>{l.colaborador}</td>
                        <td style={{ padding: '8px 14px', color: '#666' }}>{l.data}</td>
                        <td style={{ padding: '8px 14px' }}>
                          <span style={{ color: TIPO_COR[l.tipo], fontWeight: 700, fontSize: 11 }}>
                            {TIPO_LABEL[l.tipo] || l.tipo}
                          </span>
                        </td>
                        <td style={{ padding: '8px 14px', color: '#aaa', fontSize: 11 }}>
                          {l.msg || (l.status === 'ok' ? 'Importado com sucesso' : '')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              onClick={() => { setEtapa('idle'); setLinhas([]); if (inputRef.current) inputRef.current.value = '' }}
              className="px-6 py-3 rounded-xl font-black text-sm text-white"
              style={{ background: '#0d1f3c' }}>
              Importar outro arquivo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
