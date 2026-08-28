CREATE TABLE organizacoes (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(160) NOT NULL CHECK (BTRIM(nome) <> ''),
  slug VARCHAR(120) NOT NULL UNIQUE CHECK (BTRIM(slug) <> ''),
  documento VARCHAR(30),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_organizacoes_documento_unico
ON organizacoes(documento)
WHERE documento IS NOT NULL AND BTRIM(documento) <> '';

CREATE TABLE fazendas (
  id BIGSERIAL PRIMARY KEY,
  organizacao_id BIGINT NOT NULL REFERENCES organizacoes(id) ON DELETE RESTRICT,
  nome VARCHAR(160) NOT NULL CHECK (BTRIM(nome) <> ''),
  codigo VARCHAR(80) NOT NULL CHECK (BTRIM(codigo) <> ''),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_fazendas_organizacao_codigo UNIQUE (organizacao_id, codigo),
  CONSTRAINT uq_fazendas_id_organizacao UNIQUE (id, organizacao_id)
);

CREATE INDEX idx_fazendas_organizacao
ON fazendas(organizacao_id);

CREATE TABLE usuarios (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(160) NOT NULL CHECK (BTRIM(nome) <> ''),
  email VARCHAR(254) NOT NULL CHECK (BTRIM(email) <> ''),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_usuarios_email_normalizado
ON usuarios(LOWER(BTRIM(email)));

CREATE TABLE perfis_acesso (
  id SMALLSERIAL PRIMARY KEY,
  codigo VARCHAR(40) NOT NULL UNIQUE CHECK (BTRIM(codigo) <> ''),
  nome VARCHAR(100) NOT NULL CHECK (BTRIM(nome) <> ''),
  escopo VARCHAR(20) NOT NULL CHECK (escopo IN ('organizacao', 'fazenda')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE usuarios_organizacoes (
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  organizacao_id BIGINT NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  perfil_id SMALLINT NOT NULL REFERENCES perfis_acesso(id) ON DELETE RESTRICT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, organizacao_id)
);

CREATE INDEX idx_usuarios_organizacoes_organizacao
ON usuarios_organizacoes(organizacao_id);

CREATE TABLE usuarios_fazendas (
  usuario_id BIGINT NOT NULL,
  organizacao_id BIGINT NOT NULL,
  fazenda_id BIGINT NOT NULL,
  perfil_id SMALLINT NOT NULL REFERENCES perfis_acesso(id) ON DELETE RESTRICT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, fazenda_id),
  CONSTRAINT fk_usuario_fazenda_vinculo_organizacao
    FOREIGN KEY (usuario_id, organizacao_id)
    REFERENCES usuarios_organizacoes(usuario_id, organizacao_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_usuario_fazenda_mesma_organizacao
    FOREIGN KEY (fazenda_id, organizacao_id)
    REFERENCES fazendas(id, organizacao_id)
    ON DELETE CASCADE
);

CREATE INDEX idx_usuarios_fazendas_fazenda
ON usuarios_fazendas(fazenda_id);

INSERT INTO perfis_acesso (codigo, nome, escopo) VALUES
  ('proprietario', 'Proprietário', 'organizacao'),
  ('administrador', 'Administrador', 'organizacao'),
  ('gerente', 'Gerente', 'fazenda'),
  ('operador', 'Operador', 'fazenda'),
  ('financeiro', 'Financeiro', 'fazenda'),
  ('consulta', 'Consulta', 'fazenda');

INSERT INTO organizacoes (nome, slug)
VALUES ('Organização Inicial', 'organizacao-inicial');

INSERT INTO fazendas (organizacao_id, nome, codigo)
SELECT id, 'Fazenda Inicial', 'fazenda-inicial'
FROM organizacoes
WHERE slug = 'organizacao-inicial';

ALTER TABLE maquinas
ADD COLUMN fazenda_id BIGINT;

ALTER TABLE lancamentos_financeiros
ADD COLUMN fazenda_id BIGINT;

UPDATE maquinas
SET fazenda_id = (
  SELECT id FROM fazendas WHERE codigo = 'fazenda-inicial'
)
WHERE fazenda_id IS NULL;

UPDATE lancamentos_financeiros
SET fazenda_id = (
  SELECT id FROM fazendas WHERE codigo = 'fazenda-inicial'
)
WHERE fazenda_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM maquinas WHERE fazenda_id IS NULL) THEN
    RAISE EXCEPTION 'Existem máquinas sem fazenda após o backfill.';
  END IF;

  IF EXISTS (SELECT 1 FROM lancamentos_financeiros WHERE fazenda_id IS NULL) THEN
    RAISE EXCEPTION 'Existem lançamentos financeiros sem fazenda após o backfill.';
  END IF;
END $$;

ALTER TABLE maquinas
  ALTER COLUMN fazenda_id SET NOT NULL,
  ADD CONSTRAINT fk_maquinas_fazenda
    FOREIGN KEY (fazenda_id) REFERENCES fazendas(id) ON DELETE RESTRICT;

ALTER TABLE lancamentos_financeiros
  ALTER COLUMN fazenda_id SET NOT NULL,
  ADD CONSTRAINT fk_financeiro_fazenda
    FOREIGN KEY (fazenda_id) REFERENCES fazendas(id) ON DELETE RESTRICT;

CREATE INDEX idx_maquinas_fazenda_criado
ON maquinas(fazenda_id, criado_em DESC);

CREATE INDEX idx_maquinas_fazenda_status
ON maquinas(fazenda_id, status);

CREATE INDEX idx_financeiro_fazenda_data
ON lancamentos_financeiros(fazenda_id, data_lancamento DESC);

CREATE INDEX idx_financeiro_fazenda_tipo
ON lancamentos_financeiros(fazenda_id, tipo);
