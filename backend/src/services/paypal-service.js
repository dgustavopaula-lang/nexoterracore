class PayPalService {
  static baseURL() {
    return process.env.PAYPAL_ENV === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  static async accessToken() {
    const id = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_CLIENT_SECRET;

    if (!id || !secret) {
      throw new Error('Credenciais PayPal não configuradas');
    }

    const basic = Buffer
      .from(`${id}:${secret}`)
      .toString('base64');

    const response = await fetch(
      `${this.baseURL()}/v1/oauth2/token`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type':
            'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      }
    );

    const data = await response.json();

    if (!response.ok || !data.access_token) {
      throw new Error(
        data.error_description ||
        'Falha na autenticação PayPal'
      );
    }

    return data.access_token;
  }

  static async criarOrdem({
    pedidoId,
    valor,
    returnUrl,
    cancelUrl
  }) {
    const token = await this.accessToken();

    const response = await fetch(
      `${this.baseURL()}/v2/checkout/orders`,
      {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Prefer: 'return=representation',
          'PayPal-Request-Id': pedidoId
        },

        body: JSON.stringify({
          intent: 'CAPTURE',

          purchase_units: [{
            reference_id: pedidoId,
            custom_id: pedidoId,

            description:
              'NexoTerraCore - Compra de NTCoins',

            amount: {
              currency_code: 'BRL',
              value: Number(valor).toFixed(2)
            }
          }],

          payment_source: {
            paypal: {
              experience_context: {
                brand_name: 'NexoTerraCore',
                user_action: 'PAY_NOW',
                return_url: returnUrl,
                cancel_url: cancelUrl
              }
            }
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
        'Falha ao criar pagamento PayPal'
      );
    }

    const approval =
      data.links?.find(
        x =>
          x.rel === 'payer-action' ||
          x.rel === 'approve'
      );

    return {
      id: data.id,
      status: data.status,
      approval_url: approval?.href || null
    };
  }

  static async obterOrdem(orderId) {
    const token = await this.accessToken();

    const response = await fetch(
      `${this.baseURL()}/v2/checkout/orders/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
        'Falha ao consultar pagamento PayPal'
      );
    }

    return data;
  }

  static async capturarOrdem(orderId) {
    const token = await this.accessToken();

    const response = await fetch(
      `${this.baseURL()}/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Prefer: 'return=representation',
          'PayPal-Request-Id':
            `CAPTURE-${orderId}`
        },

        body: '{}'
      }
    );

    const data = await response.json();

    if (response.ok) {
      return data;
    }

    /*
     * Permite repetição segura do callback.
     */
    const existente =
      await this.obterOrdem(orderId);

    if (existente.status === 'COMPLETED') {
      return existente;
    }

    throw new Error(
      data.message ||
      'Pagamento PayPal ainda não foi concluído'
    );
  }
}

module.exports = PayPalService;
