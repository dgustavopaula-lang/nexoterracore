const botoes = document.querySelectorAll("main button");

botoes[0].addEventListener("click", abrirProducao);

function abrirProducao() {
  const painel = document.querySelector("main");

  painel.innerHTML = `
    <h2>Cadastro de produção</h2>
    <p>Registre a produção diária da propriedade.</p>

    <form id="form-producao">
      <label for="produto">Produto</label>
      <input
        id="produto"
        name="produto"
        type="text"
        placeholder="Exemplo: ovos"
        required
      >

      <label for="quantidade">Quantidade</label>
      <input
        id="quantidade"
        name="quantidade"
        type="number"
        min="1"
        placeholder="Exemplo: 30"
        required
      >

      <label for="data">Data</label>
      <input
        id="data"
        name="data"
        type="date"
        required
      >

      <button type="submit">Salvar produção</button>
      <button id="voltar" type="button">Voltar ao painel</button>
    </form>

    <p id="mensagem"></p>
  `;

  document
    .querySelector("#form-producao")
    .addEventListener("submit", salvarProducao);

  document
    .querySelector("#voltar")
    .addEventListener("click", () => location.reload());
}

function salvarProducao(evento) {
  evento.preventDefault();

  const formulario = evento.target;

  const registro = {
    produto: formulario.produto.value,
    quantidade: Number(formulario.quantidade.value),
    data: formulario.data.value
  };

  const registros =
    JSON.parse(localStorage.getItem("nexoterra_producao")) || [];

  registros.push(registro);

  localStorage.setItem(
    "nexoterra_producao",
    JSON.stringify(registros)
  );

  document.querySelector("#mensagem").textContent =
    "Produção salva com sucesso.";

  formulario.reset();
}