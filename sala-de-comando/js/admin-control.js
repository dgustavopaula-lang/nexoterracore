(() => {
  const API_PATH = "/api/financeiro/admin-workspace";
  const LOCAL_KEY = "nexoterracore.admin.workspace.v2";

  const MODULOS = [
    { id:"agro-digital", n:"01", titulo:"Agro Digital", subtitulo:"AgroCore / operação agro", descricao:"Projeto agro, fazendas, rastreabilidade, telemetria, clientes e evolução comercial.", view:"agro" },
    { id:"turing", n:"02", titulo:"Turing", subtitulo:"Aplicativo de inteligência artificial", descricao:"Produto público de IA, experiência mobile, API, NTCoins e evolução do agente Turing.", view:"turing" },
    { id:"mercado-financeiro", n:"03", titulo:"Mercado Financeiro", subtitulo:"Análise econômica e estratégica", descricao:"Indicadores, cenários, ativos, estudos econômicos, riscos, oportunidades e decisões." },
    { id:"programacao", n:"04", titulo:"Programação", subtitulo:"Engenharia e desenvolvimento", descricao:"Backlog técnico, APIs, frontend, PostgreSQL, segurança, testes, deploy e manutenção." },
    { id:"sistema-raiz", n:"05", titulo:"Sistema Raiz", subtitulo:"SaaS multi-setor", descricao:"Clínica, Academia, Agro, Hotel, Imobiliária e demais verticais comerciais." },
    { id:"financeiro", n:"06", titulo:"Finanças", subtitulo:"Financeiro / Contabilidade", descricao:"Receitas, despesas, fluxo de caixa, lançamentos e acompanhamento financeiro.", view:"financeiro" },
    { id:"agenda", n:"07", titulo:"Agenda / Calendário", subtitulo:"Compromissos e planejamento", descricao:"Reuniões, contatos, entregas, prazos e planejamento diário e semanal." },
    { id:"projetos", n:"08", titulo:"Projetos", subtitulo:"Portfólio geral", descricao:"Controle de projetos, prioridades, estágios, prazos, links e próximas ações." },
    { id:"loteamento", n:"09", titulo:"Projeto Loteamento", subtitulo:"Desenvolvimento imobiliário", descricao:"Planejamento, documentação, contatos, cronograma, empresas e execução do projeto de loteamento." },
    { id:"campanha-goias", n:"10", titulo:"Projeto Campanha", subtitulo:"Lançamento · Goiás", descricao:"Planejamento do lançamento Campanha na região de Goiás, contatos, comunicação, cronograma e execução." },
    { id:"empresas-contatos", n:"11", titulo:"Empresas e Contatos", subtitulo:"E-mail · WhatsApp · mensagens", descricao:"Cadastro operacional de empresas, responsáveis, e-mails, WhatsApp, projeto relacionado e mensagens." , contatos:true }
  ];

  function localLer() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}") || {}; }
    catch (_) { return {}; }
  }

  function localSalvar(estado) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(estado));
  }

  function escapar(v) {
    return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  }

  function token() { return window.SalaDeComando?.token || SalaDeComando?.token || null; }
  function apiBase() { return window.SalaDeComando?.apiBase || SalaDeComando?.apiBase || ""; }

  async function api(caminho, opcoes={}) {
    if (!token()) throw new Error("Sessão não autenticada.");
    const r = await fetch(`${apiBase()}${API_PATH}${caminho}`, {
      ...opcoes,
      headers: { "Content-Type":"application/json", Authorization:`Bearer ${token()}`, ...(opcoes.headers||{}) }
    });
    const dados = r.status===204 ? null : await r.json();
    if (!r.ok) throw new Error(dados?.erro || `HTTP ${r.status}`);
    return dados;
  }

  function padrao(modulo) {
    return {
      titulo: modulo.titulo,
      subtitulo: modulo.subtitulo,
      status: "Em desenvolvimento",
      prioridade: "Alta",
      proximaAcao: "",
      prazo: "",
      link: "",
      repositorio: "",
      responsavel: "Gustavo",
      notas: modulo.descricao
    };
  }

  async function carregarModulo(modulo) {
    try {
      const r = await api(`/modulos/${modulo.id}`);
      return { ...padrao(modulo), ...(r?.dados || {}) };
    } catch (_) {
      return { ...padrao(modulo), ...(localLer().modulos?.[modulo.id] || {}) };
    }
  }

  async function salvarModulo(modulo, dados) {
    try {
      await api(`/modulos/${modulo.id}`, { method:"PUT", body:JSON.stringify(dados) });
      return "Salvo no banco PostgreSQL.";
    } catch (_) {
      const estado = localLer();
      estado.modulos = estado.modulos || {};
      estado.modulos[modulo.id] = dados;
      localSalvar(estado);
      return "Salvo neste navegador. A API administrativa será usada quando estiver disponível.";
    }
  }

  function estilo() {
    if (document.getElementById("adminControlStyle")) return;
    const s=document.createElement("style"); s.id="adminControlStyle";
    s.textContent=`
      .admin-live-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin-top:18px}
      .admin-live-card{width:100%;min-height:150px;text-align:left;background:#101214;border:1px solid #25282b;border-radius:14px;padding:18px;color:inherit;cursor:pointer;transition:.18s ease}
      .admin-live-card:hover{transform:translateY(-2px);border-color:#ff7a1a;background:#141619}
      .admin-live-card .num{display:block;font-family:monospace;color:#ff7a1a;font-size:11px;margin-bottom:16px}
      .admin-live-card strong{display:block;font-size:16px;margin-bottom:6px}.admin-live-card small{display:block;color:#8c867f;line-height:1.45}
      .admin-editor{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:16px}
      .admin-editor label{display:flex;flex-direction:column;gap:7px;font-size:12px;color:#9a948d}
      .admin-editor input,.admin-editor select,.admin-editor textarea{width:100%;background:#0b0d0f;border:1px solid #292c30;border-radius:9px;color:#ece7e1;padding:11px 12px;font:inherit}
      .admin-editor textarea{min-height:150px;resize:vertical}.admin-span-2{grid-column:1/-1}.admin-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.admin-feedback{font-size:12px;color:#8c867f;margin-top:10px}
      .contact-list{display:grid;gap:10px;margin-top:16px}.contact-row{border:1px solid #292c30;border-radius:10px;padding:12px;background:#0d0f11}.contact-row strong{display:block}.contact-row small{color:#8c867f}.contact-actions{display:flex;gap:8px;margin-top:9px;flex-wrap:wrap}
      @media(max-width:720px){.admin-editor{grid-template-columns:1fr}.admin-span-2{grid-column:auto}.admin-live-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function abrirView(view) { document.querySelector(`.menu-item[data-view="${view}"]`)?.click(); }

  async function editorModulo(modulo) {
    const ws=document.getElementById("adminWorkspace"), titulo=document.getElementById("adminTitulo"), c=document.getElementById("adminConteudo");
    if(!ws||!titulo||!c) return;
    const d=await carregarModulo(modulo);
    titulo.textContent=modulo.titulo;
    c.innerHTML=`
      <form id="adminEditorForm" class="admin-editor">
        <label>Título<input name="titulo" value="${escapar(d.titulo)}"></label>
        <label>Subtítulo<input name="subtitulo" value="${escapar(d.subtitulo)}"></label>
        <label>Status<select name="status">${["Planejamento","Em desenvolvimento","Em teste","Publicado","Pausado","Concluído"].map(v=>`<option ${d.status===v?"selected":""}>${v}</option>`).join("")}</select></label>
        <label>Prioridade<select name="prioridade">${["Baixa","Normal","Alta","Crítica"].map(v=>`<option ${d.prioridade===v?"selected":""}>${v}</option>`).join("")}</select></label>
        <label>Responsável<input name="responsavel" value="${escapar(d.responsavel)}"></label>
        <label>Prazo<input name="prazo" type="date" value="${escapar(d.prazo)}"></label>
        <label class="admin-span-2">Próxima ação<input name="proximaAcao" value="${escapar(d.proximaAcao)}" placeholder="A próxima execução concreta"></label>
        <label>Link / página<input name="link" value="${escapar(d.link)}" placeholder="https://..."></label>
        <label>Repositório / pasta<input name="repositorio" value="${escapar(d.repositorio)}" placeholder="~/Projetos/..."></label>
        <label class="admin-span-2">Notas, estratégia e instruções<textarea name="notas">${escapar(d.notas)}</textarea></label>
      </form>
      <div class="admin-actions">
        <button id="adminSalvar" class="btn-primary" type="button">Salvar alterações</button>
        ${modulo.view?`<button id="adminAbrirModulo" class="btn-secondary" type="button">Abrir módulo</button>`:""}
        <button id="adminAbrirLink" class="btn-secondary" type="button">Abrir link informado</button>
      </div>
      <div id="adminFeedback" class="admin-feedback">Campos editáveis pelo proprietário.</div>`;
    ws.classList.remove("oculto"); ws.scrollIntoView({behavior:"smooth",block:"start"});
    document.getElementById("adminSalvar")?.addEventListener("click",async()=>{
      const dados=Object.fromEntries(new FormData(document.getElementById("adminEditorForm")));
      document.getElementById("adminFeedback").textContent=await salvarModulo(modulo,dados);
      montarCards();
    });
    document.getElementById("adminAbrirModulo")?.addEventListener("click",()=>abrirView(modulo.view));
    document.getElementById("adminAbrirLink")?.addEventListener("click",()=>{
      const link=document.getElementById("adminEditorForm")?.elements?.link?.value?.trim();
      if(!link) return alert("Informe um link.");
      try{window.open(new URL(link,window.location.href).href,"_blank","noopener,noreferrer");}catch(_){alert("Link inválido.");}
    });
  }

  async function contatosLer() {
    try { return await api("/contatos"); }
    catch (_) { return localLer().contatos || []; }
  }

  async function contatosSalvar(lista) {
    const estado=localLer(); estado.contatos=lista; localSalvar(estado);
  }

  async function editorContatos() {
    const ws=document.getElementById("adminWorkspace"), titulo=document.getElementById("adminTitulo"), c=document.getElementById("adminConteudo"); if(!ws||!titulo||!c)return;
    titulo.textContent="Empresas e Contatos";
    c.innerHTML=`
      <form id="contatoForm" class="admin-editor">
        <input type="hidden" name="id">
        <label>Empresa<input name="empresa" required></label>
        <label>Responsável<input name="responsavel"></label>
        <label>E-mail<input name="email" type="email"></label>
        <label>WhatsApp<input name="whatsapp" placeholder="+55 ..."></label>
        <label>Projeto<select name="projeto"><option>Agro Digital</option><option>Turing</option><option>Mercado Financeiro</option><option>Sistema Raiz</option><option>Projeto Loteamento</option><option>Projeto Campanha · Goiás</option><option>Outro</option></select></label>
        <label>Status<select name="status"><option>Novo</option><option>Contato iniciado</option><option>Aguardando resposta</option><option>Reunião</option><option>Proposta</option><option>Cliente / Parceiro</option></select></label>
        <label class="admin-span-2">Mensagem<textarea name="mensagem" placeholder="Escreva aqui a mensagem de e-mail ou WhatsApp..."></textarea></label>
      </form>
      <div class="admin-actions"><button id="contatoSalvar" class="btn-primary" type="button">Salvar contato</button><button id="contatoNovo" class="btn-secondary" type="button">Novo</button></div>
      <div id="contatoFeedback" class="admin-feedback"></div><div id="contactList" class="contact-list"></div>`;
    ws.classList.remove("oculto"); ws.scrollIntoView({behavior:"smooth",block:"start"});

    async function render(){
      const lista=await contatosLer(); const alvo=document.getElementById("contactList");
      alvo.innerHTML=lista.length?lista.map((x,i)=>`<div class="contact-row"><strong>${escapar(x.empresa)}</strong><small>${escapar(x.responsavel||"")} · ${escapar(x.email||"")} · ${escapar(x.whatsapp||"")} · ${escapar(x.projeto||"")}</small><div class="contact-actions"><button class="btn-secondary" data-edit-contact="${x.id??i}" type="button">Editar</button><button class="btn-secondary" data-del-contact="${x.id??i}" type="button">Excluir</button></div></div>`).join(""):"<div class='admin-feedback'>Nenhum contato cadastrado.</div>";
    }

    document.getElementById("contatoNovo")?.addEventListener("click",()=>document.getElementById("contatoForm").reset());
    document.getElementById("contatoSalvar")?.addEventListener("click",async()=>{
      const form=document.getElementById("contatoForm"); const dados=Object.fromEntries(new FormData(form)); if(!dados.empresa.trim())return alert("Informe a empresa.");
      try{
        const id=dados.id; delete dados.id;
        await api(id?`/contatos/${id}`:"/contatos",{method:id?"PUT":"POST",body:JSON.stringify(dados)});
        document.getElementById("contatoFeedback").textContent="Contato salvo no PostgreSQL.";
      }catch(_){
        const lista=await contatosLer(); const idx=dados.id?lista.findIndex(x=>String(x.id)===String(dados.id)):-1; const item={...dados,id:dados.id||Date.now()}; if(idx>=0)lista[idx]=item;else lista.unshift(item); await contatosSalvar(lista); document.getElementById("contatoFeedback").textContent="Contato salvo neste navegador.";
      }
      form.reset(); await render();
    });
    document.getElementById("contactList")?.addEventListener("click",async e=>{
      const edit=e.target.closest("[data-edit-contact]"), del=e.target.closest("[data-del-contact]"); const lista=await contatosLer();
      if(edit){const x=lista.find((item,i)=>String(item.id??i)===edit.dataset.editContact); if(!x)return; const f=document.getElementById("contatoForm"); for(const [k,v] of Object.entries(x)){if(f.elements[k])f.elements[k].value=v??"";}}
      if(del){const id=del.dataset.delContact; try{await api(`/contatos/${id}`,{method:"DELETE"});}catch(_){await contatosSalvar(lista.filter((item,i)=>String(item.id??i)!==id));} await render();}
    });
    await render();
  }

  async function montarCards(){
    const grid=document.getElementById("adminLiveGrid"); if(!grid)return;
    const cards=[]; for(const m of MODULOS){const d=m.contatos?null:await carregarModulo(m); cards.push(`<button class="admin-live-card" data-admin-live="${m.id}" type="button"><span class="num">${m.n}</span><strong>${escapar(d?.titulo||m.titulo)}</strong><small>${escapar(d?.subtitulo||m.subtitulo)}${d?.status?` · ${escapar(d.status)}`:""}</small></button>`);} grid.innerHTML=cards.join("");
  }

  async function iniciar(){
    estilo(); const view=document.getElementById("view-administracao"); if(!view)return;
    view.querySelector(".overview-grid")?.remove(); view.querySelector(".admin-grid")?.remove();
    const p=view.querySelector(".section-header p"); if(p)p.textContent="Central operacional do proprietário: projetos, produtos, finanças, agenda, programação, mercado e contatos.";
    let grid=document.getElementById("adminLiveGrid"); if(!grid){grid=document.createElement("div");grid.id="adminLiveGrid";grid.className="admin-live-grid"; const ws=document.getElementById("adminWorkspace"); ws?view.insertBefore(grid,ws):view.appendChild(grid);}
    await montarCards();
    grid.addEventListener("click",e=>{const b=e.target.closest("[data-admin-live]"); if(!b)return; const m=MODULOS.find(x=>x.id===b.dataset.adminLive); if(!m)return; m.contatos?editorContatos():editorModulo(m);});
    document.getElementById("btnFecharAdmin")?.addEventListener("click",()=>document.getElementById("adminWorkspace")?.classList.add("oculto"));
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
