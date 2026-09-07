const NTCoinsConsumoService = require('../services/ntcoins-consumo-service');
const { ntcoinsAuthContext } = require('./ntcoins-auth-context');

function cobrarNTCoins(codigoServico) {
  return function ntcoinsMiddleware(req, res, next) {

    ntcoinsAuthContext(req, res, async () => {
      try {
        const {
          organizacaoId,
          usuarioId
        } = req.ntcoinsAuth;

        const resultado =
          await NTCoinsConsumoService.consumir({
            organizacaoId,
            usuarioId,
            codigo: codigoServico,
            referencia: `${req.method} ${req.originalUrl}`
          });

        req.ntcoins = resultado;

        next();

      } catch (error) {

        if (error.message === 'Saldo NTCoins insuficiente') {
          return res.status(402).json({
            ok: false,
            erro: 'Saldo NTCoins insuficiente',
            codigo: 'NTCOINS_INSUFICIENTE'
          });
        }

        return res.status(400).json({
          ok: false,
          erro: error.message
        });
      }
    });
  };
}

module.exports = {
  cobrarNTCoins
};
