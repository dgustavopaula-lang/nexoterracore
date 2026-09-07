BEGIN;

-- Uma mesma referência de pagamento do gateway não pode
-- liquidar dois pedidos diferentes.
CREATE UNIQUE INDEX IF NOT EXISTS uq_ntcoin_gateway_reference
ON ntcoin_orders (gateway, referencia_externa)
WHERE referencia_externa IS NOT NULL;

-- Uma compra liquidada deve gerar no máximo um lançamento
-- de crédito no ledger.
CREATE UNIQUE INDEX IF NOT EXISTS uq_ntcoin_compra_reference
ON ntcoin_transactions (referencia)
WHERE tipo = 'COMPRA'
  AND referencia IS NOT NULL;

COMMIT;
