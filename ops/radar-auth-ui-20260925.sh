#!/usr/bin/env bash
# Radar SEO: publica UI isolada e usa a autenticacao central existente.
# Nao modifica Core, PostgreSQL, GPS Studio, certificados ou outros vhosts.
set -Eeuo pipefail

DOMAIN="radar.gustavopaulasantos.com.br"
WEB="/var/www/nexoterracore-radar"
CONF="/etc/nginx/sites-available/nexoterracore-radar"
STAGE=""
BACKUP=""
MODIFIED=0

cleanup() {
  if [ -n "$STAGE" ] && [ -d "$STAGE" ]; then rm -rf -- "$STAGE"; fi
}
rollback() {
  rc=$?
  trap - ERR
  set +e
  if [ "$MODIFIED" -eq 1 ] && [ -n "$BACKUP" ]; then
    echo "FALHA: restaurando somente os arquivos Radar..."
    cp -p "$BACKUP/nginx.conf" "$CONF"
    cp -p "$BACKUP/index.html" "$WEB/index.html"
    rm -f -- "$WEB/radar.css" "$WEB/radar.js"
    nginx -t && systemctl reload nginx
  fi
  echo "Backup isolado: $BACKUP"
  exit "$rc"
}
trap cleanup EXIT
trap rollback ERR

echo "============================================================"
echo " NEXOTERRACORE / RADAR SEO / UI + AUTENTICACAO CENTRAL"
echo " Publicacao isolada com backup, teste e rollback"
echo "============================================================"
[ "$(id -u)" -eq 0 ] || { echo "ERRO: execute como root na VPS."; exit 2; }
for cmd in nginx curl node python3 systemctl sha256sum mktemp; do
  command -v "$cmd" >/dev/null || { echo "ERRO: comando ausente: $cmd"; exit 2; }
done
test -f "$CONF"
test -f "$WEB/index.html"
test ! -e "$WEB/radar.js" || { echo "ABORTADO: radar.js ja existe; sem sobrescrita."; exit 2; }
test ! -e "$WEB/radar.css" || { echo "ABORTADO: radar.css ja existe; sem sobrescrita."; exit 2; }
grep -Fq 'Ambiente reservado' "$WEB/index.html" || { echo "ABORTADO: index Radar ja foi alterado."; exit 2; }
systemctl is-active --quiet nginx
systemctl is-active --quiet nexoterracore
nginx -t
test "$(curl --noproxy '*' -sS --max-time 8 -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/api/health)" = "200" || { echo "ERRO: Core indisponivel."; exit 2; }
test "$(curl --noproxy '*' -sS --max-time 8 -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/api/auth/console/verify)" = "401" || { echo "ERRO: verificacao de sessao central fora do esperado."; exit 2; }
test "$(curl --noproxy '*' -sS --max-time 8 -o /dev/null -w '%{http_code}' 'http://127.0.0.1:3000/api/seo/radar/v1?q=teste')" = "401" || { echo "ERRO: rota protegida Radar fora do esperado."; exit 2; }
test "$(curl --noproxy '*' -sS --max-time 8 --resolve "$DOMAIN:443:127.0.0.1" -o /dev/null -w '%{http_code}' "https://$DOMAIN/")" = "200" || { echo "ERRO: HTTPS Radar."; exit 2; }
echo "PREFLIGHT: Core, sessao, rota protegida, HTTPS e servicos OK."

STAGE="$(mktemp -d /root/radar-ui-stage-XXXXXXXX)"
umask 077
BACKUP="$(mktemp -d /root/backup-radar-auth-ui-XXXXXXXX)"
cp -p "$CONF" "$BACKUP/nginx.conf"
cp -p "$WEB/index.html" "$BACKUP/index.html"
nginx -T > "$BACKUP/nginx-before.txt" 2>&1
umask 022
echo "BACKUP CRIADO: $BACKUP"

cat > "$STAGE/index.html" <<'HTML'
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#10151a">
<title>Radar SEO | NexoTerraCore</title>
<link rel="stylesheet" href="/radar.css">
<script src="/radar.js" defer></script>
</head>
<body>
<div class="layout">
<aside class="sidebar">
  <div class="brand"><span class="logo">N</span><div><strong>NEXOTERRACORE</strong><small>INTELLIGENCE PLATFORM</small></div></div>
  <span class="eyebrow">INTELIGÊNCIA</span>
  <nav aria-label="Navegação">
    <a href="#visao-geral" class="active">Radar SEO</a>
    <a href="#consulta">Consulta de palavras-chave</a>
    <a href="https://console.gustavopaulasantos.com.br/">Console Central</a>
    <a href="https://studio.gustavopaulasantos.com.br/">GPS Studio</a>
  </nav>
  <div class="sidebar-foot"><span class="dot"></span><span id="sidebarStatus">Verificando sessão</span></div>
</aside>
<main id="visao-geral">
<header class="top">
  <div><span class="eyebrow">NEXOTERRACORE / RADAR SEO</span><h1>Radar SEO</h1><p>Pesquisa de palavras-chave e inteligência baseada em fontes identificadas.</p></div>
  <span class="tag"><span class="dot"></span> AMBIENTE PROTEGIDO</span>
</header>
<section class="cards" aria-label="Status operacional">
  <article class="card"><small>CORE API</small><strong id="coreStatus">Verificando</strong><span>Serviço central</span></article>
  <article class="card"><small>AUTENTICAÇÃO</small><strong id="authStatus">Verificando</strong><span>Sessão central</span></article>
  <article class="card"><small>CONSULTAS</small><strong id="totalConsultas">0</strong><span>Nesta sessão do navegador</span></article>
</section>
<section class="panel" id="loginPanel">
  <span class="eyebrow">ACESSO CENTRAL</span><h2>Entrar no Radar SEO</h2>
  <p>Use a conta existente do NexoTerraCore. Nenhuma senha é salva nesta página.</p>
  <form id="loginForm">
    <label for="usuario">Usuário ou e-mail</label><input id="usuario" type="text" autocomplete="username" maxlength="254" required>
    <label for="senha">Senha</label><input id="senha" type="password" autocomplete="current-password" required>
    <button id="entrar" type="submit">Entrar com autenticação central</button>
  </form>
  <div id="fazendaPanel" hidden><h3>Selecione a unidade</h3><div id="fazendas"></div></div>
  <p id="loginMensagem" class="message" role="status"></p>
</section>
<section class="panel" id="consulta" hidden>
  <span class="eyebrow">PESQUISA OPERACIONAL</span><h2>Primeira consulta SEO</h2>
  <p>Consulta autenticada ao Core. Uma resposta sem fonte identificada não será apresentada como medição externa verificada.</p>
  <form id="consultaForm">
    <label for="palavra">Palavra-chave</label>
    <div class="search"><input id="palavra" type="search" value="software para agronegócio" minlength="2" maxlength="120" required><button id="consultar" type="submit">Consultar</button></div>
  </form>
  <div class="results">
    <div class="result-title"><h3>Resposta do Core</h3><span id="consultaStatus">Aguardando</span></div>
    <p id="origemDados">Origem dos dados ainda não verificada.</p>
    <pre id="resultado">Nenhuma consulta executada.</pre>
  </div>
</section>
<footer>NexoTerraCore · Radar SEO · Dados externos somente com origem identificada.</footer>
</main>
</div>
</body>
</html>
HTML

cat > "$STAGE/radar.css" <<'CSS'
:root{color-scheme:dark;--bg:#0e141a;--panel:#19232c;--line:#30404d;--text:#f0f5f7;--muted:#9aacb9;--orange:#ff6b1a}
*{box-sizing:border-box}[hidden]{display:none!important}
body{margin:0;background:var(--bg);color:var(--text);font:15px system-ui,Arial,sans-serif}
.layout{display:grid;grid-template-columns:250px minmax(0,1fr);min-height:100vh}
.sidebar{display:flex;flex-direction:column;padding:28px 18px;background:#121b23;border-right:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:12px;margin-bottom:50px}
.brand strong{display:block;font-size:13px;letter-spacing:.07em}.brand small{display:block;font-size:9px;color:var(--muted)}
.logo{display:grid;place-items:center;width:42px;height:42px;border-radius:10px;background:var(--orange);color:#151515;font-weight:900;font-size:25px}
.eyebrow{color:var(--orange);font-size:11px;font-weight:800;letter-spacing:.1em}
nav{display:grid;gap:7px;margin-top:14px}nav a{padding:13px;color:#b9c6cf;text-decoration:none;border-radius:9px}
nav a:hover,nav a.active{background:#2c3540;color:#fff}nav a.active{border-left:3px solid var(--orange)}
.sidebar-foot{margin-top:auto;padding:20px 10px 0;border-top:1px solid var(--line);color:var(--muted);font-size:12px}
.dot{display:inline-block;width:8px;height:8px;background:#45c98a;border-radius:50%;margin-right:7px}
main{width:100%;max-width:1500px;padding:40px}
.top{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:32px}
h1{margin:10px 0;font-size:clamp(32px,5vw,48px)}h2{margin:8px 0 14px}
p{color:var(--muted);line-height:1.6}.tag{border:1px solid var(--line);border-radius:30px;padding:11px 15px;font-size:11px;font-weight:700;white-space:nowrap}
.cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-bottom:25px}
.card,.panel{background:var(--panel);border:1px solid var(--line);border-radius:15px}
.card{display:grid;gap:12px;padding:25px}.card small{color:var(--muted);font-weight:700;letter-spacing:.08em}
.card strong{font-size:27px}.card span{color:var(--muted);font-size:12px}
.panel{padding:30px;margin-bottom:24px}form{max-width:850px}
label{display:block;margin:17px 0 8px;color:#cbd7de;font-weight:600}
input{width:100%;padding:15px;border:1px solid #465764;border-radius:9px;background:#101820;color:#fff;font:inherit}
input:focus{outline:2px solid var(--orange);outline-offset:2px}
button{border:0;border-radius:9px;padding:15px 20px;background:var(--orange);color:#151515;font:inherit;font-weight:800;cursor:pointer}
button:hover{filter:brightness(1.1)}button:disabled{opacity:.5;cursor:wait}
#entrar{margin-top:20px}.search{display:flex;gap:12px}.search input{flex:1}
.results{margin-top:30px;border-top:1px solid var(--line);padding-top:20px}
.result-title{display:flex;justify-content:space-between;align-items:center;gap:12px}
.result-title span{color:var(--orange);font-size:12px}
pre{overflow:auto;max-height:480px;padding:20px;border:1px solid var(--line);border-radius:10px;background:#0b1218;color:#d1e3ec;white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.6}
.message{min-height:20px;overflow-wrap:anywhere}#fazendas{display:flex;flex-wrap:wrap;gap:10px}
footer{margin-top:35px;color:var(--muted);font-size:12px}
@media(max-width:850px){.layout{grid-template-columns:1fr}.sidebar{padding:18px}.brand{margin-bottom:20px}.sidebar-foot{display:none}
main{padding:22px}.top{align-items:flex-start;flex-direction:column}.cards{grid-template-columns:1fr}.panel{padding:20px}.search{flex-direction:column}}
CSS

cat > "$STAGE/radar.js" <<'JS'
"use strict";
const el = id => document.getElementById(id);
let desafioAtual = null;
let totalConsultas = 0;
function mensagem(texto) { el("loginMensagem").textContent = texto; }
async function pedir(rota, opcoes) {
  const resposta = await fetch(rota, Object.assign({credentials:"same-origin",cache:"no-store"}, opcoes || {}));
  const dados = resposta.status === 204 ? null : await resposta.json().catch(() => ({}));
  if (!resposta.ok) { throw new Error((dados && dados.erro) || ("HTTP " + resposta.status)); }
  return dados;
}
async function verificarCore() {
  try {
    const dados = await pedir("/api/health");
    el("coreStatus").textContent = dados.api === "online" && dados.banco === "conectado" ? "Online" : "Respondendo";
  } catch (_) { el("coreStatus").textContent = "Indisponível"; }
}
function sessaoAtiva() {
  el("authStatus").textContent = "Autenticado";
  el("sidebarStatus").textContent = "Sessão central ativa";
  el("loginPanel").hidden = true;
  el("consulta").hidden = false;
}
async function verificarSessao() {
  try {
    await pedir("/api/auth/console/verify");
    sessaoAtiva();
  } catch (_) {
    el("authStatus").textContent = "Login necessário";
    el("sidebarStatus").textContent = "Aguardando autenticação";
    el("loginPanel").hidden = false;
    el("consulta").hidden = true;
  }
}
async function concluirAutenticacao(token) {
  if (typeof token !== "string" || !token) { throw new Error("O Core não retornou uma sessão válida."); }
  await pedir("/api/auth/console", {
    method:"POST",
    headers:{"Content-Type":"application/json",Authorization:"Bearer " + token},
    body:"{}"
  });
  await pedir("/api/auth/console/verify");
  desafioAtual = null;
  sessaoAtiva();
  mensagem("");
}
function apresentarFazendas(fazendas) {
  const lista = el("fazendas");
  lista.replaceChildren();
  for (const fazenda of fazendas) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.textContent = (fazenda.nome || "Unidade") + " — " + ((fazenda.organizacao && fazenda.organizacao.nome) || "Organização");
    botao.addEventListener("click", async () => {
      botao.disabled = true;
      try {
        const dados = await pedir("/api/auth/selecionar-fazenda", {
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({desafio:desafioAtual,fazendaId:fazenda.id})
        });
        await concluirAutenticacao(dados.token);
      } catch (erro) { mensagem(erro.message); botao.disabled = false; }
    });
    lista.appendChild(botao);
  }
  el("fazendaPanel").hidden = false;
}
el("loginForm").addEventListener("submit", async evento => {
  evento.preventDefault();
  const botao = el("entrar");
  const usuario = el("usuario").value.trim();
  const senha = el("senha").value;
  el("senha").value = "";
  botao.disabled = true;
  mensagem("Autenticando no Core...");
  try {
    const dados = await pedir("/api/auth/login", {
      method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:usuario,senha:senha})
    });
    if (dados.requerSelecaoFazenda) {
      desafioAtual = dados.desafio;
      apresentarFazendas(dados.fazendas || []);
      mensagem("Selecione a unidade para concluir o acesso.");
    } else {
      await concluirAutenticacao(dados.token);
    }
  } catch (erro) { mensagem(erro.message); }
  finally { botao.disabled = false; }
});
async function consultarSEO() {
  const palavra = el("palavra").value.trim();
  if (palavra.length < 2) { el("consultaStatus").textContent = "Palavra-chave inválida"; return; }
  const botao = el("consultar");
  botao.disabled = true;
  el("consultaStatus").textContent = "Consultando Core...";
  el("resultado").textContent = "Aguardando resposta...";
  el("origemDados").textContent = "Verificando a origem dos dados retornados.";
  const inicio = performance.now();
  try {
    const dados = await pedir("/api/seo/radar/v1?" + new URLSearchParams({q:palavra}).toString());
    totalConsultas++;
    el("totalConsultas").textContent = String(totalConsultas);
    el("consultaStatus").textContent = "HTTP 200 · " + Math.round(performance.now() - inicio) + " ms";
    const fonte = dados && (dados.fonte || dados.source || dados.origem || (dados.meta && dados.meta.fonte) || (dados.metadata && dados.metadata.source));
    el("origemDados").textContent = fonte
      ? "Fonte declarada pelo serviço: " + (typeof fonte === "string" ? fonte : JSON.stringify(fonte))
      : "Origem externa não declarada: esta resposta não comprova métricas reais de mercado.";
    const resultado = JSON.stringify(dados,null,2);
    el("resultado").textContent = resultado.length > 18000 ? resultado.slice(0,18000) + "\n[Exibição limitada]" : resultado;
  } catch (erro) {
    el("consultaStatus").textContent = "Consulta não concluída";
    el("resultado").textContent = erro.message;
    el("origemDados").textContent = "Nenhuma métrica externa confirmada nesta consulta.";
    if (/HTTP 401/.test(erro.message)) { await verificarSessao(); }
  } finally { botao.disabled = false; }
}
el("consultaForm").addEventListener("submit", async evento => { evento.preventDefault(); await consultarSEO(); });
verificarCore();
verificarSessao();
JS

node --check "$STAGE/radar.js"
python3 - "$CONF" "$STAGE/nginx.conf" <<'PYNGINX'
from pathlib import Path
import sys
src = Path(sys.argv[1]).read_text(encoding="utf-8")
old = "proxy_set_header Authorization $http_authorization;"
marker = "    location ^~ /api/ { return 404; }"
header = "    add_header Referrer-Policy no-referrer always;"
if src.count(old) != 1 or src.count(marker) != 1 or src.count(header) != 1:
    raise SystemExit("ABORTADO: estrutura do vhost diferente da versao homologada.")
if src.count("server_name radar.gustavopaulasantos.com.br;") != 2:
    raise SystemExit("ABORTADO: dominios/vhosts Radar divergentes.")
src = src.replace(old, 'proxy_set_header Authorization "Bearer $cookie_ntc_console";', 1)
locations = []
for route in ("/api/auth/login","/api/auth/selecionar-fazenda","/api/auth/console"):
    locations.append("""
    location = %s {
        limit_except POST { deny all; }
        if ($http_origin != "https://radar.gustavopaulasantos.com.br") { return 403; }
        client_max_body_size 8k;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host api.gustavopaulasantos.com.br;
        proxy_set_header Origin "";
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_connect_timeout 5s;
        proxy_read_timeout 15s;
        add_header Cache-Control "no-store" always;
    }
""" % route)
for route in ("/api/auth/console/verify","/api/health"):
    locations.append("""
    location = %s {
        limit_except GET { deny all; }
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host api.gustavopaulasantos.com.br;
        proxy_set_header Origin "";
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 5s;
        proxy_read_timeout 12s;
        add_header Cache-Control "no-store" always;
    }
""" % route)
src = src.replace(marker, "\n".join(locations) + "\n" + marker, 1)
csp = """    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'" always;"""
src = src.replace(header, header+"\n"+csp, 1)
Path(sys.argv[2]).write_text(src, encoding="utf-8")
print("NGINX PREPARADO: autenticação por cookie no servidor, rotas estritamente permitidas.")
PYNGINX

echo "PUBLICACAO: somente vhost e arquivos Radar."
MODIFIED=1
install -m 0644 "$STAGE/radar.css" "$WEB/radar.css"
install -m 0644 "$STAGE/radar.js" "$WEB/radar.js"
install -m 0644 "$STAGE/index.html" "$WEB/index.html"
install -m 0644 "$STAGE/nginx.conf" "$CONF"
nginx -t
systemctl reload nginx

http() {
  curl --noproxy '*' -sS --max-time 12 --resolve "$DOMAIN:443:127.0.0.1" -o /dev/null -w '%{http_code}' "https://$DOMAIN$1"
}
HOME_CODE="$(http /)"
CSS_CODE="$(http /radar.css)"
JS_CODE="$(http /radar.js)"
CORE_CODE="$(http /api/health)"
VERIFY_CODE="$(http /api/auth/console/verify)"
RADAR_CODE="$(http '/api/seo/radar/v1?q=teste')"
OLD_CODE="$(http '/api/seo/radar?q=teste')"
LOGIN_GET_CODE="$(http /api/auth/login)"
printf '\nTESTES HTTP:\nHOME=%s CSS=%s JS=%s CORE=%s AUTH_SEM_COOKIE=%s RADAR_SEM_COOKIE=%s ROTA_ANTIGA=%s LOGIN_GET_BLOQUEADO=%s\n' \
 "$HOME_CODE" "$CSS_CODE" "$JS_CODE" "$CORE_CODE" "$VERIFY_CODE" "$RADAR_CODE" "$OLD_CODE" "$LOGIN_GET_CODE"
test "$HOME_CODE" = 200
test "$CSS_CODE" = 200
test "$JS_CODE" = 200
test "$CORE_CODE" = 200
test "$VERIFY_CODE" = 401
test "$RADAR_CODE" = 401
test "$OLD_CODE" = 404
test "$LOGIN_GET_CODE" = 403
systemctl is-active --quiet nexoterracore
systemctl is-active --quiet nginx
nginx -t
MODIFIED=0
trap - ERR
echo "============================================================"
echo " RADAR PUBLICADO: https://$DOMAIN/"
echo " INTERFACE, CSS, JS E ROTAS: OK"
echo " CORE, GPS STUDIO E BANCO: NAO ALTERADOS"
echo " BACKUP: $BACKUP"
echo " PROXIMO: testar login do proprietario no navegador"
echo " e executar consulta; fonte externa ainda nao validada."
echo "============================================================"
