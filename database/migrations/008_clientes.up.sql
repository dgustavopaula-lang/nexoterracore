CREATE TABLE IF NOT EXISTS clientes (
  id BIGSERIAL PRIMARY KEY,
  organizacao_id BIGINT NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  fazenda_id BIGINT,

  nome VARCHAR(180) NOT NULL,
  empresa VARCHAR(180),
  telefone VARCHAR(40),
  whatsapp VARCHAR(40),
  email VARCHAR(180),

  cidade VARCHAR(120),
  uf CHAR(2),

  interesse VARCHAR(160),
  status VARCHAR(60) NOT NULL DEFAULT 'Potencial cliente',
  origem VARCHAR(120),

  proximo_contato_em TIMESTAMPTZ,
  anotacoes TEXT,

  dados_extras JSONB NOT NULL DEFAULT '{}'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,

  criado_por_usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  atualizado_por_usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,

  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_clientes_fazenda_organizacao
    FOREIGN KEY (fazenda_id, organizacao_id)
    REFERENCES fazendas(id, organizacao_id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_clientes_organizacao
  ON clientes (organizacao_id, ativo);

CREATE INDEX IF NOT EXISTS idx_clientes_status
  ON clientes (organizacao_id, status);

CREATE INDEX IF NOT EXISTS idx_clientes_proximo_contato
  ON clientes (organizacao_id, proximo_contato_em);
