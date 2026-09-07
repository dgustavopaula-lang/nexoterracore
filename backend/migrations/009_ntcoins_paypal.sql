BEGIN;

ALTER TABLE ntcoin_orders
ADD COLUMN IF NOT EXISTS gateway_order_id VARCHAR(200);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ntcoin_gateway_order
ON ntcoin_orders (gateway, gateway_order_id)
WHERE gateway_order_id IS NOT NULL;

COMMIT;
