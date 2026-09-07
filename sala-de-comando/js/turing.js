const TuringChat = {
  endpoint: "/api/assistente/perguntar",

  get apiBase() {
    return typeof SalaDeComando !== "undefined"
      ? SalaDeComando.apiBase
      : (["localhost", "127.0.0.1"].includes(window.location.hostname)
          ? "http://localhost:3000"
          : "https://nexoterracore-api.onrender.com");
  },

  get token() {
    return (
      (typeof SalaDeComando !== "undefined" && SalaDeComando.token) ||
      window.nexoAuthToken ||
      window.authToken ||
      window.sessionToken ||
      window.token ||
      null
    );
  },

  escapar(valor) {
    return String(valor ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  },

  formatar(texto) {
    let seguro = this.escapar(texto);

    seguro = seguro
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");

    return seguro;
  },

  atualizarStatus() {
    const status = document.querySelector("#turingStatus");
    if (!status) return;

    if (this.token) {
      status.textContent = "Turing online · sessão autenticada";
      status.className = "turing-status online";
    } else {
      status.textContent = "Turing aguardando login";
      status.className = "turing-status";
    }
  },

  adicionarMensagem(tipo, conteudo) {
    const area = document.querySelector("#turingMensagens");
    if (!area) return;

    const mensagem = document.createElement("div");
    mensagem.className = `turing-message ${tipo}`;

    const titulo = tipo === "usuario" ? "Você" : "Turing";

    mensagem.innerHTML = `
      <div class="turing-message-author">${titulo}</div>
      <div class="turing-message-content">${this.formatar(conteudo)}</div>
    `;

    area.appendChild(mensagem);
    area.scrollTop = area.scrollHeight;

    return mensagem;
  },

  async perguntar() {
    const input = document.querySelector("#turingInput");
    const btn = document.querySelector("#btnTuringEnviar");

    if (!input || !btn) return;

    const pergunta = input.value.trim();
    if (!pergunta) return;

    if (!this.token) {
      this.adicionarMensagem(
        "turing",
        "Acesse a Sala de Comando primeiro. Preciso de uma sessão autenticada para consultar o núcleo NexoTerraCore."
      );

      document.querySelector("#modalLogin")?.classList.remove("oculto");
      this.atualizarStatus();
      return;
    }

    this.adicionarMensagem("usuario", pergunta);
    input.value = "";

    btn.disabled = true;
    btn.textContent = "Consultando...";

    const placeholder = this.adicionarMensagem(
      "turing",
      "Consultando o núcleo NexoTerraCore..."
    );

    try {
      const response = await fetch(`${this.apiBase}${this.endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`
        },
        body: JSON.stringify({
          pergunta
        })
      });

      let result = {};

      try {
        result = await response.json();
      } catch {
        throw new Error(`Resposta inválida da API · HTTP ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(
          result.erro ||
          result.mensagem ||
          `Erro HTTP ${response.status}`
        );
      }

      const resposta =
        result.resposta ||
        result.answer ||
        result.mensagem ||
        "O Turing respondeu sem conteúdo textual.";

      if (placeholder) {
        placeholder.querySelector(".turing-message-content").innerHTML =
          this.formatar(resposta);
      }

      if (Array.isArray(result.fontes) && result.fontes.length) {
        const fontes = document.createElement("div");
        fontes.className = "turing-fontes";
        fontes.textContent = `Fontes: ${result.fontes
          .map((f) => typeof f === "string" ? f : JSON.stringify(f))
          .join(" · ")}`;

        placeholder?.appendChild(fontes);
      }
    } catch (erro) {
      console.error("Turing:", erro);

      if (placeholder) {
        placeholder.querySelector(".turing-message-content").innerHTML =
          this.formatar(`Falha ao consultar o Turing: ${erro.message}`);
        placeholder.classList.add("erro");
      }
    } finally {
      btn.disabled = false;
      btn.textContent = "Enviar";
      this.atualizarStatus();
      input.focus();
    }
  },

  limpar() {
    const area = document.querySelector("#turingMensagens");
    if (!area) return;

    area.innerHTML = "";

    this.adicionarMensagem(
      "turing",
      "Olá. Eu sou o Turing, agente de IA do NexoTerraCore. Posso trabalhar com o contexto autorizado da sua sessão e dos módulos conectados ao Console."
    );
  },

  iniciar() {
    const btn = document.querySelector("#btnTuringEnviar");
    const limpar = document.querySelector("#btnTuringLimpar");
    const input = document.querySelector("#turingInput");
    const menu = document.querySelector('[data-view="turing"]');

    if (!btn || !input) return;

    btn.addEventListener("click", () => this.perguntar());

    limpar?.addEventListener("click", () => this.limpar());

    input.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter" && (evento.ctrlKey || evento.metaKey)) {
        evento.preventDefault();
        this.perguntar();
      }
    });

    menu?.addEventListener("click", () => {
      this.atualizarStatus();
      setTimeout(() => input.focus(), 50);
    });

    this.limpar();
    this.atualizarStatus();

    console.log("Turing Chat integrado ao NexoTerraCore Console");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  TuringChat.iniciar();
});
