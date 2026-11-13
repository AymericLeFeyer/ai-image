// Serveur sans dépendance : sert public/ et relaie les appels à OpenAI en ajoutant la clé
// lue dans l'environnement (OPENAI_API_KEY), pour qu'elle ne passe jamais par le navigateur.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = +process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const KEY = (process.env.OPENAI_API_KEY || '').trim();
const ADMIN = (process.env.OPENAI_ADMIN_KEY || '').trim();
const PUB = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const OPENAI = 'https://api.openai.com/v1';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

async function proxy(req, res, target) {
  if (!KEY) return send(res, 503, { error: { message: "OPENAI_API_KEY n'est pas définie sur le serveur (variable d'environnement de la stack)." } });
  try {
    const headers = { Authorization: 'Bearer ' + KEY };
    if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];
    const r = await fetch(target, { method: 'POST', headers, body: Readable.toWeb(req), duplex: 'half' });
    res.writeHead(r.status, { 'Content-Type': r.headers.get('content-type') || 'application/json' });
    Readable.fromWeb(r.body).pipe(res);
  } catch (e) { send(res, 502, { error: { message: 'Relais OpenAI impossible : ' + e.message } }); }
}

async function monthCosts(res) {
  if (!ADMIN) return send(res, 200, { available: false });
  try {
    const d = new Date();
    const start = Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 1000);
    const r = await fetch(`${OPENAI}/organization/costs?start_time=${start}&bucket_width=1d&limit=31`, { headers: { Authorization: 'Bearer ' + ADMIN } });
    const j = await r.json();
    if (!r.ok) return send(res, 200, { available: true, error: j.error?.message || 'HTTP ' + r.status });
    let total = 0;
    for (const b of j.data || []) for (const x of b.results || []) total += +x.amount?.value || 0;
    send(res, 200, { available: true, total });
  } catch (e) { send(res, 200, { available: true, error: e.message }); }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  if (p === '/api/config') return send(res, 200, { hasKey: !!KEY, hasAdmin: !!ADMIN });
  if (p === '/api/costs') return monthCosts(res);
  if (req.method === 'POST' && (p === '/api/images/generations' || p === '/api/images/edits' || p === '/api/responses')) return proxy(req, res, OPENAI + p.slice(4));
  if (req.method !== 'GET') return send(res, 405, { error: { message: 'Méthode non autorisée' } });
  const file = path.normalize(path.join(PUB, p === '/' ? 'index.html' : p));
  if (!file.startsWith(PUB)) return send(res, 403, { error: { message: 'Interdit' } });
  try {
    const buf = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  } catch { send(res, 404, { error: { message: 'Introuvable' } }); }
}).listen(PORT, HOST, () => console.log(`ai-image sur http://${HOST}:${PORT} — clé API : ${KEY ? 'définie' : 'MANQUANTE'}${ADMIN ? ' (clé admin définie)' : ''}`));
