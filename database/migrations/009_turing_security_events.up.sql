CREATE TABLE IF NOT EXISTS turing_security_events (
  id BIGSERIAL PRIMARY KEY,
  agente VARCHAR(64) NOT NULL DEFAULT 'Turing',
  evento VARCHAR(100) NOT NULL,
  estado VARCHAR(16) NOT NULL
    CHECK (estado IN ('PASS', 'WARN', 'ALERT')),
  banco VARCHAR(32),
  modo VARCHAR(40) NOT NULL DEFAULT 'observacao',
  duracao_ms INTEGER,
  contexto JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_turing_security_events_criado_em
  ON turing_security_events (criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_turing_security_events_estado
  ON turing_security_events (estado);

CREATE INDEX IF NOT EXISTS idx_turing_security_events_evento
  ON turing_security_events (evento);
