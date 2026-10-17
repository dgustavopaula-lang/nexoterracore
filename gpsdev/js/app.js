"use strict";const API="https://api.gustavopaulasantos.com.br/api/health";const $=s=>document.querySelector(s);let sound=false,voice=false,lastHealth=null;const seed=[['NexoTerraCore / API','Núcleo multiempresa e integrações','Aprovado'],['Turing IA','Treinamento, conhecimento e segurança','Em desenvolvimento'],['GPS.dev Console','Centro de comando responsivo','Em desenvolvimento'],['Mini Mercado','Gestão de vendas e estoque','Em desenvolvimento'],['Curral Ágil','Gestão rural','Em desenvolvimento'],['Farmácia FA','Gestão de farmácia','Em desenvolvimento'],['GluZen','Mini-software de acompanhamento','Em desenvolvimento'],['Imobiliária','Gestão de imóveis','Em desenvolvimento'],['Registro RG','Cadastros e registros','Em desenvolvimento'],['Cíntia Comunicação','Comunicação assistiva','Em desenvolvimento'],['AgroConex','Integração de dados rurais','Em desenvolvimento'],['NTCoins','Pagamentos e carteira','Em desenvolvimento'],['Radar Angola / Malanje','Laboratório regional','Pausado'],['Go Assistente','Rotina e bem-estar','Pausado'],['Energia & Conectividade Rural','Pesquisa futura de autonomia energética e rede','Pausado']].map((a,i)=>({id:i+1,name:a[0],desc:a[1],status:a[2]}));let projects;try{const stored=JSON.parse(localStorage.getItem('gpsdev-projects'));projects=Array.isArray(stored)?stored:seed}catch{projects=seed}const save=()=>localStorage.setItem('gpsdev-projects',JSON.stringify(projects));function speak(msg){if(voice&&'speechSynthesis'in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(msg);u.lang='pt-BR';speechSynthesis.speak(u)}}function beep(){if(!sound)return;try{const ctx=new (window.AudioContext||window.webkitAudioContext)(),o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=680;g.gain.value=.035;o.start();o.stop(ctx.currentTime+.12);o.onended=()=>ctx.close()}catch{}}function go(page){document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===page));document.querySelectorAll('#nav button').forEach(x=>x.classList.toggle('selected',x.dataset.page===page));$('#pageTitle').textContent=({'inicio':'Visão geral','turing':'Turing IA','projetos':'Projetos','laboratorio':'Laboratório','automacoes':'Automações','acesso':'Acesso & segurança'})[page];window.scrollTo(0,0)}document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>go(b.dataset.page));document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>go(b.dataset.jump));$('#voiceBtn').onclick=()=>{voice=!voice;$('#voiceBtn').textContent=voice?'♬ Voz ativa':'♬ Voz';speak('Voz do GPS ponto dev ativada')};$('#beepBtn').onclick=()=>{sound=!sound;$('#beepBtn').textContent=sound?'◉ Beep ativo':'◉ Beep';beep()};async function health(){const state=$('#apiState'),detail=$('#apiDetail');try{const start=performance.now(),controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);let r;try{r=await fetch(API,{cache:'no-store',signal:controller.signal})}finally{clearTimeout(timeout)}const ms=Math.round(performance.now()-start);state.textContent=r.ok?'HTTP '+r.status:'HTTP '+r.status;state.className=r.ok?'good':'bad';detail.textContent=ms+' ms • '+new Date().toLocaleTimeString('pt-BR');if(lastHealth===true&&!r.ok){beep();speak('Atenção. A API apresentou falha')}lastHealth=r.ok}catch(e){state.textContent='Sem confirmação';state.className='bad';detail.textContent='Rede, CORS ou timeout';if(lastHealth===true){beep();speak('A API não pôde ser verificada')}lastHealth=false}}health();setInterval(health,60000);function el(tag,txt,cls){const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;if(cls)e.className=cls;return e}function render(){const box=$('#projectList');box.replaceChildren();$('#projectCount').textContent=projects.length;for(const x of projects){const c=el('article',undefined,'project'),h=el('h4',x.name),d=el('p',x.desc),s=el('small',x.status),edit=el('button','Editar'),approve=el('button',x.status==='Aprovado'?'Pausar':'Aprovar');edit.onclick=()=>editProject(x.id);approve.onclick=()=>{const next=x.status==='Aprovado'?'Pausado':'Aprovado';if(!confirm('Alterar '+x.name+' para '+next+'? (somente neste navegador)'))return;x.status=next;save();render()};c.append(h,d,s,edit,document.createTextNode(' '),approve);box.append(c)}}function editProject(id){const x=projects.find(p=>p.id===id);$('#projectId').value=x?.id||'';$('#projectName').value=x?.name||'';$('#projectDesc').value=x?.desc||'';$('#projectStatus').value=x?.status||'Em desenvolvimento';$('#projectDialog').showModal()}$('#addProject').onclick=()=>editProject(null);$('#projectForm').addEventListener('submit',e=>{if(e.submitter?.value!=='save')return;e.preventDefault();const name=$('#projectName').value.trim();if(!name)return;const id=Number($('#projectId').value),x=projects.find(p=>p.id===id);if(x){x.name=name;x.desc=$('#projectDesc').value.trim();x.status=$('#projectStatus').value}else projects.push({id:Math.max(0,...projects.map(p=>p.id))+1,name,desc:$('#projectDesc').value.trim(),status:$('#projectStatus').value});save();render();$('#projectDialog').close()});render();const qs={api:[['O que significa HTTP 200?','A requisição foi atendida com sucesso. Isso não comprova disponibilidade contínua.',['sucesso','atendida','respondeu']],['Por que usar autenticação nas rotas de administração?','Para verificar identidade e permissões antes de permitir alterações.',['permiss','identidade','acesso']]],agro:[['O que sensores podem medir no Agro 4.0?','Umidade do solo, temperatura e outras variáveis de campo.',['umidade','temperatura','solo']]],seguranca:[['Por que separar dados por organização?','Para impedir que uma empresa acesse dados de outra.',['empresa','organiza','isolamento']]],python:[['Como definir uma função em Python?','Usando a palavra-chave def, por exemplo def saudacao():',['def']]],angola:[['Qual é o território-base do laboratório regional?','Malanje, Província de Malanje, Angola.',['malanje']]]};let qi=0;function question(){const a=qs[$('#topic').value];$('#question').textContent=a[qi%a.length][0];$('#answer').value='';$('#feedback').textContent=''}$('#topic').onchange=()=>{qi=0;question()};$('#nextQuestion').onclick=()=>{qi++;question()};$('#evaluate').onclick=()=>{const q=qs[$('#topic').value][qi%qs[$('#topic').value].length],answer=$('#answer').value.trim().toLowerCase();if(!answer){$('#feedback').textContent='Digite sua resposta primeiro.';return}const ok=q[2].some(k=>answer.includes(k));$('#feedback').textContent=(ok?'Boa resposta! ':'Vamos revisar. ')+q[1];beep();speak($('#feedback').textContent)};question();document.querySelectorAll('.choice').forEach(b=>b.onclick=()=>{$('#pythonFeedback').textContent=b.dataset.correct==='true'?'Correto! print() exibe a mensagem.':'Tente novamente. Em Python, a função é print().';beep();speak($('#pythonFeedback').textContent)});if('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost' || location.hostname==='127.0.0.1')) navigator.serviceWorker.register('./sw.js').catch(()=>{});

const TURING_API="https://api.gustavopaulasantos.com.br/api/turing/publico";

async function perguntarTuringApi(){
  const campo=document.querySelector("#turingAsk");
  const saida=document.querySelector("#turingReply");
  const status=document.querySelector("#turingApiStatus");
  const pergunta=(campo?.value||"").trim();

  if(!pergunta){
    saida.textContent="Digite uma pergunta.";
    return;
  }

  saida.textContent="Turing analisando...";
  status.textContent="consultando";

  try{
    const r=await fetch(TURING_API,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({pergunta})
    });

    const raw=await r.text();
    let data;
    try{ data=JSON.parse(raw); }catch{ data={resposta:raw}; }

    if(!r.ok)
      throw new Error("HTTP "+r.status+" · "+(data.erro||data.error||raw));

    saida.textContent=
      data.resposta ||
      data.answer ||
      data.mensagem ||
      JSON.stringify(data,null,2);

    status.textContent="conectado";
    speak("Resposta recebida do Turing");
  }catch(e){
    saida.textContent="Turing indisponível: "+e.message;
    status.textContent="falha";
  }
}

document.querySelector("#turingSend")?.addEventListener("click",perguntarTuringApi);

async function consultarNdvi(){
  const lat=document.querySelector("#ndviLat")?.value.trim();
  const lon=document.querySelector("#ndviLon")?.value.trim();
  const out=document.querySelector("#ndviResultado");
  const st=document.querySelector("#ndviStatus");

  if(!lat||!lon){
    out.textContent="Informe latitude e longitude.";
    return;
  }

  out.textContent="Consultando Sentinel-2...";
  st.textContent="consultando";

  try{
    const r=await fetch(
      `https://api.gustavopaulasantos.com.br/api/geo/ndvi?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
    );
    const data=await r.json();

    if(!r.ok) throw new Error("HTTP "+r.status);

    out.textContent=JSON.stringify(data,null,2);
    st.textContent="conectado";
  }catch(e){
    out.textContent="NDVI indisponível: "+e.message;
    st.textContent="falha";
  }
}

document.querySelector("#ndviBuscar")?.addEventListener("click",consultarNdvi);


const TURING_TRAINING_CLASSIFICAR =
  "https://api.gustavopaulasantos.com.br/api/turing/training/classificar";

async function classificarTuringTraining(){
  const campo=document.querySelector("#trainingMensagem");
  const saida=document.querySelector("#trainingResultado");
  const status=document.querySelector("#trainingApiStatus");
  const botao=document.querySelector("#trainingClassificar");

  const mensagem=(campo?.value||"").trim();

  if(!mensagem){
    if(saida) saida.textContent="Digite uma mensagem primeiro.";
    return;
  }

  if(botao) botao.disabled=true;
  if(saida) saida.textContent="Turing Training analisando...";
  if(status) status.textContent="Training consultando";

  try{
    const r=await fetch(TURING_TRAINING_CLASSIFICAR,{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({mensagem})
    });

    const raw=await r.text();
    let data;

    try{
      data=JSON.parse(raw);
    }catch{
      data={erro:raw};
    }

    if(!r.ok){
      throw new Error(
        "HTTP "+r.status+" · "+(data.erro||data.error||raw)
      );
    }

    const classificacao=data.classificacao ?? "sem classificação";
    const confianca=
      typeof data.confianca==="number"
        ? Math.round(data.confianca*100)+"%"
        : "não informada";
    const fonte=data.fonte ?? "API";

    if(saida){
      saida.textContent =
        "Classificação: "+classificacao+
        " | Confiança: "+confianca+
        " | Fonte: "+fonte;
    }

    if(status) status.textContent="Training conectado";

    if(typeof beep==="function") beep();
    if(typeof speak==="function")
      speak("Análise recebida do Turing Training");

  }catch(e){
    if(saida)
      saida.textContent="Training indisponível: "+e.message;

    if(status)
      status.textContent="Training com falha";
  }finally{
    if(botao) botao.disabled=false;
  }
}

document.querySelector("#trainingClassificar")
  ?.addEventListener("click",classificarTuringTraining);
