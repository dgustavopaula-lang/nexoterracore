CREATE TABLE IF NOT EXISTS maquinas (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  modelo VARCHAR(120),
  numero_serie VARCHAR(120),
  horimetro NUMERIC(12, 1) NOT NULL DEFAULT 0,
  proxima_revisao NUMERIC(12, 1) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'Ativa',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maquinas_status
ON maquinas(status);
