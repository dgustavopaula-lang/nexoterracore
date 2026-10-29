// dashboard-routes.js — rotas do Console Sistema Raiz para a NexoTerraCore/API (Express, Node 18+)
//
// Uso no app principal:
//   const dashboardRoutes = require('./dashboard-routes');
//   app.use(dashboardRoutes(requireAuth));   // requireAuth = seu middleware de autenticação atual
//
// Variáveis no .env da API (nunca no front-end):
//   CDSE_CLIENT_ID=...          # Copernicus Data Space > User settings > OAuth clients
//   CDSE_CLIENT_SECRET=...
//   DASHBOARD_ALLOWED_HOSTS=gustavopaulasantos.com.br,dgustavopaula-lang.github.io
//   APP_VERSION=...             # opcional, aparece no topo do painel

const express = require('express');

module.exports = function dashboardRoutes(requireAuth) {
  const router = express.Router();
  router.use(express.json({ limit: '50kb' }));
  // Sem middleware passado: usa uma chave própria do painel (DASHBOARD_TOKEN no .env).
  // Não mexe no login existente da API. Sem a chave configurada, as rotas ficam fechadas.
  const crypto = require('crypto');
  const tokenGuard = (req, res, next) => {
    const esperado = process.env.DASHBOARD_TOKEN || '';
    const recebido = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const a = Buffer.from(recebido), b = Buffer.from(esperado);
    if (!esperado || a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'chave do painel inválida' });
    next();
  };
  const auth = typeof requireAuth === 'function' ? requireAuth : tokenGuard;

  // ---------- Saúde ----------
  router.get('/api/dashboard/health', auth, (req, res) => {
    res.json({ ok: true, version: process.env.APP_VERSION || 'ok', time: new Date().toISOString() });
  });

  // ---------- Mini softwares no ar? (checado no servidor, sem CORS) ----------
  const allowed = (process.env.DASHBOARD_ALLOWED_HOSTS || 'gustavopaulasantos.com.br,dgustavopaula-lang.github.io')
    .split(',').map(s => s.trim()).filter(Boolean);
  const hostOk = h => allowed.some(a => h === a || h.endsWith('.' + a));

  router.post('/api/dashboard/minisoftwares', auth, async (req, res) => {
    const list = Array.isArray(req.body?.urls) ? req.body.urls.slice(0, 40) : [];
    const results = await Promise.all(list.map(async ({ name, url }) => {
      let u;
      try { u = new URL(url); } catch { return { name, url, up: false, error: 'url inválida' }; }
      if (u.protocol !== 'https:' || !hostOk(u.hostname)) return { name, url, up: false, error: 'host não permitido' };
      const t0 = Date.now();
      try {
        const r = await fetch(u, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(8000) });
        return { name, url, up: r.ok, status: r.status, ms: Date.now() - t0 };
      } catch (e) { return { name, url, up: false, error: e.name }; }
    }));
    res.json({ checkedAt: new Date().toISOString(), results });
  });

  // ---------- Sentinel-2 NDVI (Copernicus Data Space, Statistical API) ----------
  let cdseToken = null, cdseExp = 0;
  async function getCdseToken() {
    if (cdseToken && Date.now() < cdseExp - 60000) return cdseToken;
    const { CDSE_CLIENT_ID: id, CDSE_CLIENT_SECRET: secret } = process.env;
    if (!id || !secret) throw Object.assign(new Error('CDSE_CLIENT_ID/SECRET ausentes no .env'), { status: 501 });
    const r = await fetch('https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret }),
    });
    if (!r.ok) throw Object.assign(new Error('Falha ao autenticar no Copernicus (' + r.status + ')'), { status: 502 });
    const j = await r.json();
    cdseToken = j.access_token; cdseExp = Date.now() + j.expires_in * 1000;
    return cdseToken;
  }

  const EVALSCRIPT = `//VERSION=3
function setup(){return{input:[{bands:["B04","B08","SCL","dataMask"]}],output:[{id:"ndvi",bands:1,sampleType:"FLOAT32"},{id:"dataMask",bands:1}]};}
function evaluatePixel(s){
  var ndvi=(s.B08-s.B04)/(s.B08+s.B04+1e-6);
  var nuvem=[3,8,9,10].indexOf(s.SCL)>=0; // sombra, nuvem média/alta, cirrus
  return{ndvi:[ndvi],dataMask:[s.dataMask&&!nuvem?1:0]};
}`;

  const cache = new Map(); // evita gastar cota repetindo a mesma consulta
  router.get('/api/geo/ndvi', auth, async (req, res) => {
    try {
      const lat = Number(req.query.lat), lon = Number(req.query.lon);
      const radius = Math.min(Math.max(Number(req.query.radius) || 300, 30), 5000);
      const days = Math.min(Math.max(Number(req.query.days) || 90, 10), 365);
      if (!(Math.abs(lat) <= 90 && Math.abs(lon) <= 180)) return res.status(400).json({ error: 'lat/lon inválidos' });

      const key = [lat.toFixed(4), lon.toFixed(4), radius, days].join('|');
      const hit = cache.get(key);
      if (hit && Date.now() - hit.t < 6 * 3600e3) return res.json(hit.data);

      const dLat = radius / 111320, dLon = radius / (111320 * Math.cos(lat * Math.PI / 180));
      const to = new Date(), from = new Date(to.getTime() - days * 864e5);
      const body = {
        input: {
          bounds: { bbox: [lon - dLon, lat - dLat, lon + dLon, lat + dLat], properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' } },
          data: [{ type: 'sentinel-2-l2a', dataFilter: { maxCloudCoverage: 60 } }],
        },
        aggregation: {
          timeRange: { from: from.toISOString(), to: to.toISOString() },
          aggregationInterval: { of: 'P5D' },
          evalscript: EVALSCRIPT,
          width: 40, height: 40,
        },
        calculations: { default: {} },
      };
      const token = await getCdseToken();
      const r = await fetch('https://sh.dataspace.copernicus.eu/api/v1/statistics', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) return res.status(502).json({ error: 'Copernicus respondeu ' + r.status, detail: (await r.text()).slice(0, 300) });
      const j = await r.json();
      const series = (j.data || []).map(d => {
        const s = d.outputs?.ndvi?.bands?.B0?.stats;
        const valid = s ? s.sampleCount - s.noDataCount : 0;
        return s && valid > 0 && Number.isFinite(s.mean) ? { date: d.interval.from.slice(0, 10), ndvi: +s.mean.toFixed(3), validPixels: valid } : null;
      }).filter(Boolean);
      const data = { lat, lon, radius, days, source: 'Sentinel-2 L2A / Copernicus Data Space', series };
      cache.set(key, { t: Date.now(), data });
      res.json(data);
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message });
    }
  });

  // ---------- Disponibilidade nas últimas 24 h (lida do registro do monitor do servidor) ----------
  const UPTIME_LOG = process.env.UPTIME_LOG || '/var/log/nexus/uptime.log';
  router.get('/api/dashboard/uptime', auth, (req, res) => {
    let linhas = [];
    try {
      linhas = require('fs').readFileSync(UPTIME_LOG, 'utf8').trim().split('\n').filter(Boolean).slice(-288); // 288 = 24 h a cada 5 min
    } catch { /* ainda sem registro */ }
    const ok = linhas.filter(l => / 200 /.test(l)).length;
    res.json({
      janelaHoras: 24,
      verificacoes: linhas.length,
      no_ar: ok,
      percentual: linhas.length ? +(100 * ok / linhas.length).toFixed(2) : null,
      ultima: linhas.length ? linhas[linhas.length - 1] : null,
    });
  });

  // ---------- Analytics (fonte a definir) ----------
  router.get('/api/dashboard/analytics', auth, (req, res) => {
    res.status(501).json({ error: 'Fonte de analytics ainda não configurada' });
  });

  return router;
};
