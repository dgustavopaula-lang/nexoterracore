CREATE TABLE IF NOT EXISTS maquinas (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  modelo VARCHAR(120) NOT NULL DEFAULT '',
  numero_serie VARCHAR(120) NOT NULL DEFAULT '',
  operacao VARCHAR(80) NOT NULL DEFAULT '',
  horimetro NUMERIC(12, 1) NOT NULL DEFAULT 0,
  proxima_revisao NUMERIC(12, 1) NOT NULL DEFAULT 0,
  combustivel NUMERIC(12, 1) NOT NULL DEFAULT 0,
  data_operacao DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'Ativa',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE maquinas
  ADD COLUMN IF NOT EXISTS operacao VARCHAR(80) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS combustivel NUMERIC(12, 1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_operacao DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS observacao TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_maquinas_status
ON maquinas(status);

CREATE INDEX IF NOT EXISTS idx_maquinas_data
ON maquinas(data_operacao DESC);

CREATE TABLE IF NOT EXISTS lancamentos_financeiros (
  id BIGSERIAL PRIMARY KEY,
  descricao VARCHAR(160) NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  valor NUMERIC(14, 2) NOT NULL CHECK (valor > 0),
  data_lancamento DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('Receita', 'Despesa')),
  observacao TEXT NOT NULL DEFAULT '',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financeiro_data
ON lancamentos_financeiros(data_lancamento DESC);

CREATE INDEX IF NOT EXISTS idx_financeiro_tipo
ON lancamentos_financeiros(tipo);
