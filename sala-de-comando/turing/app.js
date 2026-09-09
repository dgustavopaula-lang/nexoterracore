(() => {
  "use strict";

  const API_BASE = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:3000"
    : "https://nexoterracore-api.onrender.com";

  const paramsIniciais = new URLSearchParams(window.location.search);
  const pacotePendenteInicial = paramsIniciais.get("comprar");
  const pacotesPermitidos = new Set(["NTC_START", "NTC_PRO", "NTC_BUSINESS"]);

  const state = {
    token: null,
    challenge: null,
    user: null,
    farm: null,
    history: [],
    installPrompt: null,
    pendingPurchase: pacotesPermitidos.has(pacotePendenteInicial) ? pacotePendenteInicial : null
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatText(value) {
    return escapeHtml(value)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
  }

  function authHeaders(extra = {}) {
    return state.token ? { ...extra, Authorization: `Bearer ${state.token}` } : extra;
  }

  async function api(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: authHeaders({
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      })
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      throw new Error(`Resposta inválida da API · HTTP ${response.status}`);
    }

    if (!response.ok || data.ok === false) {
      throw new Error(data.erro || data.mensagem || `Erro HTTP ${response.status}`);
    }
    return data;
  }

  function setView(name) {
    $$(".view").forEach((view) => view.classList.toggle("active", view.dataset.view === name));
    $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.viewTarget === name));
    $("#composer").classList.toggle("hidden", name !== "chat");
    if (name === "wallet" && state.token) loadWallet();
    if (name === "history") renderHistory();
  }

  function showLogin() {
    $("#loginError").textContent = "";
    $("#loginSheet").classList.remove("hidden");
    setTimeout(() => $("#loginEmail").focus(), 50);
  }

  function hideLogin() {
    $("#loginSheet").classList.add("hidden");
  }

  function addMessage(role, text, options = {}) {
    const article = document.createElement("article");
    article.className = `message ${role}${options.error ? " error" : ""}`;
    article.innerHTML = `
      <div class="message-author">${role === "user" ? "Você" : "Turing"}</div>
      <div class="message-bubble">${formatText(text)}</div>`;
    $("#messages").appendChild(article);
    article.scrollIntoView({ behavior: "smooth", block: "end" });
    return article;
  }

  function pushHistory(question, answer) {
    state.history.unshift({ question, answer, at: new Date() });
    renderHistory();
  }

  function renderHistory() {
    const list = $("#historyList");
    if (!state.history.length) {
      list.innerHTML = '<p class="muted">Nenhuma conversa nesta sessão.</p>';
      return;
    }
    list.innerHTML = state.history.map((item, index) => `
      <article class="history-item">
        <strong>${escapeHtml(item.question)}</strong>
        <span>${escapeHtml(item.answer.slice(0, 180))}${item.answer.length > 180 ? "…" : ""}</span>
        <button class="secondary-button" type="button" data-history-index="${index}">Abrir no chat</button>
      </article>`).join("");
    list.querySelectorAll("[data-history-index]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = state.history[Number(button.dataset.historyIndex)];
        if (!item) return;
        setView("chat");
        addMessage("user", item.question);
        addMessage("turing", item.answer);
      });
    });
  }

  function updateAuthUI() {
    const logged = Boolean(state.token);
    $("#profileLoggedOut").classList.toggle("hidden", logged);
    $("#profileLoggedIn").classList.toggle("hidden", !logged);
    $("#turingStatus").textContent = logged ? "Online · sessão autenticada" : "Aguardando acesso";
    $("#turingStatus").classList.toggle("online", logged);

    if (logged) {
      const name = state.user?.nome || state.user?.email || "Usuário";
      const context = state.farm?.nome || "Contexto autorizado";
      $("#profileName").textContent = name;
      $("#profileContext").textContent = context;
      $("#accountButton").textContent = String(name).trim().charAt(0).toUpperCase() || "U";
      loadWallet();
    } else {
      $("#profileName").textContent = "Usuário";
      $("#profileContext").textContent = "Contexto ativo";
      $("#accountButton").textContent = "G";
      $("#ntcBalance").textContent = "—";
      $("#walletBalance").textContent = "—";
      $("#walletProfile").textContent = "Entre para consultar sua carteira.";
      $("#walletPackages").innerHTML = '<p class="muted">Entre para consultar os pacotes disponíveis.</p>';
      $("#walletTransactions").innerHTML = '<p class="muted">Nenhuma sessão autenticada.</p>';
    }
  }

  async function finishPendingPaypal() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("ntcoins") !== "paypal-return") return;

    const savedToken = sessionStorage.getItem("turing_paypal_token");
    const pedido = params.get("pedido") || sessionStorage.getItem("turing_paypal_pedido");
    const paypalOrderId = params.get("token") || sessionStorage.getItem("turing_paypal_order");

    if (!savedToken || !pedido || !paypalOrderId) {
      $("#walletPaymentStatus").textContent = "Pagamento retornou do PayPal. Entre novamente para concluir a confirmação.";
      setView("wallet");
      return;
    }

    state.token = savedToken;
    $("#walletPaymentStatus").textContent = "Confirmando pagamento PayPal...";
    setView("wallet");

    try {
      await api("/api/ntcoins/paypal/capturar", {
        method: "POST",
        body: JSON.stringify({ pedido_id: pedido, paypal_order_id: paypalOrderId })
      });
      $("#walletPaymentStatus").textContent = "Pagamento confirmado. NTCoins creditados.";
      await loadWallet();
    } catch (err) {
      $("#walletPaymentStatus").textContent = err.message;
    } finally {
      sessionStorage.removeItem("turing_paypal_token");
      sessionStorage.removeItem("turing_paypal_pedido");
      sessionStorage.removeItem("turing_paypal_order");
      history.replaceState({}, "", window.location.pathname);
    }
  }

  async function resumePendingPurchase() {
    const packageCode = state.pendingPurchase;
    if (!packageCode || !state.token) return;

    state.pendingPurchase = null;
    history.replaceState({}, "", window.location.pathname);
    setView("wallet");
    $("#walletPaymentStatus").textContent = "Preparando checkout PayPal...";
    await buyPackage(packageCode, null);
  }

  function activateSession(session) {
    state.token = session.token;
    state.challenge = null;
    state.user = session.usuario || null;
    state.farm = session.fazenda || null;
    $("#farmSheet").classList.add("hidden");
    hideLogin();
    updateAuthUI();
    addMessage("turing", `Acesso confirmado${state.user?.nome ? `, ${state.user.nome}` : ""}. O núcleo NexoTerraCore está disponível para esta sessão.`);
    resumePendingPurchase();
  }

  async function login(event) {
    event.preventDefault();
    const submit = $("#loginSubmit");
    const error = $("#loginError");
    error.textContent = "";
    submit.disabled = true;
    submit.textContent = "Entrando...";
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: $("#loginEmail").value.trim(),
          senha: $("#loginPassword").value
        })
      });
      if (data.requerSelecaoFazenda) {
        state.challenge = data.desafio;
        hideLogin();
        renderFarms(data.fazendas || []);
        return;
      }
      activateSession(data);
      $("#loginForm").reset();
    } catch (err) {
      error.textContent = err.message;
    } finally {
      submit.disabled = false;
      submit.textContent = "Entrar";
    }
  }

  function renderFarms(farms) {
    const list = $("#farmList");
    list.innerHTML = "";
    if (!farms.length) list.innerHTML = '<p class="muted">Nenhuma unidade disponível para esta conta.</p>';
    farms.forEach((farm) => {
      const button = document.createElement("button");
      button.className = "farm-option";
      button.type = "button";
      button.innerHTML = `<strong>${escapeHtml(farm.nome || "Unidade")}</strong><span>${escapeHtml(farm.organizacao?.nome || "Organização")}</span>`;
      button.addEventListener("click", () => selectFarm(farm.id));
      list.appendChild(button);
    });
    $("#farmSheet").classList.remove("hidden");
  }

  async function selectFarm(farmId) {
    try {
      const data = await api("/api/auth/selecionar-fazenda", {
        method: "POST",
        body: JSON.stringify({ desafio: state.challenge, fazendaId: farmId })
      });
      activateSession(data);
    } catch (err) {
      alert(err.message);
    }
  }

  async function ask(question) {
    const prompt = String(question || "").trim();
    if (!prompt) return;

    const input = $("#promptInput");
    const send = $("#sendButton");

    addMessage("user", prompt);
    input.value = "";
    autoGrowInput();
    send.disabled = true;
    send.textContent = "...";

    const placeholder = addMessage("turing", "Pensando...");

    try {
      let result;

      if (state.token) {
        result = await api("/api/assistente/perguntar", {
          method: "POST",
          body: JSON.stringify({ pergunta: prompt })
        });

        const textoPrivado =
          result.resposta || result.answer || result.mensagem || "";

        if (/não existem dados suficientes|consulta segura disponível/i.test(textoPrivado)) {
          result = await api("/api/turing/publico", {
            method: "POST",
            body: JSON.stringify({ pergunta: prompt })
          });
        }
      } else {
        result = await api("/api/turing/publico", {
          method: "POST",
          body: JSON.stringify({ pergunta: prompt })
        });
      }

      const answer =
        result.resposta ||
        result.answer ||
        result.mensagem ||
        "O Turing respondeu sem conteúdo textual.";

      placeholder.querySelector(".message-bubble").innerHTML =
        formatText(answer);

      pushHistory(prompt, answer);

      if (state.token) loadWallet();

    } catch (err) {
      placeholder.classList.add("error");
      placeholder.querySelector(".message-bubble").innerHTML =
        formatText(`Falha ao consultar o Turing: ${err.message}`);
    } finally {
      send.disabled = false;
      send.textContent = "Enviar";
      input.focus();
    }
  }

  function renderPackages(packages) {
    const container = $("#walletPackages");
    if (!Array.isArray(packages) || !packages.length) {
      container.innerHTML = '<p class="muted">Nenhum pacote disponível.</p>';
      return;
    }
    container.innerHTML = packages.map((pkg) => {
      const total = Number(pkg.ntcoins || 0) + Number(pkg.bonus_ntcoins || 0);
      const price = Number(pkg.preco_brl || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      return `<article class="transaction-item">
        <strong>${escapeHtml(pkg.nome || pkg.codigo)}</strong>
        <span>${total.toLocaleString("pt-BR")} NTC · ${price}</span>
        <button class="primary-button full" type="button" data-buy-package="${escapeHtml(pkg.codigo)}">Comprar com PayPal</button>
      </article>`;
    }).join("");
    container.querySelectorAll("[data-buy-package]").forEach((button) => {
      button.addEventListener("click", () => buyPackage(button.dataset.buyPackage, button));
    });
  }

  async function buyPackage(packageCode, button) {
    if (!state.token) {
      showLogin();
      return;
    }

    const original = button ? button.textContent : "";
    if (button) {
      button.disabled = true;
      button.textContent = "Abrindo PayPal...";
    }
    $("#walletPaymentStatus").textContent = "Criando checkout seguro...";

    try {
      const result = await api("/api/ntcoins/paypal/criar", {
        method: "POST",
        body: JSON.stringify({ pacote_codigo: packageCode })
      });
      if (!result.approval_url) throw new Error("PayPal não retornou o checkout.");
      sessionStorage.setItem("turing_paypal_token", state.token);
      sessionStorage.setItem("turing_paypal_pedido", result.pedido_id);
      sessionStorage.setItem("turing_paypal_order", result.paypal_order_id);
      window.location.href = result.approval_url;
    } catch (err) {
      $("#walletPaymentStatus").textContent = err.message;
      if (button) {
        button.disabled = false;
        button.textContent = original;
      }
    }
  }

  async function loadWallet() {
    if (!state.token) return;
    try {
      const [me, statement, packages] = await Promise.all([
        api("/api/ntcoins/me"),
        api("/api/ntcoins/extrato"),
        api("/api/ntcoins/pacotes")
      ]);
      const balance = Number(me.saldo ?? statement.saldo ?? 0);
      const formatted = Number.isFinite(balance) ? balance.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "0";
      $("#ntcBalance").textContent = formatted;
      $("#walletBalance").textContent = formatted;
      $("#walletProfile").textContent = me.admin_isento
        ? `${me.perfil || "Perfil"} · administração isenta`
        : `${me.perfil || "Perfil"} · carteira ativa`;
      renderPackages(packages.pacotes || []);
      const transactions = Array.isArray(statement.transacoes) ? statement.transacoes.slice(0, 8) : [];
      $("#walletTransactions").innerHTML = transactions.length
        ? transactions.map((tx) => `<article class="transaction-item"><strong>${escapeHtml(tx.descricao || tx.tipo || "Movimentação")}</strong><span>${Number(tx.quantidade || 0).toLocaleString("pt-BR")} NTC</span><small>${tx.criado_em ? new Date(tx.criado_em).toLocaleString("pt-BR") : ""}</small></article>`).join("")
        : '<p class="muted">Nenhuma movimentação encontrada.</p>';
    } catch (err) {
      $("#walletProfile").textContent = err.message;
    }
  }

  function logout() {
    state.token = null;
    state.challenge = null;
    state.user = null;
    state.farm = null;
    sessionStorage.removeItem("turing_paypal_token");
    updateAuthUI();
    setView("chat");
    addMessage("turing", "Sessão encerrada. Nenhum token foi mantido de forma persistente no navegador.");
  }

  function autoGrowInput() {
    const input = $("#promptInput");
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  }

  function bindEvents() {
    $$('[data-view-target]').forEach((button) => button.addEventListener("click", () => setView(button.dataset.viewTarget)));
    $("#composer").addEventListener("submit", (event) => {
      event.preventDefault();
      ask($("#promptInput").value);
    });
    $("#promptInput").addEventListener("input", autoGrowInput);
    $$(".quick-action").forEach((button) => button.addEventListener("click", () => {
      $("#promptInput").value = button.dataset.prompt || "";
      autoGrowInput();
      $("#promptInput").focus();
    }));
    $("#loginForm").addEventListener("submit", login);
    $("#closeLogin").addEventListener("click", hideLogin);
    $("#openLoginFromProfile").addEventListener("click", showLogin);
    $("#logoutButton").addEventListener("click", logout);
    $("#refreshWallet").addEventListener("click", loadWallet);
    $("#clearHistory").addEventListener("click", () => {
      state.history = [];
      renderHistory();
    });
    $("#loginSheet").addEventListener("click", (event) => {
      if (event.target === $("#loginSheet")) hideLogin();
    });
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      state.installPrompt = event;
      $("#installButton").classList.remove("hidden");
    });
    $("#installButton").addEventListener("click", async () => {
      if (!state.installPrompt) return;
      state.installPrompt.prompt();
      await state.installPrompt.userChoice;
      state.installPrompt = null;
      $("#installButton").classList.add("hidden");
    });
  }

  async function checkApi() {
    try {
      await api("/api/health");
      if (!state.token) $("#turingStatus").textContent = "Núcleo online · entre para usar";
    } catch {
      $("#turingStatus").textContent = "Núcleo indisponível";
    }
  }

  function registerPwa() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch((error) => console.error("Turing:", error));
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    bindEvents();
    updateAuthUI();
    checkApi();
    renderHistory();
    registerPwa();
    await finishPendingPaypal();

    if (state.pendingPurchase && !state.token) {
      setView("wallet");
      $("#walletPaymentStatus").textContent = "Entre para continuar a compra com PayPal.";
      showLogin();
    }
  });
})();
