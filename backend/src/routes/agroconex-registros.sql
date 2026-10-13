CREATE TABLE IF NOT EXISTS agroconex_registros (
    id BIGSERIAL PRIMARY KEY,
    organizacao_id BIGINT NOT NULL,
    fazenda_id BIGINT,
    usuario_id BIGINT NOT NULL,
    tipo VARCHAR(40) NOT NULL DEFAULT 'atividade',
    descricao TEXT,
    audio_referencia TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'registrado',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agroconex_organizacao
ON agroconex_registros (organizacao_id, criado_em DESC);
