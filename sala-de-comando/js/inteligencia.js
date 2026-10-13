"use strict";

const NexoInteligencia = {

  async carregarAngola() {
    const token = SalaDeComando.token;
    if (!token) return;

    const base = SalaDeComando.apiBase;

    // Resumo
    try {
      const r = await fetch(`${base}/api/turing/angola/resumo`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await r.json();
      if (d.ok && d.resumo) {
        const resumo = d.resumo;
        const fmt = (v) => v != null ? String(v) : "—";
        document.getElementById("angolaTotal").textContent       = fmt(resumo.total_sinais);
        document.getElementById("angolaValidados").textContent   = fmt(resumo.validados);
        document.getElementById("angolaMonitorando").textContent = fmt(resumo.monitorando);
        document.getElementById("angolaNovos").textContent       = fmt(resumo.novos);
        document.getElementById("angolaSetores").textContent     = fmt(resumo.total_setores);
        document.getElementById("angolaUltimaColeta").textContent =
          resumo.ultima_coleta
            ? new Date(resumo.ultima_coleta).toLocaleString("pt-BR")
            : "—";
      }
    } catch (e) {
      console.error("[NexoInteligencia] Angola resumo:", e.message);
    }

    // Sinais
    const status = document.getElementById("angolaFiltroStatus")?.value || "";
    const termo  = document.getElementById("angolaFiltroTermo")?.value  || "";
    const params = new URLSearchParams({ limite: "50" });
    if (status) params.set("status", status);
    if (termo)  params.set("termo", termo);

    try {
      const r = await fetch(`${base}/api/turing/angola/sinais?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await r.json();
      const lista = document.getElementById("angolaSinaisLista");
      if (!d.ok || !Array.isArray(d.sinais) || d.sinais.length === 0) {
        lista.innerHTML = '<p style="color:var(--text-muted,#888);padding:1rem">Nenhum sinal encontrado.</p>';
        return;
      }
      lista.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:.85rem">
          <thead>
            <tr style="text-align:left;border-bottom:1px solid var(--border,#333)">
              <th style="padding:.5rem .75rem">Título</th>
              <th style="padding:.5rem .75rem">Setor</th>
              <th style="padding:.5rem .75rem">Status</th>
              <th style="padding:.5rem .75rem">Localização</th>
              <th style="padding:.5rem .75rem">Data</th>
            </tr>
          </thead>
          <tbody>
            ${d.sinais.map(s => `
              <tr style="border-bottom:1px solid var(--border-subtle,#222)">
                <td style="padding:.5rem .75rem">${_esc(s.titulo || s.descricao || "")}</td>
                <td style="padding:.5rem .75rem">${_esc(s.setor || "")}</td>
                <td style="padding:.5rem .75rem">${_esc(s.status || "")}</td>
                <td style="padding:.5rem .75rem">${_esc(s.localizacao || s.provincia || "")}</td>
                <td style="padding:.5rem .75rem">${s.data_coleta ? new Date(s.data_coleta).toLocaleDateString("pt-BR") : "—"}</td>
              </tr>`).join("")}
          </tbody>
        </table>`;
    } catch (e) {
      console.error("[NexoInteligencia] Angola sinais:", e.message);
      document.getElementById("angolaSinaisLista").innerHTML =
        '<p style="color:#c44;padding:1rem">Erro ao carregar sinais.</p>';
    }
  },

  async carregarCentroOeste() {
    const token = SalaDeComando.token;
    const orgId = SalaDeComando.organizacaoId;
    if (!token) return;

    const base   = SalaDeComando.apiBase;
    const params = new URLSearchParams();
    if (orgId) params.set("organizacao_id", orgId);

    try {
      const r = await fetch(`${base}/api/turing/centro-oeste/oportunidades?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await r.json();
      const lista = document.getElementById("centroOesteLista");

      const rows = d.oportunidades || d.dados || d.resultados || (Array.isArray(d) ? d : null);
      if (!rows || rows.length === 0) {
        lista.innerHTML = '<p style="color:var(--text-muted,#888);padding:1rem">Nenhuma oportunidade encontrada.</p>';
        return;
      }
      lista.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:.85rem">
          <thead>
            <tr style="text-align:left;border-bottom:1px solid var(--border,#333)">
              <th style="padding:.5rem .75rem">Descrição</th>
              <th style="padding:.5rem .75rem">Estado</th>
              <th style="padding:.5rem .75rem">Setor</th>
              <th style="padding:.5rem .75rem">Status</th>
              <th style="padding:.5rem .75rem">Data</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(o => `
              <tr style="border-bottom:1px solid var(--border-subtle,#222)">
                <td style="padding:.5rem .75rem">${_esc(o.descricao || o.titulo || "")}</td>
                <td style="padding:.5rem .75rem">${_esc(o.estado || o.uf || "")}</td>
                <td style="padding:.5rem .75rem">${_esc(o.setor || o.categoria || "")}</td>
                <td style="padding:.5rem .75rem">${_esc(o.status || "")}</td>
                <td style="padding:.5rem .75rem">${o.data_criacao ? new Date(o.data_criacao).toLocaleDateString("pt-BR") : "—"}</td>
              </tr>`).join("")}
          </tbody>
        </table>`;
    } catch (e) {
      console.error("[NexoInteligencia] CentroOeste:", e.message);
      document.getElementById("centroOesteLista").innerHTML =
        '<p style="color:#c44;padding:1rem">Erro ao carregar oportunidades.</p>';
    }
  }
};

function _esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Botões de atualizar
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnAngolaAtualizar")?.addEventListener("click", () => {
    NexoInteligencia.carregarAngola();
  });
  document.getElementById("btnCentroOesteAtualizar")?.addEventListener("click", () => {
    NexoInteligencia.carregarCentroOeste();
  });
  document.getElementById("angolaFiltroStatus")?.addEventListener("change", () => {
    NexoInteligencia.carregarAngola();
  });
  document.getElementById("angolaFiltroTermo")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") NexoInteligencia.carregarAngola();
  });
});
