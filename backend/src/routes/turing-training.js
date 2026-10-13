"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");

const {
  classificar
} = require("../training/turing-security-training");

const {
  buscarAprovado,
  buscarSimilar,
  promover
} = require("../training/turing-training-memory");

function criarRotasTuringTraining({ autenticar } = {}) {
  if (typeof autenticar !== "function") {
    throw new Error("Autenticação obrigatória para o treinamento Turing.");
  }
  const router = express.Router();

  const classesPermitidas = [
    "legitimo",
    "spam",
    "phishing",
    "scam"
  ];

  router.get("/health", (req, res) => {
    return res.json({
      ok: true,
      agente: "Turing",
      modulo: "security-training",
      modo: "laboratorio",
      aprendizado: "controlado"
    });
  });

  router.post("/classificar", (req, res) => {
    const mensagem =
      typeof req.body?.mensagem === "string"
        ? req.body.mensagem.trim()
        : "";

    if (!mensagem) {
      return res.status(400).json({
        ok: false,
        erro: "mensagem_obrigatoria"
      });
    }

    if (mensagem.length > 5000) {
      return res.status(413).json({
        ok: false,
        erro: "mensagem_muito_grande"
      });
    }

    const aprovado = buscarAprovado(mensagem);

    if (aprovado) {
      return res.json({
        ok: true,
        agente: "Turing",
        modo: "training",
        mensagem,
        classificacao: aprovado.classificacao,
        confianca: 1,
        similaridade: 1,
        sinais: [],
        fonte: "feedback_humano_aprovado"
      });
    }

    const similar = buscarSimilar(mensagem, {
      limiteBusca: 0.40,
      margemConflito: 0.08
    });

    if (similar?.conflito) {
      return res.json({
        ok: true,
        agente: "Turing",
        modo: "training",
        mensagem,
        classificacao:
          "revisao_necessaria",
        confianca: 0.5,
        similaridadeMelhor:
          Number(
            similar.melhor
              .similaridade
              .toFixed(3)
          ),
        similaridadeSegundo:
          Number(
            similar.segundo
              .similaridade
              .toFixed(3)
          ),
        candidatos: [
          similar.melhor.classificacao,
          similar.segundo.classificacao
        ],
        evidencias:
          similar.melhor
            .metricas
            .compartilhados,
        fonte:
          "conflito_memoria_aprovada"
      });
    }

    if (similar && !similar.conflito) {
      const melhor = similar.melhor;
      const score =
        melhor.similaridade;
      const m =
        melhor.metricas;

      /*
       * ALTA CONFIANÇA
       *
       * Além do score, exigimos:
       * - pelo menos 3 evidências;
       * - cobertura suficiente da memória;
       * - peso compartilhado relevante.
       */
      const altaConfianca =
        score >= 0.72 &&
        m.compartilhados.length >= 3 &&
        m.coberturaReferencia >= 0.60 &&
        m.pesoCompartilhado >= 4;

      if (altaConfianca) {
        return res.json({
          ok: true,
          agente: "Turing",
          modo: "training",
          mensagem,
          classificacao:
            melhor.classificacao,
          confianca:
            Number(
              Math.min(
                0.95,
                0.78 +
                score * 0.17
              ).toFixed(2)
            ),
          similaridade:
            Number(score.toFixed(3)),
          evidencias:
            m.compartilhados,
          coberturaMemoria:
            Number(
              m.coberturaReferencia
                .toFixed(3)
            ),
          fonte:
            "similaridade_lexical_ponderada",
          referencia:
            melhor.id
        });
      }

      /*
       * ZONA DE DÚVIDA REAL
       *
       * Existe memória parecida,
       * mas evidência ainda insuficiente
       * para classificação automática.
       */
      const zonaDuvida =
        score >= 0.48 &&
        m.compartilhados.length >= 2 &&
        m.pesoCompartilhado >= 2.5;

      if (zonaDuvida) {
        return res.json({
          ok: true,
          agente: "Turing",
          modo: "training",
          mensagem,
          classificacao:
            "revisao_necessaria",
          confianca:
            Number(
              Math.min(
                0.69,
                Math.max(
                  0.50,
                  score
                )
              ).toFixed(2)
            ),
          similaridade:
            Number(score.toFixed(3)),
          candidato:
            melhor.classificacao,
          evidencias:
            m.compartilhados,
          coberturaMemoria:
            Number(
              m.coberturaReferencia
                .toFixed(3)
            ),
          fonte:
            "zona_duvida_lexical"
        });
      }
    }

    /*
     * Sem evidência suficiente:
     * memória NÃO interfere.
     *
     * Isso é a principal proteção
     * contra falso positivo.
     */
    const resultado =
      classificar(mensagem);

    return res.json({
      ok: true,
      agente: "Turing",
      modo: "training",
      mensagem,
      classificacao:
        resultado.classe,
      confianca:
        resultado.confianca,
      sinais:
        resultado.sinais,
      fonte:
        "regras_base"
    });
  });

  router.post("/feedback", autenticar, (req, res) => {
    const adminEmail = (process.env.TURING_TRAINING_ADMIN_EMAIL || "").trim().toLowerCase();
    if (!adminEmail || !req.auth?.usuarioEmail ||
        req.auth.usuarioEmail.toLowerCase() !== adminEmail) {
      return res.status(403).json({ erro: "Treinamento restrito ao administrador." });
    }
    const mensagem =
      typeof req.body?.mensagem === "string"
        ? req.body.mensagem.trim()
        : "";

    const classificacaoCorreta =
      typeof req.body?.classificacaoCorreta === "string"
        ? req.body.classificacaoCorreta.trim().toLowerCase()
        : "";

    if (!mensagem) {
      return res.status(400).json({
        ok: false,
        erro: "mensagem_obrigatoria"
      });
    }

    if (!classesPermitidas.includes(classificacaoCorreta)) {
      return res.status(400).json({
        ok: false,
        erro: "classificacao_invalida",
        permitidas: classesPermitidas
      });
    }

    const atual = classificar(mensagem);

    const registro = {
      horario: new Date().toISOString(),
      mensagem,
      classificacaoAnterior: atual.classe,
      classificacaoCorreta,
      corrigido:
        atual.classe !== classificacaoCorreta,
      modo: "training_lab",
      status: "pending"
    };

    const diretorio = path.join(
      process.cwd(),
      "data",
      "turing-training"
    );

    fs.mkdirSync(diretorio, {
      recursive: true
    });

    fs.appendFileSync(
      path.join(diretorio, "feedback.jsonl"),
      JSON.stringify(registro) + "\n",
      "utf8"
    );

    return res.json({
      ok: true,
      agente: "Turing",
      feedbackRegistrado: true,
      status: "pending",
      resultado: registro
    });
  });

  router.post("/promote", (req, res) => {
    const ip =
      req.ip ||
      req.socket?.remoteAddress ||
      "";

    const local =
      ip.includes("127.0.0.1") ||
      ip.includes("::1");

    if (!local) {
      return res.status(403).json({
        ok: false,
        erro: "promocao_apenas_local"
      });
    }

    const token =
      req.get("x-training-approval") || "";

    if (
      !process.env.TRAINING_APPROVAL_TOKEN ||
      token !== process.env.TRAINING_APPROVAL_TOKEN
    ) {
      return res.status(403).json({
        ok: false,
        erro: "aprovacao_invalida"
      });
    }

    const mensagem =
      typeof req.body?.mensagem === "string"
        ? req.body.mensagem.trim()
        : "";

    const classificacao =
      typeof req.body?.classificacaoCorreta === "string"
        ? req.body.classificacaoCorreta.trim().toLowerCase()
        : "";

    if (
      !mensagem ||
      !classesPermitidas.includes(classificacao)
    ) {
      return res.status(400).json({
        ok: false,
        erro: "dados_invalidos"
      });
    }

    const arquivoFeedback = path.join(
      process.cwd(),
      "data",
      "turing-training",
      "feedback.jsonl"
    );

    const feedbackExiste =
      fs.existsSync(arquivoFeedback) &&
      fs.readFileSync(arquivoFeedback, "utf8")
        .split("\n")
        .filter(Boolean)
        .some(linha => {
          try {
            const r = JSON.parse(linha);

            return (
              r.mensagem === mensagem &&
              r.classificacaoCorreta === classificacao
            );
          } catch {
            return false;
          }
        });

    if (!feedbackExiste) {
      return res.status(409).json({
        ok: false,
        erro: "feedback_previo_obrigatorio"
      });
    }

    const resultado = promover({
      mensagem,
      classificacao
    });

    return res.json({
      ok: true,
      agente: "Turing",
      aprendizadoPromovido: true,
      criado: resultado.criado,
      registro: resultado.registro
    });
  });

  return router;
}

module.exports = criarRotasTuringTraining;
