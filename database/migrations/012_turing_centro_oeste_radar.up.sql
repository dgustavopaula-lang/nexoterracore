BEGIN;

CREATE TABLE IF NOT EXISTS turing_centro_oeste_oportunidades (
    id BIGSERIAL PRIMARY KEY,

    organizacao_id BIGINT,

    empresa VARCHAR(200) NOT NULL,
    municipio VARCHAR(120),
    estado VARCHAR(2) NOT NULL DEFAULT 'GO',

    setor VARCHAR(120),

    tipo_evidencia VARCHAR(30) NOT NULL
        DEFAULT 'HIPOTESE_COMERCIAL'
        CHECK (
            tipo_evidencia IN (
                'FATO_VERIFICADO',
                'SINAL_DE_MERCADO',
                'HIPOTESE_COMERCIAL'
            )
        ),

    evidencia TEXT,
    fonte TEXT,

    decisor VARCHAR(200),
    contato TEXT,

    oportunidade TEXT,
    proxima_acao TEXT,

    prioridade VARCHAR(20)
        CHECK (
            prioridade IS NULL OR
            prioridade IN ('ALTA', 'MEDIA', 'BAIXA')
        ),

    score INTEGER
        CHECK (
            score IS NULL OR
            score BETWEEN 0 AND 100
        ),

    status VARCHAR(30) NOT NULL DEFAULT 'RADAR',

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS
idx_turing_co_organizacao
ON turing_centro_oeste_oportunidades (organizacao_id);

CREATE INDEX IF NOT EXISTS
idx_turing_co_localizacao
ON turing_centro_oeste_oportunidades (estado, municipio);

CREATE INDEX IF NOT EXISTS
idx_turing_co_setor
ON turing_centro_oeste_oportunidades (setor);

CREATE INDEX IF NOT EXISTS
idx_turing_co_prioridade
ON turing_centro_oeste_oportunidades (prioridade);

CREATE INDEX IF NOT EXISTS
idx_turing_co_status
ON turing_centro_oeste_oportunidades (status);

COMMENT ON TABLE turing_centro_oeste_oportunidades IS
'Turing Centro-Oeste: radar de inteligencia comercial e oportunidades regionais.';

COMMENT ON COLUMN turing_centro_oeste_oportunidades.tipo_evidencia IS
'Separa fato verificado, sinal de mercado e hipotese comercial.';

COMMIT;
