// Storage for orders, settings and staff.
// • DATABASE_URL set  → your Supabase Postgres database (orders survive deploys).
//   Use Supabase's "Session pooler" connection string (Render can't reach the
//   IPv6-only direct connection). Tables live in a private `joyfull` schema with
//   row-level security on, so they are never exposed through Supabase's public API.
// • otherwise         → a JSON file in DATA_DIR (default ./data) for local testing.
// Everything is also kept in memory, so reads are instant.
import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_SETTINGS = {
  ordersPaused: false,
  pauseMessage: '',
  prepMinutes: 15,                // default "ready in" estimate
  paymentMethods: ['cash', 'card_at_counter'],
  soldOut: [],
  nextNumber: 1001,
};

export async function createStore() {
  const db = { orders: new Map(), settings: { ...DEFAULT_SETTINGS }, staff: [] };
  const url = process.env.DATABASE_URL;
  let backend;

  if (url) {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false }, max: 5 });
    await pool.query(`CREATE SCHEMA IF NOT EXISTS joyfull;
      CREATE TABLE IF NOT EXISTS joyfull.orders (id TEXT PRIMARY KEY, number INT, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS joyfull.kv (key TEXT PRIMARY KEY, value JSONB NOT NULL);
      ALTER TABLE joyfull.orders ENABLE ROW LEVEL SECURITY;
      ALTER TABLE joyfull.kv ENABLE ROW LEVEL SECURITY;
      REVOKE ALL ON SCHEMA joyfull FROM anon, authenticated;`).catch(async (e) => {
      // anon/authenticated roles only exist on Supabase — retry without the REVOKE elsewhere
      if (!/role .* does not exist/.test(e.message)) throw e;
      await pool.query(`CREATE SCHEMA IF NOT EXISTS joyfull;
        CREATE TABLE IF NOT EXISTS joyfull.orders (id TEXT PRIMARY KEY, number INT, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
        CREATE TABLE IF NOT EXISTS joyfull.kv (key TEXT PRIMARY KEY, value JSONB NOT NULL);`);
    });
    const o = await pool.query('SELECT data FROM joyfull.orders ORDER BY created_at DESC LIMIT 5000');
    for (const r of o.rows) db.orders.set(r.data.id, r.data);
    const kv = await pool.query('SELECT key, value FROM joyfull.kv');
    for (const r of kv.rows) { if (r.key === 'settings') db.settings = { ...DEFAULT_SETTINGS, ...r.value }; if (r.key === 'staff') db.staff = r.value; }
    backend = {
      kind: 'postgres',
      saveOrder: (o) => pool.query('INSERT INTO joyfull.orders (id, number, data, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data', [o.id, o.number, o, o.createdAt]),
      saveKV: (k, v) => pool.query('INSERT INTO joyfull.kv (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [k, JSON.stringify(v)]),
    };
  } else {
    const dir = process.env.DATA_DIR || path.resolve('data');
    const file = path.join(dir, 'joyfull-orders.json');
    await fs.mkdir(dir, { recursive: true });
    try {
      const j = JSON.parse(await fs.readFile(file, 'utf8'));
      for (const o of j.orders ?? []) db.orders.set(o.id, o);
      db.settings = { ...DEFAULT_SETTINGS, ...(j.settings ?? {}) };
      db.staff = j.staff ?? [];
    } catch { /* first run */ }
    let timer = null, writing = Promise.resolve();
    const flush = () => {
      timer = null;
      const body = JSON.stringify({ orders: [...db.orders.values()], settings: db.settings, staff: db.staff });
      writing = writing.then(async () => { await fs.writeFile(file + '.tmp', body); await fs.rename(file + '.tmp', file); }).catch((e) => console.error('[store] write failed', e));
    };
    const schedule = () => { if (!timer) timer = setTimeout(flush, 150); return Promise.resolve(); };
    backend = { kind: 'file', file, saveOrder: schedule, saveKV: schedule };
  }

  return {
    kind: backend.kind,
    orders: () => [...db.orders.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    getOrder: (id) => db.orders.get(id) ?? null,
    findByNumber: (n) => [...db.orders.values()].find((o) => o.number === n) ?? null,
    async putOrder(o) { db.orders.set(o.id, o); await backend.saveOrder(o); return o; },
    settings: () => db.settings,
    async setSettings(patch) { db.settings = { ...db.settings, ...patch }; await backend.saveKV('settings', db.settings); return db.settings; },
    staff: () => db.staff,
    async setStaff(list) { db.staff = list; await backend.saveKV('staff', db.staff); return db.staff; },
    async takeNumber() { const n = db.settings.nextNumber || 1001; db.settings.nextNumber = n + 1; await backend.saveKV('settings', db.settings); return n; },
  };
}
