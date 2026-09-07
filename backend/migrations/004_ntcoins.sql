BEGIN;

-- =========================================================
-- NEXOTERRACORE — NTCOINS
-- Crédito interno de utilidade do ecossistema
-- =========================================================

CREATE TABLE IF NOT EXISTS ntcoin_wallets (
    id BIGSERIAL PRIMARY KEY,
    organizacao_id BIGINT NOT NULL,
    usuario_id BIGINT,
    saldo NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (saldo >= 0),
    admin_isento BOOLEAN NOT NULL DEFAULT FALSE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (organizacao_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS ntcoin_transactions (
    id BIGSERIAL PRIMARY KEY,
    wallet_id BIGINT NOT NULL REFERENCES ntcoin_wallets(id),
    organizacao_id BIGINT NOT NULL,
    usuario_id BIGINT,

    tipo VARCHAR(30) NOT NULL CHECK (
        tipo IN (
            'CREDITO',
            'DEBITO',
            'RECOMPENSA',
            'COMPRA',
            'BONUS',
            'AJUSTE',
            'ESTORNO',
            'ADMIN_ISENTO'
        )
    ),

    quantidade NUMERIC(18,2) NOT NULL CHECK (quantidade > 0),

    saldo_anterior NUMERIC(18,2) NOT NULL,
    saldo_posterior NUMERIC(18,2) NOT NULL,

    descricao TEXT,
    referencia VARCHAR(150),

    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ntcoin_wallet_org
ON ntcoin_wallets (organizacao_id);

CREATE INDEX IF NOT EXISTS idx_ntcoin_tx_wallet
ON ntcoin_transactions (wallet_id);

CREATE INDEX IF NOT EXISTS idx_ntcoin_tx_org
ON ntcoin_transactions (organizacao_id);

CREATE INDEX IF NOT EXISTS idx_ntcoin_tx_created
ON ntcoin_transactions (criado_em DESC);

COMMIT;
