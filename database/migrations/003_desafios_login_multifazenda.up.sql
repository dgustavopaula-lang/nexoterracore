CREATE TABLE desafios_login (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  desafio_hash CHAR(64) NOT NULL UNIQUE,
  expira_em TIMESTAMPTZ NOT NULL,
  consumido_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_desafio_login_expiracao CHECK (expira_em > criado_em)
);

CREATE INDEX idx_desafios_login_usuario_ativos
ON desafios_login(usuario_id, expira_em)
WHERE consumido_em IS NULL;
