CREATE TABLE api_keys (
  id BIGSERIAL PRIMARY KEY,
  organizacao_id BIGINT NOT NULL REFERENCES organizacoes(id) ON DELETE RESTRICT,
  nome VARCHAR(160) NOT NULL CHECK (BTRIM(nome) <> ''),
  prefixo VARCHAR(40) NOT NULL CHECK (BTRIM(prefixo) <> ''),
  chave_hash CHAR(64) NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  expira_em TIMESTAMPTZ,
  ultimo_uso_em TIMESTAMPTZ,
  revogado_em TIMESTAMPTZ,
  criado_por_usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_keys_organizacao
ON api_keys(organizacao_id);

CREATE INDEX idx_api_keys_organizacao_ativo
ON api_keys(organizacao_id, ativo);
