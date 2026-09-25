#!/usr/bin/env bash
# NexoTerraCore: instala somente o vhost HTTPS do Radar SEO na VPS.
# Nao altera Node.js, Python, PostgreSQL, Console ou vhosts existentes.
set -Eeuo pipefail

DOMAIN="radar.gustavopaulasantos.com.br"
IP="129.121.39.44"
WEB="/var/www/nexoterracore-radar"
CONF="/etc/nginx/sites-available/nexoterracore-radar"
ENABLED="/etc/nginx/sites-enabled/nexoterracore-radar"
CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
CREATED=0
BACKUP=""

rollback() {
  local code=$?
  trap - ERR
  if [ "$CREATED" -eq 1 ]; then
    echo "FALHA NA INSTALACAO. Revertendo apenas o vhost novo..."
    rm -f -- "$ENABLED" "$CONF"
    rm -f -- "$WEB/index.html"
    if nginx -t >/dev/null 2>&1; then
      systemctl reload nginx || true
    else
      echo "ATENCAO: verificar Nginx manualmente; arquivo do novo vhost removido."
    fi
  fi
  echo "Core, Python e banco nao foram alterados. Backup Nginx: $BACKUP"
  exit "$code"
}
trap rollback ERR

echo "======================================================"
echo " RADAR SEO | DNS + NGINX + HTTPS | INSTALACAO ISOLADA"
echo "======================================================"

if [ "$(id -u)" -ne 0 ]; then echo "ERRO: necessario executar como root."; exit 1; fi
if [ -e "$CONF" ] || [ -L "$ENABLED" ] || [ -e "$ENABLED" ]; then
  echo "ABORTADO: ja existe configuracao de Radar SEO. Nao sobrescrever."
  exit 2
fi
if nginx -T 2>/dev/null | grep -Eq "^[[:space:]]*server_name[[:space:]]+radar[.]gustavopaulasantos[.]com[.]br([[:space:];]|$)"; then
  echo "ABORTADO: dominio Radar SEO ja possui um vhost ativo."
  exit 2
fi
if [ -e "$WEB/index.html" ]; then
  echo "ABORTADO: ja existe uma pagina Radar SEO. Nao sobrescrever."
  exit 2
fi
RESOLVIDO="$(getent ahostsv4 "$DOMAIN" | awk 'NR==1 {print $1}')"
if [ "$RESOLVIDO" != "$IP" ]; then
  echo "ABORTADO: DNS aponta para $RESOLVIDO, esperado $IP."
  exit 2
fi
command -v certbot >/dev/null
nginx -t
systemctl is-active --quiet nginx
systemctl is-active --quiet nexoterracore
curl --noproxy '*' -fsS --max-time 8 -o /dev/null "http://127.0.0.1:3000/api/health"
curl --noproxy '*' -fsS --max-time 8 -o /dev/null "http://127.0.0.1:3101/api/seo/radar?q=teste"

umask 077
BACKUP="$(mktemp -d /root/backup-radar-vhost-XXXXXXXX)"
nginx -T > "$BACKUP/nginx-before.txt" 2>"$BACKUP/nginx-warnings.txt"
umask 022
mkdir -p "$WEB/.well-known/acme-challenge"

cat > "$WEB/index.html" <<'HTML'
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>Radar SEO | NexoTerraCore</title>
  <style>
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#10151a;color:#f3f6f7;font:16px system-ui,Arial,sans-serif;padding:22px}
    main{width:min(100%,620px);padding:32px;border:1px solid #34414b;border-radius:18px;background:#192229}
    small{color:#ff6b1a;letter-spacing:.07em;font-weight:800}h1{margin:12px 0 14px;font-size:clamp(28px,6vw,42px)}
    p{line-height:1.6;color:#b7c7cf}a{display:inline-block;margin-top:12px;padding:12px 17px;color:#121820;background:#ff8a43;border-radius:9px;text-decoration:none;font-weight:750}
  </style>
</head>
<body>
  <main>
    <small>NEXOTERRACORE / RADAR SEO</small>
    <h1>Radar SEO</h1>
    <p>Ambiente reservado. A API central exige autenticação e permissões. A interface de acesso será conectada na próxima etapa.</p>
    <a href="https://console.gustavopaulasantos.com.br/">Abrir Console</a>
  </main>
</body>
</html>
HTML

# Fase 1: HTTP serve somente a prova de dominio do Let's Encrypt.
cat > "$CONF" <<'NGINX_HTTP'
server {
    listen 80;
    listen [::]:80;
    server_name radar.gustavopaulasantos.com.br;
    root /var/www/nexoterracore-radar;
    location ^~ /.well-known/acme-challenge/ {
        default_type text/plain;
        try_files $uri =404;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}
NGINX_HTTP
ln -s "$CONF" "$ENABLED"
CREATED=1
nginx -t
systemctl reload nginx

CHALLENGE="radar-vhost-check-$$"
printf '%s' "$CHALLENGE" > "$WEB/.well-known/acme-challenge/$CHALLENGE"
echo 'Verificando desafio HTTP diretamente no Nginx, sem proxy...'
PROVA="$(curl --noproxy '*' -fsS --max-time 8 --resolve "$DOMAIN:80:127.0.0.1" "http://$DOMAIN/.well-known/acme-challenge/$CHALLENGE")"
rm -f -- "$WEB/.well-known/acme-challenge/$CHALLENGE"
if [ "$PROVA" != "$CHALLENGE" ]; then echo "ABORTADO: desafio HTTP nao corresponde."; false; fi

# Nao solicita pagamento nem modifica configuracao de sites existentes.
if [ ! -s "$CERT" ] || [ ! -s "$KEY" ]; then
  certbot certonly --webroot -w "$WEB" -d "$DOMAIN" \
    --non-interactive --agree-tos --no-eff-email --keep-until-expiring
fi
test -s "$CERT"
test -s "$KEY"

# Fase 2: servir site HTTPS e somente a rota protegida do Core.
cat > "$CONF" <<'NGINX_HTTPS'
server {
    listen 80;
    listen [::]:80;
    server_name radar.gustavopaulasantos.com.br;
    root /var/www/nexoterracore-radar;
    location ^~ /.well-known/acme-challenge/ {
        default_type text/plain;
        try_files $uri =404;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name radar.gustavopaulasantos.com.br;

    ssl_certificate /etc/letsencrypt/live/radar.gustavopaulasantos.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/radar.gustavopaulasantos.com.br/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root /var/www/nexoterracore-radar;
    index index.html;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy no-referrer always;

    location = /api/seo/radar/v1 {
        limit_except GET { deny all; }
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header Authorization $http_authorization;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_connect_timeout 5s;
        proxy_read_timeout 12s;
        proxy_buffering off;
        add_header Cache-Control "private, no-store" always;
    }
    location ^~ /api/ { return 404; }
    location ~ /\. { return 404; }
    location / { try_files $uri $uri/ =404; }
}
NGINX_HTTPS
nginx -t
systemctl reload nginx

HOME_STATUS="$(curl --noproxy '*' -sS --max-time 10 --resolve "$DOMAIN:443:127.0.0.1" -o /dev/null -w '%{http_code}' "https://$DOMAIN/")"
AUTH_STATUS="$(curl --noproxy '*' -sS --max-time 10 --resolve "$DOMAIN:443:127.0.0.1" -o /dev/null -w '%{http_code}' "https://$DOMAIN/api/seo/radar/v1?q=gestao-rural")"
LEGACY_STATUS="$(curl --noproxy '*' -sS --max-time 10 --resolve "$DOMAIN:443:127.0.0.1" -o /dev/null -w '%{http_code}' "https://$DOMAIN/api/seo/radar?q=gestao-rural")"
printf 'HTTPS_HOME=%s\nRADAR_SEM_LOGIN=%s\nROTA_ANTIGA_NO_SUBDOMINIO=%s\n' "$HOME_STATUS" "$AUTH_STATUS" "$LEGACY_STATUS"
if [ "$HOME_STATUS" != 200 ] || [ "$AUTH_STATUS" != 401 ] || [ "$LEGACY_STATUS" != 404 ]; then
  echo "ABORTADO: resultado HTTP fora do esperado."
  false
fi

CREATED=0
trap - ERR
echo "======================================================"
echo " RADAR DOMINIO CONFIGURADO: https://$DOMAIN/"
echo " HTTPS: OK | CORE: 3000 | SEO PYTHON: 3101"
echo " ROTA DO CORE: /api/seo/radar/v1 (AUTH OBRIGATORIA)"
echo " INTERFACE DE LOGIN: AINDA NAO IMPLEMENTADA"
echo " BACKUP NGINX: $BACKUP"
echo "======================================================"
