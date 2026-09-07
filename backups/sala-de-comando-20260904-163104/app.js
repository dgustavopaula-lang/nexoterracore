const SalaDeComando = {
  versao: "0.2.0",
  apiBase: ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:3000"
    : "https://nexoterracore-api.onrender.com",
  token: null,
  desafioLogin: null,

  async verificarAPI() {
    const status = document.querySelector(".system-status strong");

    try {
      const resposta = await fetch(`${this.apiBase}/api/health`);

      if (!resposta.ok) {
        throw new Error(`HTTP ${resposta.status}`);
      }

      const dados = await resposta.json();

      status.textContent =
        dados.api === "online" && dados.banco === "conectado"
          ? "Online · Banco conectado"
          : "Conexão parcial";
    } catch (erro) {
      console.error("Erro ao verificar API:", erro);
      status.textContent = "API indisponível";
    }
  },

  configurarNavegacao() {
    const botoes = document.querySelectorAll(".menu-item");
    const views = document.querySelectorAll(".view");

    botoes.forEach((botao) => {
      botao.addEventListener("click", () => {
        const destino = botao.dataset.view;

        botoes.forEach((item) => item.classList.remove("ativo"));
        views.forEach((view) => view.classList.remove("ativa"));

        botao.classList.add("ativo");
        document
          .querySelector(`#view-${destino}`)
          ?.classList.add("ativa");

        if (destino === "imoveis" && this.token) {
          this.carregarImoveis();
        }
      });
    });
  },

  configurarLogin() {
    const modal = document.querySelector("#modalLogin");
    const form = document.querySelector("#formLogin");
    const btnEntrar = document.querySelector("#btnEntrar");
    const btnSair = document.querySelector("#btnSair");
    const fechar = document.querySelector("#fecharLogin");

    btnEntrar.addEventListener("click", () => {
      modal.classList.remove("oculto");
      document.querySelector("#loginUsuario").focus();
    });

    fechar.addEventListener("click", () => {
      modal.classList.add("oculto");
    });

    btnSair.addEventListener("click", () => {
      this.token = null;
      this.desafioLogin = null;

      document.querySelector("#statusSessao").textContent =
        "Sessão não iniciada";

      btnEntrar.classList.remove("oculto");
      btnSair.classList.add("oculto");

      document.querySelector("#totalImoveis").textContent = "—";
      document.querySelector("#statusImoveis").textContent =
        "Aguardando acesso";
      document.querySelector("#listaImoveis").innerHTML = "";
      document.querySelector("#mensagemImoveis").textContent =
        "Entre na Sala de Comando para carregar os imóveis.";
    });

    form.addEventListener("submit", async (evento) => {
      evento.preventDefault();

      const usuario = document.querySelector("#loginUsuario").value.trim();
      const senha = document.querySelector("#loginSenha").value;
      const erro = document.querySelector("#erroLogin");

      erro.textContent = "";

      try {
        const resposta = await fetch(`${this.apiBase}/api/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: usuario,
            senha
          })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
          throw new Error(dados.erro || "Não foi possível entrar.");
        }

        if (dados.requerSelecaoFazenda) {
          this.desafioLogin = dados.desafio;
          modal.classList.add("oculto");
          this.mostrarFazendas(dados.fazendas || []);
          return;
        }

        this.ativarSessao(dados);
        modal.classList.add("oculto");
        form.reset();
      } catch (erroLogin) {
        erro.textContent = erroLogin.message;
      }
    });
  },

  mostrarFazendas(fazendas) {
    const modal = document.querySelector("#modalFazenda");
    const lista = document.querySelector("#listaFazendas");

    lista.innerHTML = "";

    fazendas.forEach((fazenda) => {
      const botao = document.createElement("button");
      botao.className = "farm-option";

      const nomeOrganizacao =
        fazenda.organizacao?.nome || "Organização";

      botao.innerHTML = `
        <strong>${this.escapar(fazenda.nome || "Unidade")}</strong>
        <span>${this.escapar(nomeOrganizacao)}</span>
      `;

      botao.addEventListener("click", () => {
        this.selecionarFazenda(fazenda.id);
      });

      lista.appendChild(botao);
    });

    modal.classList.remove("oculto");
  },

  async selecionarFazenda(fazendaId) {
    try {
      const resposta = await fetch(
        `${this.apiBase}/api/auth/selecionar-fazenda`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            desafio: this.desafioLogin,
            fazendaId
          })
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro || "Não foi possível selecionar a unidade."
        );
      }

      document.querySelector("#modalFazenda").classList.add("oculto");
      this.ativarSessao(dados);
    } catch (erro) {
      alert(erro.message);
    }
  },

  ativarSessao(sessao) {
    this.token = sessao.token;
    this.desafioLogin = null;

    const nome =
      sessao.usuario?.nome ||
      "Gustavo Admin";

    const fazenda =
      sessao.fazenda?.nome ||
      "Unidade ativa";

    document.querySelector("#statusSessao").textContent =
      `${nome} · ${fazenda}`;

    document.querySelector("#btnEntrar").classList.add("oculto");
    document.querySelector("#btnSair").classList.remove("oculto");

    this.carregarImoveis();
  },

  async carregarImoveis() {
    if (!this.token) {
      return;
    }

    const mensagem = document.querySelector("#mensagemImoveis");
    const lista = document.querySelector("#listaImoveis");
    const total = document.querySelector("#totalImoveis");
    const status = document.querySelector("#statusImoveis");

    mensagem.textContent = "Carregando imóveis...";
    lista.innerHTML = "";
    status.textContent = "Consultando banco";

    try {
      const resposta = await fetch(`${this.apiBase}/api/imoveis`, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro || "Não foi possível consultar os imóveis."
        );
      }

      total.textContent = dados.length;
      status.textContent = "Dados atualizados";

      if (!dados.length) {
        mensagem.textContent =
          "Nenhum imóvel ativo encontrado para esta organização.";
        return;
      }

      mensagem.textContent = `${dados.length} imóvel(is) encontrado(s).`;

      lista.innerHTML = dados
        .map((imovel) => {
          const localizacao = [
            imovel.endereco,
            imovel.numero,
            imovel.cidade,
            imovel.uf
          ]
            .filter(Boolean)
            .join(" · ");

          const area =
            imovel.terreno ||
            imovel.area ||
            null;

          return `
            <tr>
              <td>${this.escapar(imovel.matricula || "—")}</td>
              <td>
                <strong>${this.escapar(imovel.titulo || imovel.tipo || "Imóvel")}</strong>
              </td>
              <td>${this.escapar(localizacao || "—")}</td>
              <td>${area ? `${this.formatarNumero(area)} m²` : "—"}</td>
              <td>${this.formatarMoeda(imovel.valor)}</td>
              <td>${this.escapar(imovel.status || "Ativo")}</td>
            </tr>
          `;
        })
        .join("");
    } catch (erro) {
      console.error("Erro ao carregar imóveis:", erro);
      total.textContent = "—";
      status.textContent = "Falha na consulta";
      mensagem.textContent = erro.message;
    }
  },

  configurarAcoes() {
    document
      .querySelector("#btnAtualizarImoveis")
      .addEventListener("click", () => {
        if (!this.token) {
          document.querySelector("#modalLogin").classList.remove("oculto");
          return;
        }

        this.carregarImoveis();
      });
  },

  escapar(valor) {
    return String(valor)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  },

  formatarNumero(valor) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
      return "—";
    }

    return new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 2
    }).format(numero);
  },

  formatarMoeda(valor) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
      return "—";
    }

    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(numero);
  },

  iniciar() {
    console.log("NexoTerraCore — Sala de Comando iniciada");
    this.verificarAPI();
    this.configurarNavegacao();
    this.configurarLogin();
    this.configurarAcoes();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  SalaDeComando.iniciar();
});
