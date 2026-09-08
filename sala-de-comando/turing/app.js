(() => {
  "use strict";

  const API_BASE = ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:3000"
    : "https://nexoterracore-api.onrender.com";

  const state = {
    token: null,
    challenge: null,
    user: null,
    farm: null,
    history: [],
    installPrompt: null
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
    return state.token
      ? { ...extra, Authorization: `Bearer ${state.token}` }
      : extra;
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
      <div class="message-bubble">${formatText(text)}</div>
    `;
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
      </article>
    `).join("");

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
      $("#walletTransactions").innerHTML = '<p class="muted">Nenhuma sessão autenticada.</p>';
      $("#ntcPackages").innerHTML = '<p class="muted">Entre para ver os pacotes disponíveis.</p>';
      setPaymentStatus("");
    }
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

    if (!farms.length) {
      list.innerHTML = '<p class="muted">Nenhuma unidade disponível para esta conta.</p>';
    }

    farms.forEach((farm) => {
      const button = document.createElement("button");
      button.className = "farm-option";
      button.type = "button";
      button.innerHTML = `
        <strong>${escapeHtml(farm.nome || "Unidade")}</strong>
        <span>${escapeHtml(farm.organizacao?.nome || "Organização")}</span>
      `;
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

    if (!state.token) {
      addMessage("turing", "Para consultar o núcleo NexoTerraCore, entre com sua conta.");
      showLogin();
      return;
    }

    const input = $("#promptInput");
    const send = $("#sendButton");
    addMessage("user", prompt);
    input.value = "";
    autoGrowInput();
    send.disabled = true;
    send.textContent = "...";

    const placeholder = addMessage("turing", "Consultando o núcleo NexoTerraCore...");

    try {
      const result = await api("/api/assistente/perguntar", {
        method: "POST",
        body: JSON.stringify({ pergunta: prompt })
      });

      const answer = result.resposta || result.answer || result.mensagem || "O Turing respondeu sem conteúdo textual.";
      placeholder.querySelector(".message-bubble").innerHTML = formatText(answer);
      pushHistory(prompt, answer);
      loadWallet();
    } catch (err) {
      placeholder.classList.add("error");
      placeholder.querySelector(".message-bubble").innerHTML = formatText(`Falha ao consultar o Turing: ${err.message}`);
    } finally {
      send.disabled = false;
      send.textContent = "Enviar";
      input.focus();
    }
  }

  function setPaymentStatus(message = "", type = "") {
    const el = $("#ntcPaymentStatus");
    if (!el) return;

    el.className = `payment-status${type ? ` ${type}` : ""}`;
    el.textContent = message;
  }

  function renderPackages(data) {
    const list = $("#ntcPackages");
    if (!list) return;

    const packages = Array.isArray(data?.pacotes)
      ? data.pacotes
      : [];

    if (!packages.length) {
      list.innerHTML =
        '<p class="muted">Nenhum pacote disponível neste momento.</p>';
      return;
    }

    list.innerHTML = packages.map((item) => {
      const ntcoins = Number(item.ntcoins || 0);
      const bonus = Number(item.bonus_ntcoins || 0);
      const total = ntcoins + bonus;
      const price = Number(item.preco_brl || 0);

      return `
        <article class="package-card">
          <span class="eyebrow">NTCOINS</span>

          <h3>${escapeHtml(item.nome || item.codigo || "Pacote")}</h3>

          <div class="package-amount">
            ${total.toLocaleString("pt-BR")}
            <small>NTC</small>
          </div>

          ${
            bonus > 0
              ? `<div class="package-bonus">
                   ${ntcoins.toLocaleString("pt-BR")} NTC +
                   ${bonus.toLocaleString("pt-BR")} bônus
                 </div>`
              : ""
          }

          <p>
            ${escapeHtml(
              item.descricao ||
              "Créditos internos de utilidade do NexoTerraCore."
            )}
          </p>

          <strong class="package-price">
            ${price.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            })}
          </strong>

          <button
            class="primary-button full package-buy"
            type="button"
            data-package="${escapeHtml(item.codigo)}"
          >
            Comprar com PayPal
          </button>
        </article>
      `;
    }).join("");
  }

  async function buyPackage(code, button) {
    if (!state.token) {
      showLogin();
      return;
    }

    const original = button.textContent;

    try {
      button.disabled = true;
      button.textContent = "Abrindo PayPal...";

      setPaymentStatus(
        "Criando pagamento seguro no PayPal..."
      );

      const result = await api(
        "/api/ntcoins/paypal/criar",
        {
          method: "POST",
          body: JSON.stringify({
            pacote_codigo: code
          })
        }
      );

      if (!result.approval_url) {
        throw new Error(
          "PayPal não retornou o endereço de pagamento."
        );
      }

      window.location.assign(result.approval_url);

    } catch (err) {
      setPaymentStatus(err.message, "error");
      button.disabled = false;
      button.textContent = original;
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
      const formatted = Number.isFinite(balance)
        ? balance.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
        : "0";

      $("#ntcBalance").textContent = formatted;
      $("#walletBalance").textContent = formatted;
      $("#walletProfile").textContent = me.admin_isento
        ? `${me.perfil || "Perfil"} · administração isenta`
        : `${me.perfil || "Perfil"} · carteira ativa`;

      renderPackages(packages);

      const transactions = Array.isArray(statement.transacoes) ? statement.transacoes.slice(0, 8) : [];
      $("#walletTransactions").innerHTML = transactions.length
        ? transactions.map((tx) => `
            <article class="transaction-item">
              <strong>${escapeHtml(tx.descricao || tx.tipo || "Movimentação")}</strong>
              <span>${Number(tx.quantidade || 0).toLocaleString("pt-BR")} NTC</span>
              <small>${tx.criado_em ? new Date(tx.criado_em).toLocaleString("pt-BR") : ""}</small>
            </article>
          `).join("")
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
    updateAuthUI();
    setView("chat");
    addMessage("turing", "Sessão encerrada. Nenhum token foi mantido no navegador.");
  }

  function autoGrowInput() {
    const input = $("#promptInput");
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  }

  function bindEvents() {
    $$('[data-view-target]').forEach((button) => {
      button.addEventListener("click", () => setView(button.dataset.viewTarget));
    });

    $("#composer").addEventListener("submit", (event) => {
      event.preventDefault();
      ask($("#promptInput").value);
    });

    $("#promptInput").addEventListener("input", autoGrowInput);

    $$(".quick-action").forEach((button) => {
      button.addEventListener("click", () => {
        $("#promptInput").value = button.dataset.prompt || "";
        autoGrowInput();
        $("#promptInput").focus();
      });
    });

    $("#loginForm").addEventListener("submit", login);
    $("#closeLogin").addEventListener("click", hideLogin);
    $("#openLoginFromProfile").addEventListener("click", showLogin);
    $("#logoutButton").addEventListener("click", logout);
    $("#refreshWallet").addEventListener("click", loadWallet);

    $("#ntcPackages").addEventListener("click", (event) => {
      const button = event.target.closest(".package-buy");
      if (!button) return;

      buyPackage(
        button.dataset.package,
        button
      );
    });
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
      navigator.serviceWorker.register("./service-worker.js").catch((error) => {
        console.error("Turing PWA:", error);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    updateAuthUI();
    checkApi();
    renderHistory();
    registerPwa();
  });
})();
