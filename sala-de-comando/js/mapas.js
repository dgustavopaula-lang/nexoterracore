const NexoMapas = {
  imoveis: [],
  selecionado: null,

  estilos() {
    if (document.querySelector("#nexo-mapas-style")) return;

    const style = document.createElement("style");
    style.id = "nexo-mapas-style";
    style.textContent = `
      .geo-shell{display:grid;gap:18px;margin-top:22px}
      .geo-toolbar{display:grid;grid-template-columns:minmax(240px,1fr) auto auto;gap:10px;align-items:center}
      .geo-select{width:100%;padding:11px 12px;border:1px solid var(--border);border-radius:8px;background:#0b0d10;color:var(--text);font:inherit}
      .geo-grid{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:16px}
      .geo-map{min-height:520px;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:#090b0e;position:relative}
      .geo-map iframe{width:100%;height:520px;border:0;display:block;background:#090b0e}
      .geo-empty{min-height:520px;display:flex;align-items:center;justify-content:center;padding:30px;text-align:center;color:var(--muted)}
      .geo-details{border:1px solid var(--border);border-radius:12px;background:var(--panel-2);padding:18px;align-self:start}
      .geo-details h3{margin:0 0 14px;font-size:16px}
      .geo-meta{display:grid;gap:12px}
      .geo-meta div{padding-bottom:11px;border-bottom:1px solid var(--border)}
      .geo-meta span{display:block;color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.7px;margin-bottom:5px}
      .geo-meta strong{display:block;color:var(--text);font-size:13px;line-height:1.45;word-break:break-word}
      .geo-note{margin-top:14px;color:var(--muted);font-size:11px;line-height:1.55}
      .geo-status{margin-top:14px;padding:12px 14px;border:1px solid var(--border);border-radius:8px;background:var(--panel-2);color:var(--muted);font-size:12px}
      @media(max-width:900px){.geo-grid{grid-template-columns:1fr}.geo-details{order:-1}.geo-toolbar{grid-template-columns:1fr 1fr}.geo-select{grid-column:1/-1}}
      @media(max-width:600px){.geo-toolbar{grid-template-columns:1fr}.geo-select{grid-column:auto}.geo-map,.geo-map iframe,.geo-empty{min-height:390px;height:390px}}
    `;
    document.head.appendChild(style);
  },

  montar() {
    const view = document.querySelector("#view-mapas");
    if (!view) return;

    this.estilos();

    view.innerHTML = `
      <div class="section-header">
        <div>
          <h2>Mapas</h2>
          <p>Visualização geoespacial privada dos imóveis autorizados nesta sessão.</p>
        </div>
      </div>

      <div class="geo-shell">
        <div class="geo-toolbar">
          <select id="geoImovel" class="geo-select" aria-label="Selecionar imóvel">
            <option value="">Entre no sistema para carregar os imóveis</option>
          </select>
          <button id="geoMaps" class="btn-secondary" type="button" disabled>Google Maps</button>
          <button id="geoEarth" class="btn-primary" type="button" disabled>Google Earth</button>
        </div>

        <div id="geoStatus" class="geo-status">Aguardando sessão autenticada.</div>

        <div class="geo-grid">
          <div class="geo-map">
            <div id="geoEmpty" class="geo-empty">
              Selecione um imóvel para abrir a visualização por satélite.
            </div>
            <iframe id="geoFrame" class="oculto" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen title="Visualização geoespacial do imóvel"></iframe>
          </div>

          <aside class="geo-details">
            <h3>Imóvel selecionado</h3>
            <div class="geo-meta">
              <div><span>Imóvel</span><strong id="geoTitulo">—</strong></div>
              <div><span>Endereço</span><strong id="geoEndereco">—</strong></div>
              <div><span>Matrícula</span><strong id="geoMatricula">—</strong></div>
              <div><span>Status</span><strong id="geoSituacao">—</strong></div>
            </div>
            <div class="geo-note">Os dados patrimoniais são carregados somente após autenticação. O botão Google Earth abre a localização em nova aba.</div>
          </aside>
        </div>
      </div>
    `;

    document.querySelector("#geoImovel").addEventListener("change", (e) => {
      this.selecionar(e.target.value);
    });

    document.querySelector("#geoMaps").addEventListener("click", () => {
      if (!this.selecionado) return;
      window.open(this.urlMaps(this.selecionado), "_blank", "noopener,noreferrer");
    });

    document.querySelector("#geoEarth").addEventListener("click", () => {
      if (!this.selecionado) return;
      window.open(this.urlEarth(this.selecionado), "_blank", "noopener,noreferrer");
    });

    const botaoMapas = document.querySelector('.menu-item[data-view="mapas"]');
    botaoMapas?.addEventListener("click", () => this.carregar());
  },

  endereco(imovel) {
    return [
      imovel.endereco,
      imovel.numero,
      imovel.bairro,
      imovel.cidade,
      imovel.uf,
      imovel.cep,
      "Brasil"
    ].filter(Boolean).join(", ");
  },

  urlMaps(imovel) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this.endereco(imovel))}`;
  },

  urlEarth(imovel) {
    return `https://earth.google.com/web/search/${encodeURIComponent(this.endereco(imovel))}`;
  },

  urlSatelite(imovel) {
    return `https://www.google.com/maps?q=${encodeURIComponent(this.endereco(imovel))}&output=embed&t=k&z=19`;
  },

  async carregar() {
    const status = document.querySelector("#geoStatus");
    const select = document.querySelector("#geoImovel");

    if (!status || !select) return;

    if (typeof SalaDeComando === "undefined" || !SalaDeComando.token) {
      status.textContent = "Acesso necessário: entre na Sala de Comando para carregar as localizações.";
      select.innerHTML = '<option value="">Sessão não iniciada</option>';
      return;
    }

    status.textContent = "Carregando imóveis autorizados...";

    try {
      const resposta = await fetch(`${SalaDeComando.apiBase}/api/imoveis`, {
        headers: { Authorization: `Bearer ${SalaDeComando.token}` }
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || "Não foi possível carregar os imóveis.");
      }

      this.imoveis = Array.isArray(dados) ? dados : [];
      select.innerHTML = '<option value="">Selecione um imóvel</option>' + this.imoveis
        .map((imovel) => {
          const nome = imovel.titulo || imovel.tipo || `Imóvel ${imovel.id}`;
          const cidade = [imovel.cidade, imovel.uf].filter(Boolean).join("/");
          return `<option value="${SalaDeComando.escapar(imovel.id)}">${SalaDeComando.escapar(nome)}${cidade ? ` — ${SalaDeComando.escapar(cidade)}` : ""}</option>`;
        })
        .join("");

      status.textContent = `${this.imoveis.length} imóvel(is) disponível(is) para visualização geoespacial.`;

      if (this.imoveis.length === 1) {
        select.value = String(this.imoveis[0].id);
        this.selecionar(select.value);
      }
    } catch (erro) {
      console.error("Erro no módulo Mapas:", erro);
      status.textContent = erro.message;
    }
  },

  selecionar(id) {
    const imovel = this.imoveis.find((item) => String(item.id) === String(id));
    this.selecionado = imovel || null;

    const frame = document.querySelector("#geoFrame");
    const vazio = document.querySelector("#geoEmpty");
    const btnMaps = document.querySelector("#geoMaps");
    const btnEarth = document.querySelector("#geoEarth");

    if (!imovel) {
      frame?.classList.add("oculto");
      vazio?.classList.remove("oculto");
      if (btnMaps) btnMaps.disabled = true;
      if (btnEarth) btnEarth.disabled = true;
      return;
    }

    const endereco = this.endereco(imovel);

    document.querySelector("#geoTitulo").textContent = imovel.titulo || imovel.tipo || "Imóvel";
    document.querySelector("#geoEndereco").textContent = endereco || "Endereço não informado";
    document.querySelector("#geoMatricula").textContent = imovel.matricula || "—";
    document.querySelector("#geoSituacao").textContent = imovel.status || "Ativo";

    if (endereco) {
      frame.src = this.urlSatelite(imovel);
      frame.classList.remove("oculto");
      vazio.classList.add("oculto");
      btnMaps.disabled = false;
      btnEarth.disabled = false;
    } else {
      frame.classList.add("oculto");
      vazio.classList.remove("oculto");
      vazio.textContent = "Este imóvel ainda não possui endereço suficiente para geolocalização.";
      btnMaps.disabled = true;
      btnEarth.disabled = true;
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  NexoMapas.montar();
});
