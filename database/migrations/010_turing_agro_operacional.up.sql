-- Turing Agro — base operacional multitenant

CREATE TABLE agro_insumos (
  id BIGSERIAL PRIMARY KEY,
  organizacao_id BIGINT NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  fazenda_id BIGINT NOT NULL,
  nome VARCHAR(160) NOT NULL CHECK (BTRIM(nome) <> ''),
  categoria VARCHAR(100),
  fornecedor VARCHAR(180),
  quantidade NUMERIC(14,3),
  unidade VARCHAR(40),
  data_pedido DATE,
  data_prevista DATE,
  data_recebimento DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'em_transito', 'recebido', 'cancelado')),
  observacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_agro_insumos_fazenda_organizacao
    FOREIGN KEY (fazenda_id, organizacao_id)
    REFERENCES fazendas(id, organizacao_id)
    ON DELETE CASCADE
);

CREATE INDEX idx_agro_insumos_fazenda_status
ON agro_insumos(fazenda_id, status);

CREATE INDEX idx_agro_insumos_fazenda_previsao
ON agro_insumos(fazenda_id, data_prevista);


CREATE TABLE agro_estoques (
  id BIGSERIAL PRIMARY KEY,
  organizacao_id BIGINT NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  fazenda_id BIGINT NOT NULL,
  nome VARCHAR(160) NOT NULL CHECK (BTRIM(nome) <> ''),
  categoria VARCHAR(100),
  unidade VARCHAR(40) NOT NULL DEFAULT 'un',
  quantidade_atual NUMERIC(14,3) NOT NULL DEFAULT 0
    CHECK (quantidade_atual >= 0),
  quantidade_minima NUMERIC(14,3) NOT NULL DEFAULT 0
    CHECK (quantidade_minima >= 0),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_agro_estoques_fazenda_organizacao
    FOREIGN KEY (fazenda_id, organizacao_id)
    REFERENCES fazendas(id, organizacao_id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX uq_agro_estoques_item_fazenda
ON agro_estoques(fazenda_id, LOWER(nome), unidade);

CREATE INDEX idx_agro_estoques_fazenda
ON agro_estoques(fazenda_id);


CREATE TABLE agro_alertas (
  id BIGSERIAL PRIMARY KEY,
  organizacao_id BIGINT NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  fazenda_id BIGINT NOT NULL,
  agente VARCHAR(80) NOT NULL DEFAULT 'Turing Agro',
  nivel VARCHAR(20) NOT NULL
    CHECK (nivel IN ('INFORMATIVO', 'ATENÇÃO', 'CRÍTICO')),
  tipo VARCHAR(100) NOT NULL,
  chave_evento VARCHAR(255),
  item VARCHAR(180),
  mensagem TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto', 'reconhecido', 'resolvido')),
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  detectado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolvido_em TIMESTAMPTZ,

  CONSTRAINT fk_agro_alertas_fazenda_organizacao
    FOREIGN KEY (fazenda_id, organizacao_id)
    REFERENCES fazendas(id, organizacao_id)
    ON DELETE CASCADE
);

CREATE INDEX idx_agro_alertas_fazenda_status
ON agro_alertas(fazenda_id, status, detectado_em DESC);

CREATE INDEX idx_agro_alertas_nivel
ON agro_alertas(nivel, detectado_em DESC);

CREATE UNIQUE INDEX uq_agro_alerta_aberto
ON agro_alertas(fazenda_id, chave_evento)
WHERE chave_evento IS NOT NULL
  AND status IN ('aberto', 'reconhecido');


ALTER TABLE maquinas
  ADD COLUMN IF NOT EXISTS previsao_retorno DATE,
  ADD COLUMN IF NOT EXISTS motivo_indisponibilidade TEXT;
