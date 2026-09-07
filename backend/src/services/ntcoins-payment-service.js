const pool = require('../db');

class NTCoinsPaymentService {

  /*
   * Liquidação atômica:
   *
   * 1. bloqueia o pedido
   * 2. verifica idempotência
   * 3. bloqueia/cria carteira
   * 4. credita NTCoins
   * 5. grava ledger
   * 6. marca pedido como PAGO
   *
   * Tudo na MESMA transação PostgreSQL.
   */
  static async confirmarPagamento({
    pedidoId,
    gateway,
    referenciaExterna
  }) {
    if (!pedidoId) {
      throw new Error('pedidoId obrigatório');
    }

    if (!gateway) {
      throw new Error('gateway obrigatório');
    }

    if (!referenciaExterna) {
      throw new Error('referenciaExterna obrigatória');
    }

    gateway = String(gateway).trim().toUpperCase();
    referenciaExterna = String(referenciaExterna).trim();

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      /* =====================================================
         BLOQUEIA O PEDIDO
         ===================================================== */

      const pedidoResult = await client.query(
        `
        SELECT *
        FROM ntcoin_orders
        WHERE pedido_id = $1
        FOR UPDATE
        `,
        [pedidoId]
      );

      if (!pedidoResult.rows.length) {
        throw new Error('Pedido NTCoins não encontrado');
      }

      const pedido = pedidoResult.rows[0];

      /* =====================================================
         IDEMPOTÊNCIA
         ===================================================== */

      if (pedido.status === 'PAGO') {

        if (
          pedido.referencia_externa &&
          pedido.referencia_externa !== referenciaExterna
        ) {
          throw new Error(
            'Pedido já liquidado com outra referência de pagamento'
          );
        }

        if (
          pedido.gateway &&
          pedido.gateway !== gateway
        ) {
          throw new Error(
            'Pedido já liquidado por outro gateway'
          );
        }

        const txResult = await client.query(
          `
          SELECT *
          FROM ntcoin_transactions
          WHERE referencia = $1
            AND tipo = 'COMPRA'
          LIMIT 1
          `,
          [`PEDIDO:${pedido.pedido_id}`]
        );

        await client.query('COMMIT');

        return {
          ok: true,
          idempotente: true,
          mensagem: 'Pagamento já processado anteriormente',
          pedido,
          transacao: txResult.rows[0] || null
        };
      }

      if (
        !['PENDENTE', 'PROCESSANDO'].includes(pedido.status)
      ) {
        throw new Error(
          `Pedido não pode ser pago no status ${pedido.status}`
        );
      }

      /* =====================================================
         EVITA REFERÊNCIA EXTERNA DUPLICADA
         ===================================================== */

      const refResult = await client.query(
        `
        SELECT pedido_id
        FROM ntcoin_orders
        WHERE gateway = $1
          AND referencia_externa = $2
          AND pedido_id <> $3
        LIMIT 1
        `,
        [
          gateway,
          referenciaExterna,
          pedido.pedido_id
        ]
      );

      if (refResult.rows.length) {
        throw new Error(
          'Referência de pagamento já utilizada em outro pedido'
        );
      }

      /* =====================================================
         DESCOBRE SE É OWNER DA PLATAFORMA
         ===================================================== */

      const ownerResult = await client.query(
        `
        SELECT 1
        FROM ntcoin_platform_owners
        WHERE organizacao_id = $1
          AND usuario_id = $2
          AND ativo = TRUE
        LIMIT 1
        `,
        [
          pedido.organizacao_id,
          pedido.usuario_id
        ]
      );

      const adminIsento =
        ownerResult.rows.length > 0;

      /* =====================================================
         CRIA OU BLOQUEIA CARTEIRA
         ===================================================== */

      const walletResult = await client.query(
        `
        INSERT INTO ntcoin_wallets (
          organizacao_id,
          usuario_id,
          saldo,
          admin_isento
        )
        VALUES ($1, $2, 0, $3)

        ON CONFLICT (organizacao_id, usuario_id)

        DO UPDATE SET
          admin_isento = EXCLUDED.admin_isento,
          atualizado_em = NOW()

        RETURNING *
        `,
        [
          pedido.organizacao_id,
          pedido.usuario_id,
          adminIsento
        ]
      );

      const wallet = walletResult.rows[0];

      const saldoAnterior =
        Number(wallet.saldo);

      const quantidadeBase =
        Number(pedido.ntcoins);

      const bonus =
        Number(pedido.bonus_ntcoins || 0);

      const quantidadeTotal =
        quantidadeBase + bonus;

      if (
        !Number.isFinite(quantidadeTotal) ||
        quantidadeTotal <= 0
      ) {
        throw new Error(
          'Quantidade de NTCoins do pedido inválida'
        );
      }

      const saldoPosterior =
        saldoAnterior + quantidadeTotal;

      /* =====================================================
         ATUALIZA SALDO
         ===================================================== */

      await client.query(
        `
        UPDATE ntcoin_wallets
        SET saldo = $1,
            atualizado_em = NOW()
        WHERE id = $2
        `,
        [
          saldoPosterior,
          wallet.id
        ]
      );

      /* =====================================================
         LEDGER
         ===================================================== */

      const referenciaLedger =
        `PEDIDO:${pedido.pedido_id}`;

      const txResult = await client.query(
        `
        INSERT INTO ntcoin_transactions (
          wallet_id,
          organizacao_id,
          usuario_id,
          tipo,
          quantidade,
          saldo_anterior,
          saldo_posterior,
          descricao,
          referencia
        )
        VALUES (
          $1,$2,$3,'COMPRA',$4,$5,$6,$7,$8
        )
        RETURNING *
        `,
        [
          wallet.id,
          pedido.organizacao_id,
          pedido.usuario_id,
          quantidadeTotal,
          saldoAnterior,
          saldoPosterior,
          `Compra NTCoins - ${pedido.pacote_codigo}`,
          referenciaLedger
        ]
      );

      /* =====================================================
         MARCA PEDIDO COMO PAGO
         ===================================================== */

      const pagoResult = await client.query(
        `
        UPDATE ntcoin_orders
        SET status = 'PAGO',
            gateway = $1,
            referencia_externa = $2,
            pago_em = NOW(),
            atualizado_em = NOW()
        WHERE id = $3
        RETURNING *
        `,
        [
          gateway,
          referenciaExterna,
          pedido.id
        ]
      );

      await client.query('COMMIT');

      return {
        ok: true,
        idempotente: false,
        mensagem: 'Pagamento confirmado e NTCoins creditados',
        quantidade_creditada: quantidadeTotal,
        saldo_anterior: saldoAnterior,
        saldo_atual: saldoPosterior,
        pedido: pagoResult.rows[0],
        transacao: txResult.rows[0]
      };

    } catch (error) {

      try {
        await client.query('ROLLBACK');
      } catch (_) {}

      throw error;

    } finally {
      client.release();
    }
  }
}

module.exports = NTCoinsPaymentService;
