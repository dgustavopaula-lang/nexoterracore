const pool = require('../db');
const NTCoinsService = require('./ntcoins-service');

class NTCoinsConsumoService {

  static async obterServico(codigo) {
    const { rows } = await pool.query(
      `
      SELECT
        codigo,
        nome,
        descricao,
        custo,
        categoria,
        ativo
      FROM ntcoin_catalog
      WHERE codigo = $1
      LIMIT 1
      `,
      [codigo]
    );

    if (!rows.length) {
      throw new Error('Serviço NTCoins não encontrado');
    }

    if (!rows[0].ativo) {
      throw new Error('Serviço NTCoins desativado');
    }

    return rows[0];
  }

  static async consumir({
    organizacaoId,
    usuarioId,
    codigo,
    referencia = null
  }) {

    const servico = await this.obterServico(codigo);

    const custo = Number(servico.custo);

    if (custo === 0) {
      return {
        ok: true,
        cobrado: false,
        codigo: servico.codigo,
        servico: servico.nome,
        custo: 0,
        mensagem: 'Serviço sem cobrança'
      };
    }

    const transacao = await NTCoinsService.debitar({
      organizacaoId,
      usuarioId,
      quantidade: custo,
      descricao: `Consumo: ${servico.nome}`,
      referencia: referencia || codigo
    });

    return {
      ok: true,
      cobrado: transacao.tipo !== 'ADMIN_ISENTO',
      isento: transacao.tipo === 'ADMIN_ISENTO',
      codigo: servico.codigo,
      servico: servico.nome,
      custo,
      transacao
    };
  }

}

module.exports = NTCoinsConsumoService;
