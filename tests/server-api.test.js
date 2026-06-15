/**
 * Server API integration tests — node:test
 * Starts a live server on a test port, runs HTTP tests, then shuts down.
 * Run: node --test tests/server-api.test.js
 */
'use strict';

const { describe, it, before, after } = require('node:test');
const assert   = require('node:assert/strict');
const http     = require('node:http');
const path     = require('node:path');
const fs       = require('node:fs');

const SERVER_FILE = path.join(__dirname, '../server/index.js');
const TEST_PORT   = 18082;

// ── Minimal HTTP helper ────────────────────────────────────────────────────────
function req(method, url, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: url,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    const request = http.request(opts, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    request.on('error', reject);
    if (body) request.write(JSON.stringify(body));
    request.end();
  });
}

// ── Server setup — load the actual server on a test port ──────────────────────
let server;
let authToken;
let testUserId;

before(async () => {
  // Override the port for testing by setting env var
  process.env.PORT = String(TEST_PORT);
  // Require the server — it listens on process.env.PORT
  server = require(SERVER_FILE);
  // Give it a tick to bind
  await new Promise(r => setTimeout(r, 300));
});

after(async () => {
  if (server?.close) server.close();
});

// ── Health ─────────────────────────────────────────────────────────────────────
describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const { status, body } = await req('GET', '/api/health');
    assert.strictEqual(status, 200);
    assert.strictEqual(body.status, 'ok');
    assert.ok('time' in body);
    assert.ok('files' in body);
  });
});

// ── Auth ───────────────────────────────────────────────────────────────────────
describe('Auth API', () => {
  const testEmail = `test_${Date.now()}@piexpert.test`;
  const testPass  = 'TestPass123!';
  const testName  = 'Test User';

  it('POST /api/auth/register creates user and returns token', async () => {
    const { status, body } = await req('POST', '/api/auth/register', {
      email: testEmail, name: testName, password: testPass,
    });
    assert.ok([200, 201].includes(status), `status=${status} body=${JSON.stringify(body)}`);
    assert.ok(body.token, 'missing token');
    assert.ok(body.user,  'missing user');
    assert.strictEqual(body.user.email, testEmail);
    authToken = body.token;
    testUserId = body.user.id;
  });

  it('POST /api/auth/register rejects duplicate email', async () => {
    const { status } = await req('POST', '/api/auth/register', {
      email: testEmail, name: 'Dup', password: testPass,
    });
    assert.ok(status >= 400, `expected 4xx, got ${status}`);
  });

  it('POST /api/auth/login returns token for valid credentials', async () => {
    const { status, body } = await req('POST', '/api/auth/login', {
      email: testEmail, password: testPass,
    });
    assert.strictEqual(status, 200);
    assert.ok(body.token);
  });

  it('POST /api/auth/login rejects wrong password', async () => {
    const { status } = await req('POST', '/api/auth/login', {
      email: testEmail, password: 'wrongpass',
    });
    assert.ok(status >= 400);
  });

  it('POST /api/auth/login rejects unknown email', async () => {
    const { status } = await req('POST', '/api/auth/login', {
      email: 'nobody@nowhere.test', password: 'x',
    });
    assert.ok(status >= 400);
  });
});

// ── Components ─────────────────────────────────────────────────────────────────
describe('Components API', () => {
  let createdId;

  it('GET /api/components returns array', async () => {
    const { status, body } = await req('GET', '/api/components');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body), 'expected array');
    assert.ok(body.length > 0, 'expected seeded components');
  });

  it('GET /api/components?type=capacitor filters correctly', async () => {
    const { status, body } = await req('GET', '/api/components?type=capacitor');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body));
    body.forEach(c => assert.strictEqual(c.type, 'capacitor'));
  });

  it('GET /api/components/:id returns single component', async () => {
    const { body: list } = await req('GET', '/api/components');
    const id = list[0].id;
    const { status, body } = await req('GET', `/api/components/${id}`);
    assert.strictEqual(status, 200);
    assert.strictEqual(body.id, id);
  });

  it('GET /api/components/:id returns 404 for unknown id', async () => {
    const { status } = await req('GET', '/api/components/99999999');
    assert.strictEqual(status, 404);
  });

  it('POST /api/components creates new component', async () => {
    const { status, body } = await req('POST', '/api/components', {
      type: 'resistor', subtype: 'feedback', library: 'test',
      part: 'TEST-R-001', mfr: 'TestMfr', value: 10, unit: 'kΩ',
    });
    assert.strictEqual(status, 201);
    assert.ok(body.id);
    assert.strictEqual(body.part, 'TEST-R-001');
    createdId = body.id;
  });

  it('PUT /api/components/:id updates component', async () => {
    const { status, body } = await req('PUT', `/api/components/${createdId}`, {
      part: 'TEST-R-001-UPD', mfr: 'UpdatedMfr',
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.part, 'TEST-R-001-UPD');
  });

  it('DELETE /api/components/:id removes component', async () => {
    const { status } = await req('DELETE', `/api/components/${createdId}`);
    assert.ok([200, 204].includes(status));
    // Verify it's gone
    const { status: s2 } = await req('GET', `/api/components/${createdId}`);
    assert.strictEqual(s2, 404);
  });
});

// ── Component Sets ─────────────────────────────────────────────────────────────
describe('Component Sets API', () => {
  let setId;
  let compId;

  it('GET /api/component-sets returns array', async () => {
    const { status, body } = await req('GET', '/api/component-sets');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body));
  });

  it('POST /api/component-sets creates a set', async () => {
    const { status, body } = await req('POST', '/api/component-sets', {
      name: 'Test Set ' + Date.now(), description: 'Unit test set',
    });
    assert.strictEqual(status, 201);
    assert.ok(body.id);
    setId = body.id;
  });

  it('GET /api/component-sets/:id returns set with components array', async () => {
    const { status, body } = await req('GET', `/api/component-sets/${setId}`);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body.components));
  });

  it('POST /api/component-sets/:id/components adds a component', async () => {
    // Get a real component id first
    const { body: comps } = await req('GET', '/api/components');
    compId = comps[0].id;
    const { status } = await req('POST', `/api/component-sets/${setId}/components`, {
      component_id: compId,
    });
    assert.ok([200, 201].includes(status));
  });

  it('GET set/:id now includes the added component', async () => {
    const { body } = await req('GET', `/api/component-sets/${setId}`);
    const found = body.components.some(c => c.id === compId);
    assert.ok(found, 'Added component not found in set');
  });

  it('DELETE /api/component-sets/:id/components/:cid removes component from set', async () => {
    const { status } = await req('DELETE', `/api/component-sets/${setId}/components/${compId}`);
    assert.ok([200, 204].includes(status));
  });

  it('PUT /api/component-sets/:id updates name', async () => {
    const { status, body } = await req('PUT', `/api/component-sets/${setId}`, {
      name: 'Updated Test Set',
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.name, 'Updated Test Set');
  });

  it('DELETE /api/component-sets/:id removes the set', async () => {
    const { status } = await req('DELETE', `/api/component-sets/${setId}`);
    assert.ok([200, 204].includes(status));
  });
});

// ── Magnetics ──────────────────────────────────────────────────────────────────
describe('Magnetics API', () => {
  it('GET /api/mag/cores returns array with seeded cores', async () => {
    const { status, body } = await req('GET', '/api/mag/cores');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body));
    assert.ok(body.length >= 10, `expected ≥10 seeded cores, got ${body.length}`);
  });

  it('GET /api/mag/materials returns seeded materials', async () => {
    const { status, body } = await req('GET', '/api/mag/materials');
    assert.strictEqual(status, 200);
    assert.ok(body.length >= 5);
    const names = body.map(m => m.material);
    assert.ok(names.includes('PC95') || names.includes('N87'), 'Missing expected materials');
  });

  it('GET /api/mag/bobbins returns seeded bobbins', async () => {
    const { status, body } = await req('GET', '/api/mag/bobbins');
    assert.strictEqual(status, 200);
    assert.ok(body.length >= 5);
  });

  it('GET /api/mag/cores/:id returns 404 for unknown id', async () => {
    const { status } = await req('GET', '/api/mag/cores/99999');
    assert.strictEqual(status, 404);
  });

  it('POST + DELETE /api/mag/materials round-trips correctly', async () => {
    const { status: s1, body: created } = await req('POST', '/api/mag/materials', {
      material: 'TEST_MAT_' + Date.now(), bmax_100c: 0.40, bmax_25c: 0.50,
      mu_i: 2000, freq_min_khz: 100, freq_max_khz: 500, mfr: 'TestMfr',
    });
    assert.strictEqual(s1, 201);
    assert.ok(created.id);
    const { status: s2 } = await req('DELETE', `/api/mag/materials/${created.id}`);
    assert.ok([200, 204].includes(s2));
  });
});

// ── Files API ──────────────────────────────────────────────────────────────────
describe('Files API', () => {
  it('GET /api/files returns array', async () => {
    const { status, body } = await req('GET', '/api/files');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(body));
  });
});
