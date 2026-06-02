-- =====================================================
-- AÇOS VITAL — Sistema de Advertências
-- Rodar no SQL Editor do Supabase
-- =====================================================

-- Tabela de setores
CREATE TABLE IF NOT EXISTS setores (
  id   SERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE
);

INSERT INTO setores (nome) VALUES
  ('Telhas'), ('Caldeiraria'), ('Grade de Piso'), ('Oxicorte Maçarico'),
  ('Vendas'), ('PCP'), ('Expedição'), ('Usinagem'), ('Acabamento'),
  ('Logística Interna'), ('Compras'), ('Qualidade'), ('Desenho'),
  ('Motorista'), ('RH'), ('Administrativo')
ON CONFLICT DO NOTHING;

-- Tabela de colaboradores
CREATE TABLE IF NOT EXISTS colaboradores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL,
  setor_id   INTEGER REFERENCES setores(id),
  ativo      BOOLEAN DEFAULT TRUE,
  criado_em  TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de advertências
CREATE TABLE IF NOT EXISTS advertencias (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id  UUID REFERENCES colaboradores(id) ON DELETE CASCADE,
  data            DATE NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('verbal', 'escrita', 'suspensao')),
  motivo          TEXT NOT NULL,
  dias_suspensao  INTEGER,
  registrado_por  TEXT,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- View útil para listagem com joins
CREATE OR REPLACE VIEW advertencias_view AS
SELECT
  a.id,
  a.data,
  a.tipo,
  a.motivo,
  a.dias_suspensao,
  a.registrado_por,
  a.criado_em,
  c.nome       AS colaborador,
  s.nome       AS setor
FROM advertencias a
JOIN colaboradores c ON c.id = a.colaborador_id
JOIN setores s       ON s.id = c.setor_id
ORDER BY a.data DESC;

-- RLS: apenas usuários autenticados acessam
ALTER TABLE setores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertencias  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados leem setores"
  ON setores FOR SELECT TO authenticated USING (true);

CREATE POLICY "autenticados leem colaboradores"
  ON colaboradores FOR ALL TO authenticated USING (true);

CREATE POLICY "autenticados gerenciam advertencias"
  ON advertencias FOR ALL TO authenticated USING (true);
