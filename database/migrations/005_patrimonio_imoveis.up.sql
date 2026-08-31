CREATE TABLE IF NOT EXISTS imoveis (
  id BIGSERIAL PRIMARY KEY,
  organizacao_id BIGINT NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  fazenda_id BIGINT REFERENCES fazendas(id) ON DELETE SET NULL,
  titulo VARCHAR(180) NOT NULL,
  tipo VARCHAR(60) NOT NULL DEFAULT 'Casa',
  status VARCHAR(60) NOT NULL DEFAULT 'Rascunho',
  endereco VARCHAR(180),
  numero VARCHAR(30),
  complemento VARCHAR(120),
  bairro VARCHAR(120),
  cidade VARCHAR(120),
  uf CHAR(2),
  cep VARCHAR(12),
  loteamento VARCHAR(160),
  quadra VARCHAR(40),
  lote VARCHAR(40),
  mapa TEXT,
  terreno_m2 NUMERIC(14,2),
  frente_m NUMERIC(12,2),
  fundo_m NUMERIC(12,2),
  area_construida_m2 NUMERIC(14,2),
  quartos INTEGER,
  vagas INTEGER,
  matricula VARCHAR(100),
  cartorio VARCHAR(220),
  valor NUMERIC(16,2),
  titular VARCHAR(180),
  observacao TEXT,
  dados_extras JSONB NOT NULL DEFAULT '{}'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_por_usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  atualizado_por_usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_imoveis_organizacao
  ON imoveis (organizacao_id, ativo);

CREATE INDEX IF NOT EXISTS idx_imoveis_matricula
  ON imoveis (matricula);

CREATE INDEX IF NOT EXISTS idx_imoveis_cidade_uf
  ON imoveis (cidade, uf);
