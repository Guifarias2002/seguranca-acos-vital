export type TipoAdvertencia = 'verbal' | 'escrita' | 'suspensao'

export interface Setor {
  id: number
  nome: string
}

export interface Colaborador {
  id: string
  nome: string
  setor_id: number
  ativo: boolean
  criado_em: string
  setores?: Setor
}

export interface Advertencia {
  id: string
  colaborador_id: string
  data: string
  tipo: TipoAdvertencia
  motivo: string
  dias_suspensao?: number | null
  registrado_por?: string
  criado_em: string
}

export interface AdvertenciaView {
  id: string
  data: string
  tipo: TipoAdvertencia
  motivo: string
  dias_suspensao?: number | null
  registrado_por?: string
  criado_em: string
  colaborador: string
  setor: string
}

export const TIPO_LABEL: Record<TipoAdvertencia, string> = {
  verbal:    'Advertência Verbal',
  escrita:   'Advertência Escrita',
  suspensao: 'Suspensão',
}

export const TIPO_COR: Record<TipoAdvertencia, string> = {
  verbal:    'bg-yellow-100 text-yellow-800',
  escrita:   'bg-orange-100 text-orange-800',
  suspensao: 'bg-red-100 text-red-800',
}
