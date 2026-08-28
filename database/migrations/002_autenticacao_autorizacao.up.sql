ALTER TABLE usuarios
  ADD COLUMN senha_hash VARCHAR(128),
  ADD COLUMN senha_salt VARCHAR(64),
  ADD COLUMN senha_atualizada_em TIMESTAMPTZ,
  ADD CONSTRAINT ck_usuarios_credencial_completa CHECK (
    (senha_hash IS NULL AND senha_salt IS NULL)
    OR
    (senha_hash IS NOT NULL AND senha_salt IS NOT NULL)
  );

INSERT INTO perfis_acesso (codigo, nome, escopo)
VALUES ('membro', 'Membro', 'organizacao');

ALTER TABLE usuarios_fazendas
ADD CONSTRAINT uq_usuario_fazenda_organizacao
UNIQUE (usuario_id, fazenda_id, organizacao_id);

CREATE TABLE sessoes_usuario (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL,
  organizacao_id BIGINT NOT NULL,
  fazenda_id BIGINT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expira_em TIMESTAMPTZ NOT NULL,
  revogada_em TIMESTAMPTZ,
  revogada_por_usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultimo_uso_em TIMESTAMPTZ,
  CONSTRAINT fk_sessao_usuario_fazenda
    FOREIGN KEY (usuario_id, fazenda_id, organizacao_id)
    REFERENCES usuarios_fazendas(usuario_id, fazenda_id, organizacao_id)
    ON DELETE CASCADE,
  CONSTRAINT ck_sessao_expiracao CHECK (expira_em > criada_em)
);

CREATE INDEX idx_sessoes_usuario_ativas
ON sessoes_usuario(usuario_id, expira_em)
WHERE revogada_em IS NULL;

CREATE INDEX idx_sessoes_organizacao
ON sessoes_usuario(organizacao_id, criada_em DESC);

CREATE TABLE auditoria_operacoes (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  organizacao_id BIGINT NOT NULL REFERENCES organizacoes(id) ON DELETE RESTRICT,
  fazenda_id BIGINT NOT NULL REFERENCES fazendas(id) ON DELETE RESTRICT,
  acao VARCHAR(20) NOT NULL CHECK (acao IN ('CREATE', 'UPDATE', 'DELETE')),
  recurso VARCHAR(80) NOT NULL CHECK (BTRIM(recurso) <> ''),
  registro_id BIGINT NOT NULL,
  detalhes JSONB NOT NULL DEFAULT '{}'::JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auditoria_fazenda_data
ON auditoria_operacoes(fazenda_id, criado_em DESC);

CREATE INDEX idx_auditoria_usuario_data
ON auditoria_operacoes(usuario_id, criado_em DESC);

ALTER TABLE maquinas
  ADD COLUMN criado_por_usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD COLUMN atualizado_por_usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE lancamentos_financeiros
  ADD COLUMN criado_por_usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD COLUMN atualizado_por_usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL;

CREATE INDEX idx_maquinas_criado_por_usuario
ON maquinas(criado_por_usuario_id)
WHERE criado_por_usuario_id IS NOT NULL;

CREATE INDEX idx_financeiro_criado_por_usuario
ON lancamentos_financeiros(criado_por_usuario_id)
WHERE criado_por_usuario_id IS NOT NULL;
