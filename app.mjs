import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const runtime = join(import.meta.dirname, 'runtime');
mkdirSync(runtime, { recursive: true });
const db = new DatabaseSync(join(runtime, 'leads.sqlite'));
db.exec(`CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY, identity TEXT NOT NULL UNIQUE, name TEXT, email TEXT, phone TEXT,
  source TEXT NOT NULL, language TEXT NOT NULL, area TEXT, budget INTEGER, owner TEXT NOT NULL,
  source_count INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);`);

const clean = (v) => String(v ?? '').trim();
const respond = (res, code, data) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)); };
async function inputOf(req) {
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 50_000) throw new Error('body too large'); }
  return JSON.parse(raw || '{}');
}

function ingest(v) {
  const email = clean(v.email).toLowerCase();
  const phone = clean(v.phone).replace(/[^+\d]/g, '');
  if (!email && !phone) return { code: 422, body: { error: 'email or phone required' } };
  const identity = email || phone;
  const language = v.language === 'en' ? 'en' : 'es';
  const source = clean(v.source) || 'website';
  const area = clean(v.area).toLowerCase() || null;
  const owner = language === 'en' || area === 'sur' ? 'Luis Paredes' : 'Ana Torres';
  const budget = Number.isFinite(Number(v.budget)) && clean(v.budget) ? Number(v.budget) : null;
  const prior = db.prepare('SELECT * FROM leads WHERE identity = ? OR (phone IS NOT NULL AND phone = ?) OR (email IS NOT NULL AND email = ?)').get(identity, phone || null, email || null);
  const stamp = new Date().toISOString();
  if (prior) {
    db.prepare(`UPDATE leads SET name=COALESCE(?,name),email=COALESCE(?,email),phone=COALESCE(?,phone),
      source=?,language=?,area=COALESCE(?,area),budget=COALESCE(?,budget),owner=?,
      source_count=source_count+1,updated_at=? WHERE id=?`).run(
      clean(v.name) || null, email || null, phone || null, source, language, area, budget, owner, stamp, prior.id,
    );
  } else {
    db.prepare(`INSERT INTO leads(identity,name,email,phone,source,language,area,budget,owner,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(identity, clean(v.name) || null, email || null, phone || null, source, language, area, budget, owner, stamp, stamp);
  }
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(prior?.id ?? db.prepare('SELECT last_insert_rowid() AS id').get().id);
  return { code: 200, body: { result: prior ? 'updated' : 'created', lead } };
}

const port = Number(process.env.LEAD_PORT || 5711);
createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') return respond(res, 200, { ok: true, project: 'lead-intake' });
    if (req.method === 'GET' && req.url === '/leads') return respond(res, 200, db.prepare('SELECT * FROM leads ORDER BY id DESC LIMIT 100').all());
    if (req.method === 'POST' && req.url === '/ingest') { const { code, body } = ingest(await inputOf(req)); return respond(res, code, body); }
    return respond(res, 404, { error: 'not found' });
  } catch (error) { return respond(res, 400, { error: error.message }); }
}).listen(port, '127.0.0.1', () => process.stdout.write(`lead-intake on 127.0.0.1:${port}\n`));
