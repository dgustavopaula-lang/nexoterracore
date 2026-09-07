const FinanceiroNexo = {
  moeda(valor) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number(valor) || 0);
  },

  async requisitar(caminho, opcoes = {}) {
    if (!SalaDeComando.token) {
      throw new Error("Sessão não autenticada.");
    }

    const resposta = await fetch(
      `${SalaDeComando.apiBase}/api/financeiro${caminho}`,
      {
        ...opcoes,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SalaDeComando.token}`,
          ...(opcoes.headers || {})
        }
      }
    );

    const dados = resposta.status === 204 ? null : await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados?.erro || `Erro HTTP ${resposta.status}`);
    }

    return dados;
  },

  mostrarMensagem(texto, erro = false) {
    const elemento = document.querySelector("#finMensagem");
    if (!elemento) return;

    elemento.textContent = texto;
    elemento.classList.toggle("erro", erro);
  },

  async carregar() {
    try {
      this.mostrarMensagem("Atualizando dados...");

      const [resumo, lancamentos] = await Promise.all([
        this.requisitar("/resumo"),
        this.requisitar("/lancamentos")
      ]);

      document.querySelector("#finReceitas").textContent =
        this.moeda(resumo.receitas);
      document.querySelector("#finDespesas").textContent =
        this.moeda(resumo.despesas);
      document.querySelector("#finSaldo").textContent =
        this.moeda(resumo.saldo);

      this.renderizarLancamentos(lancamentos);
      this.mostrarMensagem("Dados financeiros atualizados.");
    } catch (erro) {
      console.error("Erro financeiro:", erro);
      this.mostrarMensagem(erro.message, true);
    }
  },

  renderizarLancamentos(lancamentos) {
    const corpo = document.querySelector("#finLancamentos");
    if (!corpo) return;

    corpo.replaceChildren();

    if (!lancamentos.length) {
      const linha = document.createElement("tr");
      const celula = document.createElement("td");
      celula.colSpan = 6;
      celula.textContent = "Nenhum lançamento cadastrado.";
      linha.appendChild(celula);
      corpo.appendChild(linha);
      return;
    }

    lancamentos.forEach((item) => {
      const linha = document.createElement("tr");
      const valores = [
        item.tipo,
        item.descricao,
        item.categoria,
        this.moeda(item.valor),
        item.vencimento
          ? new Date(item.vencimento).toLocaleDateString("pt-BR")
          : "—",
        item.status
      ];

      valores.forEach((valor) => {
        const celula = document.createElement("td");
        celula.textContent = valor;
        linha.appendChild(celula);
      });

      corpo.appendChild(linha);
    });
  },

  async salvar(evento) {
    evento.preventDefault();

    const formulario = evento.currentTarget;
    const dados = Object.fromEntries(new FormData(formulario));

    try {
      this.mostrarMensagem("Salvando lançamento...");

      await this.requisitar("/lancamentos", {
        method: "POST",
        body: JSON.stringify(dados)
      });

      formulario.reset();
      await this.carregar();
      this.mostrarMensagem("Lançamento salvo no PostgreSQL.");
    } catch (erro) {
      console.error("Erro ao salvar lançamento:", erro);
      this.mostrarMensagem(erro.message, true);
    }
  },

  iniciar() {
    document
      .querySelector('[data-view="financeiro"]')
      ?.addEventListener("click", () => this.carregar());

    document
      .querySelector("#btnAtualizarFinanceiro")
      ?.addEventListener("click", () => this.carregar());

    document
      .querySelector("#formFinanceiro")
      ?.addEventListener("submit", (evento) => this.salvar(evento));
  }
};

document.addEventListener("DOMContentLoaded", () => FinanceiroNexo.iniciar());
