CREATE TABLE estacoes (
    id BIGSERIAL PRIMARY KEY,
    organizacao_id BIGINT NOT NULL REFERENCES organizacoes(id),
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id),
    codigo VARCHAR(80) NOT NULL,
    nome VARCHAR(160) NOT NULL,
    tipo VARCHAR(80) NOT NULL DEFAULT 'geral',
    descricao TEXT,
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_por_usuario_id BIGINT REFERENCES usuarios(id),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organizacao_id, fazenda_id, codigo)
);

CREATE INDEX idx_estacoes_escopo
ON estacoes (organizacao_id, fazenda_id, ativo);

CREATE TABLE dispositivos_estacao (
    id BIGSERIAL PRIMARY KEY,
    organizacao_id BIGINT NOT NULL REFERENCES organizacoes(id),
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id),
    estacao_id BIGINT NOT NULL REFERENCES estacoes(id) ON DELETE CASCADE,
    codigo VARCHAR(80) NOT NULL,
    nome VARCHAR(160) NOT NULL,
    tipo VARCHAR(80) NOT NULL,
    fabricante VARCHAR(120),
    modelo VARCHAR(120),
    numero_serie VARCHAR(160),
    protocolo VARCHAR(80),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_por_usuario_id BIGINT REFERENCES usuarios(id),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organizacao_id, fazenda_id, estacao_id, codigo)
);

CREATE TABLE medicoes_estacao (
    id BIGSERIAL PRIMARY KEY,
    organizacao_id BIGINT NOT NULL REFERENCES organizacoes(id),
    fazenda_id BIGINT NOT NULL REFERENCES fazendas(id),
    estacao_id BIGINT NOT NULL REFERENCES estacoes(id) ON DELETE CASCADE,
    dispositivo_id BIGINT REFERENCES dispositivos_estacao(id),
    metrica VARCHAR(80) NOT NULL,
    valor NUMERIC(20,6) NOT NULL,
    unidade VARCHAR(32) NOT NULL,
    origem VARCHAR(40) NOT NULL DEFAULT 'manual',
    medido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dados_extras JSONB NOT NULL DEFAULT '{}'::jsonb,
    criado_por_usuario_id BIGINT REFERENCES usuarios(id),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medicoes_estacao_tempo
ON medicoes_estacao (
    organizacao_id,
    fazenda_id,
    estacao_id,
    medido_em DESC
);
