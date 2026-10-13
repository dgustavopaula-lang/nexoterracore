"use strict";

const {
  classificar
} = require("./src/training/turing-security-training");

const testes = [
  "Olá Gustavo, nossa reunião será amanhã às 10 horas.",
  "PROMOÇÃO imperdível, compre agora com desconto.",
  "Sua conta será bloqueada. Clique no link e confirme sua senha.",
  "Você ganhou um prêmio. Faça um PIX urgente para liberar."
];

console.log("===== TURING TRAINING LAB =====");

for (const mensagem of testes) {
  console.log("\nMensagem:", mensagem);
  console.log(classificar(mensagem));
}

console.log("\n===== TESTE CONCLUÍDO =====");
