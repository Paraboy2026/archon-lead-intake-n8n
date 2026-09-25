import assert from 'node:assert/strict';

const endpoint = process.env.N8N_WEBHOOK_URL;
if (!endpoint) throw new Error('Set N8N_WEBHOOK_URL to the production webhook URL shown in n8n');
async function post(body) {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const json = await response.json();
  assert.equal(response.status, 200, JSON.stringify(json));
  return json;
}
const nonce = Date.now();
const lead = { name: 'Example Lead', email: `lead-${nonce}@example.test`, phone: `+593${String(nonce).slice(-9)}`, language: 'es', area: 'norte', budget: 120000 };
const first = await post({ ...lead, source: 'website' });
const second = await post({ ...lead, source: 'portal-email', budget: 130000 });
assert.equal(first.result, 'created');
assert.equal(second.result, 'updated');
assert.equal(first.lead.id, second.lead.id);
assert.equal(second.lead.source_count, 2);
console.log(JSON.stringify({ first, second }, null, 2));
