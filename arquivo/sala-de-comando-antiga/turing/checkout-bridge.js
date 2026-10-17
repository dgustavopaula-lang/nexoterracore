(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const pacote = String(params.get("comprar") || "").trim();
  const pacotesPermitidos = new Set([
    "NTC_START",
    "NTC_PRO",
    "NTC_BUSINESS"
  ]);

  // Fluxo público: Comprar -> checkout PayPal, sem pedir login antes.
  if (pacote) {
    if (!pacotesPermitidos.has(pacote)) {
      window.location.replace("/app/turing/?paypal_error=pacote");
      return;
    }

    window.location.replace(
      "/api/ntcoins/webhook/checkout/iniciar?pacote=" +
      encodeURIComponent(pacote)
    );
    return;
  }

  const pedido = String(params.get("resgatar") || "").trim();
  const claim = String(params.get("claim") || "").trim();
  const pagamentoCancelado = params.get("paypal_cancel") === "1";
  const pagamentoErro = params.has("paypal_error");

  if (!pedido || !claim) {
    document.addEventListener("DOMContentLoaded", () => {
      if (!pagamentoCancelado && !pagamentoErro) return;

      setTimeout(() => {
        const status = document.getElementById("walletPaymentStatus");
        const walletButton = document.querySelector('[data-view-target="wallet"]');

        if (walletButton) walletButton.click();

        if (status) {
          status.textContent = pagamentoCancelado
            ? "Pagamento PayPal cancelado. Nenhum NTCoin foi debitado ou creditado."
            : "Não foi possível concluir o checkout PayPal. Tente novamente.";
        }

        history.replaceState({}, "", "/app/turing/");
      }, 0);
    });
    return;
  }

  let resgatando = false;
  const fetchOriginal = window.fetch.bind(window);

  async function resgatar(token) {
    if (!token || resgatando) return;
    resgatando = true;

    const status = document.getElementById("walletPaymentStatus");
    if (status) status.textContent = "Creditando NTCoins na sua carteira...";

    try {
      const response = await fetchOriginal(
        "/api/ntcoins/webhook/checkout/resgatar",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            pedido_id: pedido,
            claim_token: claim
          })
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.ok === false) {
        throw new Error(
          data.erro || data.mensagem || `Erro HTTP ${response.status}`
        );
      }

      if (status) {
        const quantidade = Number(data.quantidade_creditada || 0);
        status.textContent = quantidade > 0
          ? `Pagamento confirmado. ${quantidade.toLocaleString("pt-BR")} NTCoins creditados.`
          : "Pagamento confirmado. NTCoins creditados.";
      }

      history.replaceState({}, "", "/app/turing/");

      setTimeout(() => {
        const refresh = document.getElementById("refreshWallet");
        if (refresh) refresh.click();
      }, 350);

    } catch (error) {
      resgatando = false;
      if (status) {
        status.textContent =
          `Pagamento confirmado, mas o crédito precisa ser concluído: ${error.message}`;
      }
    }
  }

  // Observa a autenticação normal do Turing sem substituir o login existente.
  window.fetch = async function(input, init) {
    const response = await fetchOriginal(input, init);

    try {
      const url = typeof input === "string"
        ? input
        : String(input?.url || "");

      const autenticacaoConcluida =
        url.includes("/api/auth/login") ||
        url.includes("/api/auth/selecionar-fazenda");

      if (autenticacaoConcluida && response.ok) {
        const clone = response.clone();
        clone.json().then((data) => {
          if (data?.token) resgatar(data.token);
        }).catch(() => {});
      }
    } catch (_) {}

    return response;
  };

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      const walletButton = document.querySelector('[data-view-target="wallet"]');
      const loginSheet = document.getElementById("loginSheet");
      const loginError = document.getElementById("loginError");
      const status = document.getElementById("walletPaymentStatus");

      if (walletButton) walletButton.click();
      if (status) {
        status.textContent =
          "Pagamento PayPal confirmado. Entre para creditar os NTCoins na sua carteira.";
      }
      if (loginError) {
        loginError.textContent =
          "Pagamento confirmado. Identifique sua conta para receber os NTCoins.";
      }
      if (loginSheet) loginSheet.classList.remove("hidden");
    }, 0);
  });
})();
