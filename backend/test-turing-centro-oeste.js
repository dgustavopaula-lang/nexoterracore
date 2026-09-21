const {
  analisarOportunidade,
  listarSetores
} = require("./src/services/turing-centro-oeste");

console.log("\n=== TURING CENTRO-OESTE ===\n");

console.log("SETORES:");
console.log(
  listarSetores().map((x) => x.setor)
);

console.log("\nTESTE PARANAGEL:\n");

console.log(
  analisarOportunidade({
    empresa: "Paranagel",
    municipio: "Paranaiguara",
    estado: "GO",
    setor: "armazenagem_graos",
    evidencia:
      "Complexo privado de armazenagem buscando comprador, parceiro operacional ou arrendatario.",
    fonte: "base interna",
    contato: "pendente"
  })
);
