CREATE TABLE IF NOT EXISTS turing_angola_radar (
  id BIGSERIAL PRIMARY KEY,

  organizacao_id BIGINT NOT NULL
    REFERENCES organizacoes(id)
    ON DELETE CASCADE,

  agente VARCHAR(80) NOT NULL DEFAULT 'Turing Angola Radar',

  pais VARCHAR(80) NOT NULL DEFAULT 'Angola',
  provincia VARCHAR(120) NOT NULL DEFAULT 'Malanje',
  municipio VARCHAR(120),

  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),

  setor VARCHAR(100) NOT NULL,
  tema VARCHAR(180) NOT NULL,
  palavra_chave VARCHAR(180),

  fonte VARCHAR(255),
  url TEXT,
  data_fonte DATE,

  resumo TEXT,
  sinal TEXT,

  relevancia INTEGER NOT NULL DEFAULT 50
    CHECK (relevancia BETWEEN 0 AND 100),

  status VARCHAR(30) NOT NULL DEFAULT 'novo'
    CHECK (status IN (
      'novo',
      'monitorando',
      'validado',
      'descartado'
    )),

  dados JSONB NOT NULL DEFAULT '{}'::jsonb,

  coletado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_turing_angola_org
ON turing_angola_radar(organizacao_id);

CREATE INDEX IF NOT EXISTS idx_turing_angola_local
ON turing_angola_radar(pais, provincia, municipio);

CREATE INDEX IF NOT EXISTS idx_turing_angola_setor
ON turing_angola_radar(setor);

CREATE INDEX IF NOT EXISTS idx_turing_angola_tema
ON turing_angola_radar(tema);

CREATE INDEX IF NOT EXISTS idx_turing_angola_relevancia
ON turing_angola_radar(relevancia DESC);

CREATE INDEX IF NOT EXISTS idx_turing_angola_coleta
ON turing_angola_radar(coletado_em DESC);
