BEGIN;

-- =========================================================
-- PROPRIETÁRIO DA PLATAFORMA
-- NÃO confundir com admin de um tenant cliente
-- =========================================================

CREATE TABLE IF NOT EXISTS ntcoin_platform_owners (
    id BIGSERIAL PRIMARY KEY,
    organizacao_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (organizacao_id, usuario_id)
);

-- =========================================================
-- PACOTES COMERCIAIS NTCOINS
-- Preços alteráveis sem mudar código
-- =========================================================

CREATE TABLE IF NOT EXISTS ntcoin_packages (
    id BIGSERIAL PRIMARY KEY,

    codigo VARCHAR(80) NOT NULL UNIQUE,
    nome VARCHAR(120) NOT NULL,

    ntcoins NUMERIC(18,2) NOT NULL
        CHECK (ntcoins > 0),

    preco_brl NUMERIC(12,2) NOT NULL
        CHECK (preco_brl >= 0),

    bonus_ntcoins NUMERIC(18,2) NOT NULL DEFAULT 0
        CHECK (bonus_ntcoins >= 0),

    descricao TEXT,

    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO ntcoin_packages
(
    codigo,
    nome,
    ntcoins,
    preco_brl,
    bonus_ntcoins,
    descricao
)
VALUES
(
    'NTC_START',
    'NTCoins Start',
    100,
    19.90,
    0,
    'Pacote inicial para utilização dos serviços digitais.'
),
(
    'NTC_PRO',
    'NTCoins Pro',
    500,
    79.90,
    50,
    'Pacote para uso frequente do Turing, relatórios e automações.'
),
(
    'NTC_BUSINESS',
    'NTCoins Business',
    1500,
    199.90,
    250,
    'Pacote empresarial para maior volume de utilização.'
)
ON CONFLICT (codigo)
DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_ntcoin_packages_ativo
ON ntcoin_packages (ativo);

COMMIT;
