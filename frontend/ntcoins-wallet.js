
(() => {
    "use strict";

    const API = "/api/ntcoins";

    function getAuthHeaders() {
        /*
         * Mantemos compatibilidade com o token em memória do Console.
         * Nenhum token é salvo em localStorage/sessionStorage.
         */

        if (typeof window.NTC_AUTH_HEADERS === "function") {
            return window.NTC_AUTH_HEADERS();
        }

        if (typeof window.getAuthHeaders === "function") {
            return window.getAuthHeaders();
        }

        const possibleTokens = [
            window.authToken,
            window.accessToken,
            window.token,
            window.sessionToken
        ];

        const token = possibleTokens.find(Boolean);

        return token
            ? { Authorization: `Bearer ${token}` }
            : {};
    }

    async function api(path) {
        /*
         * Se o Console possuir wrapper autenticado próprio,
         * utilizamos antes do fetch nativo.
         */
        if (typeof window.apiFetch === "function") {
            const result = await window.apiFetch(`${API}${path}`);
            if (result && typeof result.json === "function") {
                return result.json();
            }
            return result;
        }

        const response = await fetch(`${API}${path}`, {
            method: "GET",
            headers: {
                Accept: "application/json",
                ...getAuthHeaders()
            }
        });

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error("Resposta inválida da API");
        }

        if (!response.ok || data.ok === false) {
            throw new Error(
                data.erro ||
                `Erro HTTP ${response.status}`
            );
        }

        return data;
    }

    function moeda(valor) {
        const n = Number(valor || 0);

        return n.toLocaleString("pt-BR", {
            minimumFractionDigits: n % 1 ? 2 : 0,
            maximumFractionDigits: 2
        });
    }

    function dataHora(value) {
        if (!value) return "-";

        const d = new Date(value);

        if (Number.isNaN(d.getTime())) return value;

        return d.toLocaleString("pt-BR");
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function buildScreen() {
        if (document.getElementById("ntcoins-screen")) return;

        const screen = document.createElement("section");
        screen.id = "ntcoins-screen";

        screen.innerHTML = `
            <div class="ntc-shell">
                <div class="ntc-container">

                    <header class="ntc-header">
                        <div class="ntc-brand">
                            <div class="ntc-logo">NTC</div>

                            <div class="ntc-title">
                                <h1>Carteira NTCoins</h1>
                                <p>Créditos digitais de utilidade do ecossistema NexoTerraCore</p>
                            </div>
                        </div>

                        <button class="ntc-close" id="ntcoins-close">
                            Voltar ao Console
                        </button>
                    </header>

                    <div class="ntc-grid-top">

                        <article class="ntc-card ntc-balance-card">
                            <div class="ntc-label">Saldo disponível</div>

                            <div class="ntc-balance">
                                <span id="ntc-balance-value">--</span>
                                <small> NTC</small>
                            </div>

                            <div class="ntc-status">
                                <span class="ntc-dot"></span>
                                <span id="ntc-wallet-status">
                                    Carteira ativa
                                </span>
                            </div>
                        </article>

                        <article class="ntc-card">
                            <div class="ntc-label">
                                Resumo da carteira
                            </div>

                            <div class="ntc-summary">
                                <div class="ntc-mini">
                                    <span>Transações</span>
                                    <strong id="ntc-total-tx">--</strong>
                                </div>

                                <div class="ntc-mini">
                                    <span>Serviços</span>
                                    <strong id="ntc-total-services">--</strong>
                                </div>

                                <div class="ntc-mini">
                                    <span>Perfil</span>
                                    <strong id="ntc-profile">
                                        Padrão
                                    </strong>
                                </div>
                            </div>
                        </article>

                    </div>

                    <article class="ntc-card" style="margin-bottom:20px">

                        <div class="ntc-section-title">
                            <h2>Serviços NTCoins</h2>

                            <button
                                class="ntc-refresh"
                                id="ntc-refresh"
                            >
                                Atualizar
                            </button>
                        </div>

                        <div
                            class="ntc-services"
                            id="ntc-services"
                        >
                            <div class="ntc-empty">
                                Carregando serviços...
                            </div>
                        </div>

                    </article>

                    <article class="ntc-card">

                        <div class="ntc-section-title">
                            <h2>Extrato</h2>
                        </div>

                        <div class="ntc-table-wrap">
                            <table class="ntc-table">
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Operação</th>
                                        <th>Descrição</th>
                                        <th>Valor</th>
                                        <th>Saldo</th>
                                    </tr>
                                </thead>

                                <tbody id="ntc-extrato">
                                    <tr>
                                        <td colspan="5">
                                            <div class="ntc-empty">
                                                Carregando extrato...
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                    </article>

                </div>
            </div>
        `;

        document.body.appendChild(screen);

        const launcher = document.createElement("button");
        launcher.id = "ntcoins-launcher";
        launcher.innerHTML = `<strong>NTC</strong> Carteira`;

        document.body.appendChild(launcher);

        launcher.addEventListener("click", open);
        document
            .getElementById("ntcoins-close")
            .addEventListener("click", close);

        document
            .getElementById("ntc-refresh")
            .addEventListener("click", carregarTudo);
    }

    function renderSaldo(data) {
        document.getElementById(
            "ntc-balance-value"
        ).textContent = moeda(data.saldo);

        const admin = data.admin_isento === true;

        document.getElementById(
            "ntc-profile"
        ).textContent = admin ? "Admin isento" : "Usuário";

        document.getElementById(
            "ntc-wallet-status"
        ).textContent = admin
            ? "Carteira administrativa • consumo isento"
            : "Carteira ativa";
    }

    function renderServicos(data) {
        const el = document.getElementById("ntc-services");

        const services = data.servicos || [];

        document.getElementById(
            "ntc-total-services"
        ).textContent = services.length;

        if (!services.length) {
            el.innerHTML = `
                <div class="ntc-empty">
                    Nenhum serviço disponível.
                </div>
            `;
            return;
        }

        el.innerHTML = services.map(s => `
            <div class="ntc-service">

                <div class="ntc-service-category">
                    ${escapeHtml(s.categoria)}
                </div>

                <h3>${escapeHtml(s.nome)}</h3>

                <p>
                    ${escapeHtml(
                        s.descricao || "Serviço NexoTerraCore"
                    )}
                </p>

                <div class="ntc-price">
                    ${moeda(s.custo)}
                    <small> NTC</small>
                </div>

            </div>
        `).join("");
    }

    function renderExtrato(data) {
        const tbody = document.getElementById("ntc-extrato");

        const txs = data.transacoes || [];

        document.getElementById(
            "ntc-total-tx"
        ).textContent = txs.length;

        if (!txs.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="ntc-empty">
                            Nenhuma movimentação registrada.
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = txs.map(tx => {
            const tipo = String(tx.tipo || "");

            let cls = "ntc-negative";
            let sinal = "-";

            if (
                [
                    "CREDITO",
                    "COMPRA",
                    "BONUS",
                    "RECOMPENSA",
                    "ESTORNO"
                ].includes(tipo)
            ) {
                cls = "ntc-positive";
                sinal = "+";
            }

            if (tipo === "ADMIN_ISENTO") {
                cls = "ntc-isento";
                sinal = "";
            }

            return `
                <tr>
                    <td>
                        ${escapeHtml(dataHora(tx.criado_em))}
                    </td>

                    <td>
                        ${escapeHtml(tipo.replaceAll("_", " "))}
                    </td>

                    <td>
                        ${escapeHtml(
                            tx.descricao ||
                            tx.referencia ||
                            "-"
                        )}
                    </td>

                    <td class="${cls}">
                        ${
                            tipo === "ADMIN_ISENTO"
                                ? "ISENTO"
                                : `${sinal}${moeda(tx.quantidade)} NTC`
                        }
                    </td>

                    <td>
                        ${moeda(tx.saldo_posterior)} NTC
                    </td>
                </tr>
            `;
        }).join("");
    }

    function renderError(message) {
        document.getElementById("ntc-services").innerHTML = `
            <div class="ntc-error">
                ${escapeHtml(message)}
            </div>
        `;

        document.getElementById("ntc-extrato").innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="ntc-error">
                        ${escapeHtml(message)}
                    </div>
                </td>
            </tr>
        `;
    }

    async function carregarTudo() {
        try {
            const [saldo, extrato, catalogo] =
                await Promise.all([
                    api("/saldo"),
                    api("/extrato"),
                    api("/catalogo")
                ]);

            renderSaldo(saldo);
            renderExtrato(extrato);
            renderServicos(catalogo);

        } catch (error) {
            console.error("[NTCoins]", error);
            renderError(error.message);
        }
    }

    function open() {
        const screen =
            document.getElementById("ntcoins-screen");

        screen.classList.add("ntcoins-open");

        document.body.style.overflow = "hidden";

        carregarTudo();
    }

    function close() {
        document
            .getElementById("ntcoins-screen")
            .classList.remove("ntcoins-open");

        document.body.style.overflow = "";
    }

    window.NTCoinsWallet = {
        open,
        close,
        refresh: carregarTudo
    };

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            buildScreen
        );
    } else {
        buildScreen();
    }
})();

/* =========================================================
   INTEGRAÇÃO NTCOINS COM SIDEBAR
   ========================================================= */
(() => {
    function instalarNTCoinsSidebar() {
        if (document.getElementById("ntcoins-sidebar-item")) {
            return true;
        }

        const seletores = [
            ".sidebar nav",
            ".sidebar-menu",
            ".sidebar",
            "#sidebar",
            "aside nav",
            "aside"
        ];

        let sidebar = null;

        for (const seletor of seletores) {
            const elemento = document.querySelector(seletor);

            if (elemento) {
                sidebar = elemento;
                break;
            }
        }

        if (!sidebar) return false;

        const botao = document.createElement("button");

        botao.id = "ntcoins-sidebar-item";
        botao.type = "button";

        botao.innerHTML = `
            <span class="ntc-side-icon">NTC</span>
            <span class="ntc-side-text">NTCoins</span>
        `;

        botao.addEventListener("click", () => {
            if (window.NTCoinsWallet) {
                window.NTCoinsWallet.open();
            }
        });

        sidebar.appendChild(botao);

        const launcher =
            document.getElementById("ntcoins-launcher");

        if (launcher) {
            launcher.style.display = "none";
        }

        return true;
    }

    function iniciar() {
        if (instalarNTCoinsSidebar()) return;

        let tentativas = 0;

        const timer = setInterval(() => {
            tentativas++;

            if (
                instalarNTCoinsSidebar() ||
                tentativas >= 20
            ) {
                clearInterval(timer);
            }
        }, 500);
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            iniciar
        );
    } else {
        iniciar();
    }
})();

/* =========================================================
   INTEGRAÇÃO NTCOINS COM SIDEBAR
   ========================================================= */
(() => {
    function instalarNTCoinsSidebar() {
        if (document.getElementById("ntcoins-sidebar-item")) {
            return true;
        }

        const seletores = [
            ".sidebar nav",
            ".sidebar-menu",
            ".sidebar",
            "#sidebar",
            "aside nav",
            "aside"
        ];

        let sidebar = null;

        for (const seletor of seletores) {
            const elemento = document.querySelector(seletor);

            if (elemento) {
                sidebar = elemento;
                break;
            }
        }

        if (!sidebar) return false;

        const botao = document.createElement("button");

        botao.id = "ntcoins-sidebar-item";
        botao.type = "button";

        botao.innerHTML = `
            <span class="ntc-side-icon">NTC</span>
            <span class="ntc-side-text">NTCoins</span>
        `;

        botao.addEventListener("click", () => {
            if (window.NTCoinsWallet) {
                window.NTCoinsWallet.open();
            }
        });

        sidebar.appendChild(botao);

        const launcher =
            document.getElementById("ntcoins-launcher");

        if (launcher) {
            launcher.style.display = "none";
        }

        return true;
    }

    function iniciar() {
        if (instalarNTCoinsSidebar()) return;

        let tentativas = 0;

        const timer = setInterval(() => {
            tentativas++;

            if (
                instalarNTCoinsSidebar() ||
                tentativas >= 20
            ) {
                clearInterval(timer);
            }
        }, 500);
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            iniciar
        );
    } else {
        iniciar();
    }
})();
