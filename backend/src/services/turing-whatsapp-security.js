"use strict";

async function registrarEventoWhatsAppSecurity(
  pool,
  evento,
  estado = "PASS",
  contexto = {}
) {
  await pool.query(
    `INSERT INTO turing_security_events
      (agente, evento, estado, banco, modo, duracao_ms, contexto)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
    [
      "Turing",
      evento,
      estado,
      "conectado",
      "observacao",
      0,
      JSON.stringify({
        origem: "whatsapp",
        persistencia: "audit_only",
        dados_sensiveis_registrados: false,
        ...contexto
      })
    ]
  );
}

module.exports = {
  registrarEventoWhatsAppSecurity
};
