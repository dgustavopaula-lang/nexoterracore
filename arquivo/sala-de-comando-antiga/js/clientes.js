const NexoClientes = {
  clientes: [],

  token() {
    return typeof SalaDeComando !== "undefined"
      ? SalaDeComando.token
      : null;
  },

  apiBase() {
    return SalaDeComando.apiBase;
  },

  escapar(valor) {
    return SalaDeComando.escapar(valor ?? "");
  },

  campo(id) {
    const el = document.querySelector(id);
    const valor = el?.value?.trim();
    return valor ? valor : null;
  },

  async carregar() {
    const lista = document.querySelector("#listaClientes");
    const total = document.querySelector("#totalClientes");
    const status = document.querySelector("#statusClientes");
    const mensagem = document.querySelector("#mensagemClientes");

    if (!this.token()) {
      total.textContent = "—";
      status.textContent = "Aguardando acesso";
      mensagem.textContent = "Entre na Sala de Comando para carregar os clientes.";
      lista.innerHTML = "";
      return;
    }

    mensagem.textContent = "Carregando clientes...";
    status.textContent = "Consultando banco";

    try {
      const resposta = await fetch(`${this.apiBase()}/api/clientes`, {
        headers: {
          Authorization: `Bearer ${this.token()}`
        }
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || "Não foi possível carregar os clientes.");
      }

      this.clientes = Array.isArray(dados) ? dados : [];

      total.textContent = this.clientes.length;
      status.textContent = "Dados atualizados";

      if (!this.clientes.length) {
        lista.innerHTML = "";
        mensagem.textContent = "Nenhum cliente cadastrado.";
        return;
      }

      mensagem.textContent = `${this.clientes.length} cliente(s) encontrado(s).`;

      lista.innerHTML = this.clientes.map(cliente => {
        const contato = [
          cliente.whatsapp ? `WhatsApp: ${cliente.whatsapp}` : null,
          cliente.telefone || null,
          cliente.email || null
        ].filter(Boolean).join(" · ");

        const local = [cliente.cidade, cliente.uf]
          .filter(Boolean)
          .join("/");

        const proximo = cliente.proximo_contato_em
          ? new Date(cliente.proximo_contato_em).toLocaleString("pt-BR")
          : "—";

        return `
          <tr>
            <td><strong>${this.escapar(cliente.nome)}</strong></td>
            <td>${this.escapar(cliente.empresa || "—")}</td>
            <td>${this.escapar(contato || "—")}</td>
            <td>${this.escapar(local || "—")}</td>
            <td>${this.escapar(cliente.interesse || "—")}</td>
            <td>${this.escapar(cliente.status || "—")}</td>
            <td>${this.escapar(proximo)}</td>
            <td>
              <button class="btn-secondary" data-editar-cliente="${cliente.id}">
                Editar
              </button>
              <button class="btn-secondary" data-excluir-cliente="${cliente.id}">
                Excluir
              </button>
            </td>
          </tr>
        `;
      }).join("");

    } catch (erro) {
      console.error("Erro Clientes:", erro);
      status.textContent = "Falha na consulta";
      mensagem.textContent = erro.message;
    }
  },

  novo() {
    if (!this.token()) {
      document.querySelector("#modalLogin")?.classList.remove("oculto");
      return;
    }

    document.querySelector("#formCliente").reset();
    document.querySelector("#clienteId").value = "";
    document.querySelector("#clienteStatus").value = "Potencial cliente";
    document.querySelector("#tituloModalCliente").textContent = "Novo cliente";
    document.querySelector("#erroCliente").textContent = "";
    document.querySelector("#modalCliente").classList.remove("oculto");
    document.querySelector("#clienteNome").focus();
  },

  editar(id) {
    const cliente = this.clientes.find(c => String(c.id) === String(id));
    if (!cliente) return;

    document.querySelector("#clienteId").value = cliente.id;
    document.querySelector("#clienteNome").value = cliente.nome || "";
    document.querySelector("#clienteEmpresa").value = cliente.empresa || "";
    document.querySelector("#clienteTelefone").value = cliente.telefone || "";
    document.querySelector("#clienteWhatsapp").value = cliente.whatsapp || "";
    document.querySelector("#clienteEmail").value = cliente.email || "";
    document.querySelector("#clienteCidade").value = cliente.cidade || "";
    document.querySelector("#clienteUf").value = cliente.uf || "";
    document.querySelector("#clienteInteresse").value = cliente.interesse || "";
    document.querySelector("#clienteStatus").value = cliente.status || "Potencial cliente";
    document.querySelector("#clienteOrigem").value = cliente.origem || "";
    document.querySelector("#clienteAnotacoes").value = cliente.anotacoes || "";

    document.querySelector("#clienteProximoContato").value =
      cliente.proximo_contato_em
        ? new Date(cliente.proximo_contato_em).toISOString().slice(0, 16)
        : "";

    document.querySelector("#tituloModalCliente").textContent = "Editar cliente";
    document.querySelector("#erroCliente").textContent = "";
    document.querySelector("#modalCliente").classList.remove("oculto");
  },

  fechar() {
    document.querySelector("#modalCliente").classList.add("oculto");
  },

  async salvar(evento) {
    evento.preventDefault();

    const id = document.querySelector("#clienteId").value;
    const erro = document.querySelector("#erroCliente");
    const botao = document.querySelector("#btnSalvarCliente");

    const payload = {
      nome: this.campo("#clienteNome"),
      empresa: this.campo("#clienteEmpresa"),
      telefone: this.campo("#clienteTelefone"),
      whatsapp: this.campo("#clienteWhatsapp"),
      email: this.campo("#clienteEmail"),
      cidade: this.campo("#clienteCidade"),
      uf: (this.campo("#clienteUf") || "").toUpperCase() || null,
      interesse: this.campo("#clienteInteresse"),
      status: this.campo("#clienteStatus"),
      origem: this.campo("#clienteOrigem"),
      proximo_contato_em: this.campo("#clienteProximoContato"),
      anotacoes: this.campo("#clienteAnotacoes")
    };

    erro.textContent = "";
    botao.disabled = true;
    botao.textContent = "Salvando...";

    try {
      const resposta = await fetch(
        id
          ? `${this.apiBase()}/api/clientes/${id}`
          : `${this.apiBase()}/api/clientes`,
        {
          method: id ? "PUT" : "POST",
          headers: {
            Authorization: `Bearer ${this.token()}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      const dados = resposta.status === 204 ? {} : await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || "Não foi possível salvar o cliente.");
      }

      this.fechar();
      await this.carregar();

    } catch (falha) {
      erro.textContent = falha.message;
    } finally {
      botao.disabled = false;
      botao.textContent = "Salvar cliente";
    }
  },

  async excluir(id) {
    if (!confirm("Desativar este cliente?")) return;

    try {
      const resposta = await fetch(`${this.apiBase()}/api/clientes/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.token()}`
        }
      });

      if (!resposta.ok) {
        const dados = await resposta.json();
        throw new Error(dados.erro || "Não foi possível excluir o cliente.");
      }

      await this.carregar();
    } catch (erro) {
      alert(erro.message);
    }
  },

  iniciar() {
    document
      .querySelector('.menu-item[data-view="clientes"]')
      ?.addEventListener("click", () => this.carregar());

    document
      .querySelector("#btnNovoCliente")
      ?.addEventListener("click", () => this.novo());

    document
      .querySelector("#btnAtualizarClientes")
      ?.addEventListener("click", () => this.carregar());

    document
      .querySelector("#fecharCliente")
      ?.addEventListener("click", () => this.fechar());

    document
      .querySelector("#formCliente")
      ?.addEventListener("submit", evento => this.salvar(evento));

    document
      .querySelector("#listaClientes")
      ?.addEventListener("click", evento => {
        const editar = evento.target.closest("[data-editar-cliente]");
        const excluir = evento.target.closest("[data-excluir-cliente]");

        if (editar) this.editar(editar.dataset.editarCliente);
        if (excluir) this.excluir(excluir.dataset.excluirCliente);
      });
  }
};

document.addEventListener("DOMContentLoaded", () => {
  NexoClientes.iniciar();
});
