const pool = require('../db');

class NTCoinsService {
  static async getWallet(organizacaoId, usuarioId) {
    const { rows } = await pool.query(
      `
      SELECT *
      FROM ntcoin_wallets
      WHERE organizacao_id = $1
        AND usuario_id = $2
        AND ativo = TRUE
      LIMIT 1
      `,
      [organizacaoId, usuarioId]
    );

    return rows[0] || null;
  }

  static async getOrCreateWallet(organizacaoId, usuarioId) {

    const ownerResult = await pool.query(
      `
      SELECT 1
      FROM ntcoin_platform_owners
      WHERE organizacao_id = $1
        AND usuario_id = $2
        AND ativo = TRUE
      LIMIT 1
      `,
      [organizacaoId, usuarioId]
    );

    const adminIsento = ownerResult.rows.length > 0;

    const { rows } = await pool.query(
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
        organizacaoId,
        usuarioId,
        adminIsento
      ]
    );

    return rows[0];
  }

  static async getSaldo(organizacaoId, usuarioId) {
    const wallet = await this.getOrCreateWallet(
      organizacaoId,
      usuarioId
    );

    return {
      wallet_id: wallet.id,
      saldo: Number(wallet.saldo),
      admin_isento: wallet.admin_isento
    };
  }

  static async creditar({
    organizacaoId,
    usuarioId,
    quantidade,
    tipo = 'CREDITO',
    descricao = null,
    referencia = null
  }) {
    quantidade = Number(quantidade);

    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      throw new Error('Quantidade de NTCoins inválida');
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const walletResult = await client.query(
        `
        INSERT INTO ntcoin_wallets (
          organizacao_id,
          usuario_id,
          saldo
        )
        VALUES ($1, $2, 0)
        ON CONFLICT (organizacao_id, usuario_id)
        DO UPDATE SET atualizado_em = NOW()
        RETURNING *
        `,
        [organizacaoId, usuarioId]
      );

      const walletId = walletResult.rows[0].id;

      const locked = await client.query(
        `
        SELECT *
        FROM ntcoin_wallets
        WHERE id = $1
        FOR UPDATE
        `,
        [walletId]
      );

      const wallet = locked.rows[0];
      const saldoAnterior = Number(wallet.saldo);
      const saldoPosterior = saldoAnterior + quantidade;

      await client.query(
        `
        UPDATE ntcoin_wallets
        SET saldo = $1,
            atualizado_em = NOW()
        WHERE id = $2
        `,
        [saldoPosterior, wallet.id]
      );

      const tx = await client.query(
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
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *
        `,
        [
          wallet.id,
          organizacaoId,
          usuarioId,
          tipo,
          quantidade,
          saldoAnterior,
          saldoPosterior,
          descricao,
          referencia
        ]
      );

      await client.query('COMMIT');

      return tx.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async debitar({
    organizacaoId,
    usuarioId,
    quantidade,
    descricao = null,
    referencia = null
  }) {
    quantidade = Number(quantidade);

    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      throw new Error('Quantidade de NTCoins inválida');
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const walletResult = await client.query(
        `
        SELECT *
        FROM ntcoin_wallets
        WHERE organizacao_id = $1
          AND usuario_id = $2
          AND ativo = TRUE
        FOR UPDATE
        `,
        [organizacaoId, usuarioId]
      );

      if (!walletResult.rows.length) {
        throw new Error('Carteira NTCoins não encontrada');
      }

      const wallet = walletResult.rows[0];
      const saldoAnterior = Number(wallet.saldo);

      if (wallet.admin_isento) {
        const tx = await client.query(
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
          VALUES ($1,$2,$3,'ADMIN_ISENTO',$4,$5,$5,$6,$7)
          RETURNING *
          `,
          [
            wallet.id,
            organizacaoId,
            usuarioId,
            quantidade,
            saldoAnterior,
            descricao || 'Operação administrativa isenta',
            referencia
          ]
        );

        await client.query('COMMIT');
        return tx.rows[0];
      }

      if (saldoAnterior < quantidade) {
        throw new Error('Saldo NTCoins insuficiente');
      }

      const saldoPosterior = saldoAnterior - quantidade;

      await client.query(
        `
        UPDATE ntcoin_wallets
        SET saldo = $1,
            atualizado_em = NOW()
        WHERE id = $2
        `,
        [saldoPosterior, wallet.id]
      );

      const tx = await client.query(
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
        VALUES ($1,$2,$3,'DEBITO',$4,$5,$6,$7,$8)
        RETURNING *
        `,
        [
          wallet.id,
          organizacaoId,
          usuarioId,
          quantidade,
          saldoAnterior,
          saldoPosterior,
          descricao,
          referencia
        ]
      );

      await client.query('COMMIT');

      return tx.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = NTCoinsService;
