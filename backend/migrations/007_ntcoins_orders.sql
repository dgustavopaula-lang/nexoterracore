BEGIN;

CREATE TABLE IF NOT EXISTS ntcoin_orders (
    id BIGSERIAL PRIMARY KEY,

    pedido_id VARCHAR(80) NOT NULL UNIQUE,

    organizacao_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,

    pacote_codigo VARCHAR(80) NOT NULL,

    ntcoins NUMERIC(18,2) NOT NULL CHECK (ntcoins > 0),
    bonus_ntcoins NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (bonus_ntcoins >= 0),
    preco_brl NUMERIC(12,2) NOT NULL CHECK (preco_brl >= 0),

    gateway VARCHAR(40),

    status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE'
        CHECK (
            status IN (
                'PENDENTE',
                'PROCESSANDO',
                'PAGO',
                'CANCELADO',
                'EXPIRADO',
                'ESTORNADO'
            )
        ),

    referencia_externa VARCHAR(200),

    idempotency_key VARCHAR(150),

    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pago_em TIMESTAMPTZ,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (organizacao_id, usuario_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_ntcoin_orders_org
ON ntcoin_orders (organizacao_id);

CREATE INDEX IF NOT EXISTS idx_ntcoin_orders_user
ON ntcoin_orders (usuario_id);

CREATE INDEX IF NOT EXISTS idx_ntcoin_orders_status
ON ntcoin_orders (status);

COMMIT;
