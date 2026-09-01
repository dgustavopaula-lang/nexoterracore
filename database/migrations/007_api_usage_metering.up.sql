CREATE TABLE api_usage (
  id BIGSERIAL PRIMARY KEY,
  organizacao_id BIGINT NOT NULL REFERENCES organizacoes(id) ON DELETE RESTRICT,
  api_key_id BIGINT NOT NULL REFERENCES api_keys(id) ON DELETE RESTRICT,
  metodo VARCHAR(10) NOT NULL,
  rota VARCHAR(255) NOT NULL,
  status_http INTEGER NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_usage_api_key
ON api_usage(api_key_id);

CREATE INDEX idx_api_usage_organizacao
ON api_usage(organizacao_id);

CREATE INDEX idx_api_usage_criado_em
ON api_usage(criado_em);
