const {
  analisarOperacaoAgro
} = require("./src/services/turing-agro-alerts");

const DATA_REFERENCIA = "2026-09-16";

/*
  DADOS FICTÍCIOS SOMENTE PARA TESTE DO MOTOR.
  Ainda não representam as fazendas reais.
*/
const fazendas = [
  {
    nome: "Fazenda 1",
    insumos: [
      {
        nome: "Ração",
        dataPrevista: "2026-09-14",
        status: "pendente"
      }
    ],
    estoques: [
      {
        nome: "Ração",
        quantidadeAtual: 80,
        quantidadeMinima: 100,
        unidade: "kg"
      }
    ],
    maquinas: []
  },

  {
    nome: "Fazenda 2",
    insumos: [
      {
        nome: "Fertilizante",
        dataPrevista: "2026-09-10",
        status: "pendente"
      }
    ],
    estoques: [],
    maquinas: []
  },

  {
    nome: "Fazenda 3",
    insumos: [],
    estoques: [
      {
        nome: "Sal mineral",
        quantidadeAtual: 115,
        quantidadeMinima: 100,
        unidade: "kg"
      }
    ],
    maquinas: []
  },

  {
    nome: "Fazenda 4",
    insumos: [],
    estoques: [],
    maquinas: [
      {
        nome: "Trator 01",
        status: "Manutenção",
        previsaoRetorno: "2026-09-12"
      }
    ]
  }
];

const resultado =
  analisarOperacaoAgro(fazendas, DATA_REFERENCIA);

console.log("=== TURING AGRO — TESTE OPERACIONAL ===");
console.log("Fazendas analisadas:", resultado.fazendasAnalisadas);
console.log("Alertas:", resultado.totalAlertas);
console.log("Críticos:", resultado.criticos);
console.log("Atenção:", resultado.atencao);
console.log("");

for (const alerta of resultado.alertas) {
  console.log(
    `[${alerta.nivel}] ${alerta.fazenda} — ${alerta.mensagem}`
  );
}
