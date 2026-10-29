CREATE TABLE turing_conhecimento (
    id BIGSERIAL PRIMARY KEY,
    organizacao_id BIGINT NOT NULL,
    autor_usuario_id BIGINT NOT NULL,
    area VARCHAR(120) NOT NULL,
    pergunta TEXT NOT NULL,
    resposta TEXT NOT NULL,
    fonte TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'rascunho',
    versao INTEGER NOT NULL DEFAULT 1,
    aprovado_por BIGINT,
    aprovado_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT turing_conhecimento_status_check
        CHECK (status IN ('rascunho', 'aprovado', 'rejeitado')),

    CONSTRAINT turing_conhecimento_versao_check
        CHECK (versao >= 1),

    CONSTRAINT turing_conhecimento_conteudo_check
        CHECK (
            length(trim(pergunta)) BETWEEN 1 AND 5000
            AND length(trim(resposta)) BETWEEN 1 AND 20000
        )
);

CREATE INDEX idx_turing_conhecimento_organizacao_status
    ON turing_conhecimento (organizacao_id, status);

CREATE INDEX idx_turing_conhecimento_area
    ON turing_conhecimento (organizacao_id, area);
