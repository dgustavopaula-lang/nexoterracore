
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
            window.nexoAuthToken,
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


    async function apiPost(path, body) {
        const response = await fetch(`${API}${path}`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                ...getAuthHeaders()
            },
            body: JSON.stringify(body || {})
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
                            <div>
                                <h2>Comprar NTCoins</h2>
                                <div class="ntc-payment-subtitle">
                                    Pagamento seguro via PayPal
                                </div>
                            </div>
                        </div>

                        <div
                            class="ntc-payment-status"
                            id="ntc-payment-status"
                        ></div>

                        <div
                            class="ntc-packages"
                            id="ntc-packages"
                        >
                            <div class="ntc-empty">
                                Carregando pacotes...
                            </div>
                        </div>

                    </article>

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

        document
            .getElementById("ntc-packages")
            .addEventListener("click", event => {
                const botao =
                    event.target.closest(".ntc-buy");

                if (!botao) return;

                comprarPacote(
                    botao.dataset.package,
                    botao
                );
            });

        processarRetornoPayPal();
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


    function setPaymentStatus(message, tipo = "") {
        const el = document.getElementById("ntc-payment-status");

        if (!el) return;

        el.className =
            "ntc-payment-status" +
            (tipo ? ` ntc-payment-${tipo}` : "");

        el.textContent = message || "";
    }

    function renderPacotes(data) {
        const el = document.getElementById("ntc-packages");
        const pacotes = data.pacotes || [];

        if (!pacotes.length) {
            el.innerHTML = `
                <div class="ntc-empty">
                    Nenhum pacote disponível.
                </div>
            `;
            return;
        }

        el.innerHTML = pacotes.map(p => {
            const ntcoins = Number(p.ntcoins || 0);
            const bonus = Number(p.bonus_ntcoins || 0);
            const total = ntcoins + bonus;
            const preco = Number(p.preco_brl || 0);

            return `
                <article class="ntc-package">
                    <div class="ntc-package-name">
                        ${escapeHtml(p.nome)}
                    </div>

                    <div class="ntc-package-coins">
                        ${moeda(total)}
                        <small>NTC</small>
                    </div>

                    ${
                        bonus > 0
                            ? `<div class="ntc-package-bonus">
                                ${moeda(ntcoins)} NTC + ${moeda(bonus)} bônus
                               </div>`
                            : `<div class="ntc-package-bonus">
                                ${moeda(ntcoins)} NTCoins
                               </div>`
                    }

                    <p>
                        ${escapeHtml(
                            p.descricao ||
                            "Créditos de utilidade NexoTerraCore"
                        )}
                    </p>

                    <div class="ntc-package-price">
                        ${preco.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL"
                        })}
                    </div>

                    <button
                        type="button"
                        class="ntc-buy"
                        data-package="${escapeHtml(p.codigo)}"
                    >
                        Comprar com PayPal
                    </button>
                </article>
            `;
        }).join("");
    }

    async function comprarPacote(codigo, botao) {
        try {
            botao.disabled = true;
            botao.textContent = "Abrindo PayPal...";

            setPaymentStatus(
                "Criando pagamento seguro no PayPal..."
            );

            const resultado = await apiPost(
                "/paypal/criar",
                {
                    pacote_codigo: codigo
                }
            );

            if (!resultado.approval_url) {
                throw new Error(
                    "PayPal não retornou o endereço de pagamento"
                );
            }

            window.location.href = resultado.approval_url;

        } catch (error) {
            console.error("[NTCoins PayPal]", error);

            setPaymentStatus(
                error.message,
                "error"
            );

            botao.disabled = false;
            botao.textContent = "Comprar com PayPal";
        }
    }

    function aguardarAutenticacao() {
        return new Promise((resolve, reject) => {
            const inicio = Date.now();

            const timer = setInterval(() => {
                const headers = getAuthHeaders();

                if (headers.Authorization) {
                    clearInterval(timer);
                    resolve();
                    return;
                }

                if (Date.now() - inicio > 180000) {
                    clearInterval(timer);
                    reject(
                        new Error(
                            "Faça login novamente para concluir o pagamento."
                        )
                    );
                }
            }, 500);
        });
    }

    async function processarRetornoPayPal() {
        const params = new URLSearchParams(
            window.location.search
        );

        const modo = params.get("ntcoins");

        if (modo === "paypal-cancel") {
            history.replaceState(
                {},
                "",
                window.location.pathname
            );

            return;
        }

        if (modo !== "paypal-return") {
            return;
        }

        const pedidoId = params.get("pedido");
        const paypalOrderId = params.get("token");

        if (!pedidoId || !paypalOrderId) {
            return;
        }

        try {
            /*
             * O token do Console fica somente em memória.
             * Depois do retorno do PayPal o usuário pode precisar
             * autenticar novamente. Aguardamos a sessão aparecer.
             */
            await aguardarAutenticacao();

            const resultado = await apiPost(
                "/paypal/capturar",
                {
                    pedido_id: pedidoId,
                    paypal_order_id: paypalOrderId
                }
            );

            history.replaceState(
                {},
                "",
                window.location.pathname
            );

            open();

            setPaymentStatus(
                "Pagamento aprovado. NTCoins creditados com sucesso.",
                "success"
            );

            await carregarTudo();

            console.log(
                "[NTCoins PayPal] pagamento concluído",
                resultado
            );

        } catch (error) {
            console.error(
                "[NTCoins PayPal RETURN]",
                error
            );

            open();

            setPaymentStatus(
                error.message,
                "error"
            );
        }
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
            const [saldo, extrato, catalogo, pacotes] =
                await Promise.all([
                    api("/saldo"),
                    api("/extrato"),
                    api("/catalogo"),
                    api("/pacotes")
                ]);

            renderSaldo(saldo);
            renderExtrato(extrato);
            renderServicos(catalogo);
            renderPacotes(pacotes);

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
