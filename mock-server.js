/**
 * mock-server.js
 * Lightweight Express mock for PIWeb development.
 * Mimics the /api/records REST endpoints that your C++ backend exposes.
 *
 * Run with:  node mock-server.js
 * Requires:  npm install express cors  (one-time, in this folder)
 */

import express from 'express';
import cors    from 'cors';

const app  = express();
const PORT = 8081;

app.use(cors());
app.use(express.json());

// ── In-memory "database" ──────────────────────────────────────────────────────
let nextId  = 5;
let records = [
  { id: 1, name: 'Project Alpha',  category: 'work',     value: 1500, notes: 'Q1 deliverable' },
  { id: 2, name: 'Budget 2025',    category: 'finance',  value: 42000, notes: 'Annual budget' },
  { id: 3, name: 'Personal Goals', category: 'personal', value: 0,    notes: 'Health and fitness' },
  { id: 4, name: 'Server Logs',    category: 'general',  value: 0,    notes: 'FluxForge WS logs' },
];

// ── Routes ─────────────────────────────────────────────────────────────────────

// GET /api/records — list all
app.get('/api/records', (_req, res) => {
  res.json(records);
});

// GET /api/records/:id — single record
app.get('/api/records/:id', (req, res) => {
  const record = records.find(r => r.id === Number(req.params.id));
  if (!record) return res.status(404).json({ error: 'Not found' });
  res.json(record);
});

// POST /api/records — create
app.post('/api/records', (req, res) => {
  const { name, category, value, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const record = { id: nextId++, name, category: category || null, value: value || 0, notes: notes || null };
  records.push(record);
  res.status(201).json(record);
});

// PUT /api/records/:id — update
app.put('/api/records/:id', (req, res) => {
  const idx = records.findIndex(r => r.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const { name, category, value, notes } = req.body;
  records[idx] = { ...records[idx], name, category, value, notes };
  res.json(records[idx]);
});

// DELETE /api/records/:id — delete
app.delete('/api/records/:id', (req, res) => {
  const idx = records.findIndex(r => r.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  records.splice(idx, 1);
  res.status(204).send();
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ FluxForge mock server running at http://localhost:${PORT}`);
  console.log(`   Endpoints:`);
  console.log(`   GET    /api/records`);
  console.log(`   GET    /api/records/:id`);
  console.log(`   POST   /api/records`);
  console.log(`   PUT    /api/records/:id`);
  console.log(`   DELETE /api/records/:id\n`);
});
