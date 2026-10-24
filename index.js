import express from 'express';
import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'ecoloop.db');
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN('household','partner','admin')), district TEXT, points INTEGER NOT NULL DEFAULT 0 CHECK(points>=0), partner_id INTEGER);
CREATE TABLE IF NOT EXISTS bins(id INTEGER PRIMARY KEY, name TEXT NOT NULL, district TEXT, active INTEGER NOT NULL DEFAULT 1, fill INTEGER NOT NULL DEFAULT 0, updated_at TEXT);
CREATE TABLE IF NOT EXISTS deposits(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), bin_id INTEGER NOT NULL REFERENCES bins(id), kg REAL NOT NULL CHECK(kg>0), points INTEGER NOT NULL, seeded INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_dep_user ON deposits(user_id);
CREATE TABLE IF NOT EXISTS partners(id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS offers(id INTEGER PRIMARY KEY, partner_id INTEGER NOT NULL REFERENCES partners(id), title TEXT NOT NULL, category TEXT NOT NULL, description TEXT, discount TEXT NOT NULL, cost INTEGER NOT NULL CHECK(cost>0), valid_until TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS coupons(id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, user_id INTEGER NOT NULL REFERENCES users(id), offer_id INTEGER NOT NULL REFERENCES offers(id), status TEXT NOT NULL DEFAULT 'active' CHECK(status IN('active','used')), seeded INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, used_at TEXT);
CREATE INDEX IF NOT EXISTS idx_cp_user ON coupons(user_id);
CREATE TABLE IF NOT EXISTS point_tx(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), delta INTEGER NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);

const now = () => new Date().toISOString();
const daysAgo = (d, h = 10) => new Date(Date.now() - d * 864e5 - h * 36e5).toISOString();
const setting = (k) => db.prepare('SELECT value FROM settings WHERE key=?').get(k)?.value;

function seed() {
  if (db.prepare('SELECT COUNT(*) c FROM users').get().c > 0) return;
  let s = 42; const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const tx = db.transaction(() => {
    const st = db.prepare('INSERT INTO settings VALUES(?,?)');
    [['points_per_kg', '10'], ['assumed_contamination', '0.08'], ['biogas_m3_per_t', '120'], ['methane_fraction', '0.6'], ['digestate_fraction', '0.9']].forEach((r) => st.run(...r));
    const bins = [['Demo Bin Kentron 1', 'Kentron'], ['Demo Bin Arabkir 1', 'Arabkir'], ['Demo Bin Shengavit 1', 'Shengavit'], ['Demo Bin Nor Nork 1', 'Nor Nork'], ['Demo Bin Erebuni 1', 'Erebuni'], ['Demo Bin Ajapnyak 1', 'Ajapnyak'], ['Demo Bin Malatia 1', 'Malatia-Sebastia']];
    bins.forEach((b, i) => db.prepare('INSERT INTO bins(name,district,active,fill,updated_at) VALUES(?,?,?,?,?)').run(b[0], b[1], i === 5 ? 0 : 1, 15 + Math.floor(rnd() * 70), daysAgo(0, 1)));
    const partners = [['Demo Greens Market', 'Groceries'], ['Demo Cafe Loop', 'Cafes'], ['Demo Bakery Hearth', 'Bakery'], ['Demo Sip Bar', 'Drinks'], ['Demo Home Goods', 'Household']];
    partners.forEach((p) => db.prepare('INSERT INTO partners(name,category) VALUES(?,?)').run(...p));
    const offers = [[1, '10% off fresh produce', 'Groceries', 'Valid on fruit and vegetables.', '10% off', 100], [1, '500 AMD off a 5,000 AMD basket', 'Groceries', 'One use per coupon.', '500 AMD off', 150], [2, 'Free coffee with breakfast', 'Cafes', 'With any breakfast item.', 'Free coffee', 80], [2, '15% off lunch menu', 'Cafes', 'Weekdays only.', '15% off', 120], [3, 'Free pastry with bread purchase', 'Bakery', 'One pastry per coupon.', 'Free pastry', 60], [4, 'Second drink half price', 'Drinks', 'Any drink on the menu.', '50% off 2nd', 70], [5, '1,000 AMD off cleaning supplies', 'Household', 'Minimum basket 4,000 AMD.', '1,000 AMD off', 200]];
    offers.forEach((o) => db.prepare('INSERT INTO offers(partner_id,title,category,description,discount,cost,valid_until) VALUES(?,?,?,?,?,?,?)').run(...o, daysAgo(-120)));
    const iu = db.prepare('INSERT INTO users(name,role,district,points,partner_id) VALUES(?,?,?,?,?)');
    iu.run('Demo Household', 'household', 'Arabkir', 0, null);
    iu.run('Demo Partner Manager', 'partner', null, 0, 1);
    iu.run('Demo Administrator', 'admin', null, 0, null);
    const dists = ['Kentron', 'Arabkir', 'Shengavit', 'Nor Nork', 'Erebuni', 'Malatia-Sebastia'];
    for (let i = 1; i <= 99; i++) iu.run(`Demo Household ${String(i + 1).padStart(3, '0')}`, 'household', pick(dists), 0, null);
    const rate = 10;
    const idep = db.prepare('INSERT INTO deposits(user_id,bin_id,kg,points,seeded,created_at) VALUES(?,?,?,?,1,?)');
    const itx = db.prepare('INSERT INTO point_tx(user_id,delta,reason,created_at) VALUES(?,?,?,?)');
    for (let u = 4; u <= 103; u++) {
      const n = 2 + Math.floor(rnd() * 8);
      for (let k = 0; k < n; k++) {
        const kg = Math.round((0.5 + rnd() * 3.5) * 10) / 10, at = daysAgo(Math.floor(rnd() * 42));
        idep.run(u, 1 + Math.floor(rnd() * 5), kg, Math.round(kg * rate), at); itx.run(u, Math.round(kg * rate), 'Deposit (seeded demo)', at);
      }
    }
    for (const [kg, d] of [[2.4, 20], [3.1, 13], [1.8, 6], [2.7, 2]]) { idep.run(1, 2, kg, Math.round(kg * rate), daysAgo(d)); itx.run(1, Math.round(kg * rate), 'Deposit (seeded demo)', daysAgo(d)); }
    db.prepare('UPDATE users SET points=(SELECT COALESCE(SUM(delta),0) FROM point_tx WHERE user_id=users.id)').run();
    for (let k = 0; k < 40; k++) {
      const u = 4 + Math.floor(rnd() * 100), o = 1 + Math.floor(rnd() * 7), c = db.prepare('SELECT cost FROM offers WHERE id=?').get(o).cost;
      if (db.prepare('SELECT points FROM users WHERE id=?').get(u).points < c) continue;
      const at = daysAgo(Math.floor(rnd() * 30));
      db.prepare('UPDATE users SET points=points-? WHERE id=?').run(c, u);
      itx.run(u, -c, 'Coupon redeemed (seeded demo)', at);
      db.prepare('INSERT INTO coupons(code,user_id,offer_id,status,seeded,created_at,used_at) VALUES(?,?,?,?,1,?,?)').run('EL-' + crypto.randomBytes(4).toString('hex').toUpperCase(), u, o, rnd() > 0.4 ? 'used' : 'active', at, at);
    }
  });
  tx();
}
seed();

// ---- demo session tokens (signed, NOT production authentication) ----
const sign = (p) => { const b = Buffer.from(JSON.stringify(p)).toString('base64url'); return b + '.' + crypto.createHmac('sha256', SECRET).update(b).digest('base64url'); };
function verify(t) {
  const [b, sig] = (t || '').split('.');
  if (!b || !sig) return null;
  const good = crypto.createHmac('sha256', SECRET).update(b).digest('base64url');
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try { return JSON.parse(Buffer.from(b, 'base64url').toString()); } catch { return null; }
}
const auth = (...roles) => (req, res, next) => {
  const p = verify((req.headers.authorization || '').replace('Bearer ', ''));
  const u = p && db.prepare('SELECT * FROM users WHERE id=?').get(p.uid);
  if (!u) return res.status(401).json({ error: 'Session missing or expired. Choose a demo role again.' });
  if (roles.length && !roles.includes(u.role)) return res.status(403).json({ error: 'This action is not available for your role.' });
  req.user = u; next();
};
const hits = new Map();
const limit = (max) => (req, res, next) => {
  const k = req.ip + req.path, t = Date.now(), a = (hits.get(k) || []).filter((x) => t - x < 6e4);
  if (a.length >= max) return res.status(429).json({ error: 'Too many requests. Wait a minute and try again.' });
  a.push(t); hits.set(k, a); next();
};

const app = express();
app.use(express.json({ limit: '20kb' }));

app.get('/api/health', (_q, r) => r.json({ ok: true, demo: true, time: now() }));
app.post('/api/session', limit(30), (req, res) => {
  const role = req.body?.role;
  const u = db.prepare('SELECT id,name,role FROM users WHERE id=?').get({ household: 1, partner: 2, admin: 3 }[role] || 0);
  if (!u) return res.status(400).json({ error: 'Role must be household, partner or admin.' });
  res.json({ token: sign({ uid: u.id }), user: u, notice: 'Demo-only role selection. No password, no real authentication.' });
});
app.get('/api/me', auth(), (req, res) => {
  const u = req.user, monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const tot = db.prepare('SELECT COALESCE(SUM(kg),0) kg, COUNT(*) n FROM deposits WHERE user_id=?').get(u.id);
  const mon = db.prepare('SELECT COALESCE(SUM(kg),0) kg FROM deposits WHERE user_id=? AND created_at>=?').get(u.id, monthStart.toISOString());
  const redeemed = db.prepare('SELECT COUNT(*) c FROM coupons WHERE user_id=?').get(u.id).c;
  res.json({ user: { id: u.id, name: u.name, role: u.role, district: u.district, points: u.points }, totalKg: tot.kg, deposits: tot.n, monthKg: mon.kg, coupons: redeemed,
    co2eEstimateKg: Math.round(tot.kg * 0.5 * 10) / 10,
    recent: db.prepare('SELECT delta,reason,created_at FROM point_tx WHERE user_id=? ORDER BY id DESC LIMIT 8').all(u.id) });
});
app.get('/api/bins', (_q, r) => r.json(db.prepare('SELECT id,name,district,active,fill,updated_at FROM bins ORDER BY id').all()));
app.get('/api/deposits', auth('household'), (req, res) => res.json(db.prepare('SELECT d.id,d.kg,d.points,d.created_at,b.name bin FROM deposits d JOIN bins b ON b.id=d.bin_id WHERE user_id=? ORDER BY d.id DESC LIMIT 50').all(req.user.id)));
app.post('/api/deposits', auth('household'), limit(30), (req, res) => {
  const kg = Number(req.body?.kg), binId = Number(req.body?.binId);
  if (!Number.isFinite(kg) || kg < 0.1 || kg > 25) return res.status(400).json({ error: 'Weight must be a number between 0.1 and 25 kg.' });
  const bin = db.prepare('SELECT * FROM bins WHERE id=?').get(binId);
  if (!bin) return res.status(400).json({ error: 'Choose a collection bin.' });
  if (!bin.active) return res.status(409).json({ error: 'This demo bin is currently disabled.' });
  const w = Math.round(kg * 10) / 10, pts = Math.round(w * Number(setting('points_per_kg')));
  db.transaction(() => {
    db.prepare('INSERT INTO deposits(user_id,bin_id,kg,points,created_at) VALUES(?,?,?,?,?)').run(req.user.id, bin.id, w, pts, now());
    db.prepare('UPDATE users SET points=points+? WHERE id=?').run(pts, req.user.id);
    db.prepare('INSERT INTO point_tx(user_id,delta,reason,created_at) VALUES(?,?,?,?)').run(req.user.id, pts, 'Deposit (simulated bin)', now());
    db.prepare('UPDATE bins SET fill=MIN(100,fill+?),updated_at=? WHERE id=?').run(Math.ceil(w), now(), bin.id);
  })();
  res.status(201).json({ kg: w, points: pts, balance: db.prepare('SELECT points FROM users WHERE id=?').get(req.user.id).points, simulated: true });
});
app.get('/api/offers', auth(), (_q, r) => r.json(db.prepare("SELECT o.*,p.name partner FROM offers o JOIN partners p ON p.id=o.partner_id WHERE o.active=1 AND o.valid_until>=? ORDER BY o.cost").all(now())));
app.post('/api/offers/:id/redeem', auth('household'), limit(20), (req, res) => {
  const result = db.transaction(() => {
    const o = db.prepare('SELECT * FROM offers WHERE id=? AND active=1 AND valid_until>=?').get(Number(req.params.id), now());
    if (!o) return { code: 404, error: 'This offer is not available.' };
    const upd = db.prepare('UPDATE users SET points=points-? WHERE id=? AND points>=?').run(o.cost, req.user.id, o.cost);
    if (!upd.changes) return { code: 409, error: `Not enough points. This offer needs ${o.cost}.` };
    const code = 'EL-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    db.prepare('INSERT INTO coupons(code,user_id,offer_id,created_at) VALUES(?,?,?,?)').run(code, req.user.id, o.id, now());
    db.prepare('INSERT INTO point_tx(user_id,delta,reason,created_at) VALUES(?,?,?,?)').run(req.user.id, -o.cost, 'Coupon redeemed: ' + o.title, now());
    return { code: 201, body: { code, offer: o.title, balance: db.prepare('SELECT points FROM users WHERE id=?').get(req.user.id).points } };
  })();
  res.status(result.code).json(result.body || { error: result.error });
});
app.get('/api/coupons', auth('household'), (req, res) => res.json(db.prepare('SELECT c.code,c.status,c.created_at,o.title,o.discount,p.name partner FROM coupons c JOIN offers o ON o.id=c.offer_id JOIN partners p ON p.id=o.partner_id WHERE c.user_id=? ORDER BY c.id DESC').all(req.user.id)));

// ---- partner ----
const offerInput = (b) => {
  const t = String(b?.title || '').trim(), d = String(b?.discount || '').trim(), cost = Number(b?.cost), cat = String(b?.category || '');
  if (t.length < 3 || t.length > 80) return { error: 'Title must be 3 to 80 characters.' };
  if (!d || d.length > 40) return { error: 'Enter the discount, for example "10% off".' };
  if (!Number.isInteger(cost) || cost < 10 || cost > 5000) return { error: 'Points must be a whole number from 10 to 5000.' };
  if (!['Groceries', 'Cafes', 'Bakery', 'Drinks', 'Household'].includes(cat)) return { error: 'Choose a valid category.' };
  const v = new Date(b?.valid_until); if (isNaN(v)) return { error: 'Enter a valid end date.' };
  return { v: [t, cat, String(b?.description || '').slice(0, 200), d, cost, v.toISOString()] };
};
app.get('/api/partner/stats', auth('partner'), (req, res) => {
  const pid = req.user.partner_id;
  const p = db.prepare('SELECT * FROM partners WHERE id=?').get(pid);
  const offers = db.prepare('SELECT o.*,(SELECT COUNT(*) FROM coupons WHERE offer_id=o.id) issued,(SELECT COUNT(*) FROM coupons WHERE offer_id=o.id AND status=\'used\') used FROM offers o WHERE partner_id=? ORDER BY id DESC').all(pid);
  const recent = db.prepare('SELECT c.code,c.status,c.created_at,o.title FROM coupons c JOIN offers o ON o.id=c.offer_id WHERE o.partner_id=? ORDER BY c.id DESC LIMIT 10').all(pid);
  const used = offers.reduce((a, o) => a + o.used, 0), issued = offers.reduce((a, o) => a + o.issued, 0);
  res.json({ partner: p, offers, recent, issued, used, estimatedVisits: Math.round(used * 1.0), note: 'Counts come from coupon records. "Visits" equals used coupons; incremental customer acquisition is not measured in this demo.' });
});
app.post('/api/partner/offers', auth('partner'), limit(30), (req, res) => {
  const r = offerInput(req.body); if (r.error) return res.status(400).json({ error: r.error });
  const p = db.prepare('SELECT * FROM partners WHERE id=?').get(req.user.partner_id);
  const i = db.prepare('INSERT INTO offers(partner_id,title,category,description,discount,cost,valid_until) VALUES(?,?,?,?,?,?,?)').run(p.id, ...r.v);
  res.status(201).json({ id: i.lastInsertRowid });
});
app.put('/api/partner/offers/:id', auth('partner'), limit(30), (req, res) => {
  const o = db.prepare('SELECT * FROM offers WHERE id=? AND partner_id=?').get(Number(req.params.id), req.user.partner_id);
  if (!o) return res.status(404).json({ error: 'Offer not found.' });
  if (Object.keys(req.body || {}).length === 1 && 'active' in req.body) { db.prepare('UPDATE offers SET active=? WHERE id=?').run(req.body.active ? 1 : 0, o.id); return res.json({ ok: true }); }
  const r = offerInput(req.body); if (r.error) return res.status(400).json({ error: r.error });
  db.prepare('UPDATE offers SET title=?,category=?,description=?,discount=?,cost=?,valid_until=? WHERE id=?').run(...r.v, o.id);
  res.json({ ok: true });
});
app.post('/api/partner/coupons/use', auth('partner'), limit(30), (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  const c = db.prepare('SELECT c.id,c.status FROM coupons c JOIN offers o ON o.id=c.offer_id WHERE c.code=? AND o.partner_id=?').get(code, req.user.partner_id);
  if (!c) return res.status(404).json({ error: 'No coupon with this code for your business.' });
  const u = db.prepare("UPDATE coupons SET status='used',used_at=? WHERE id=? AND status='active'").run(now(), c.id);
  if (!u.changes) return res.status(409).json({ error: 'This coupon was already used.' });
  res.json({ ok: true });
});

// ---- admin ----
const recovery = (tonnes, y, m) => { const biogas = tonnes * y, methane = biogas * m; return { tonnes, biogasM3: Math.round(biogas), methaneM3: Math.round(methane), energyKwh: Math.round(methane * 9.97), digestateT: Math.round(tonnes * Number(setting('digestate_fraction')) * 100) / 100 }; };
app.get('/api/admin/stats', auth('admin'), (_q, res) => {
  const ms = new Date(); ms.setDate(1); ms.setHours(0, 0, 0, 0);
  const kg = db.prepare('SELECT COALESCE(SUM(kg),0) v FROM deposits').get().v, mkg = db.prepare('SELECT COALESCE(SUM(kg),0) v FROM deposits WHERE created_at>=?').get(ms.toISOString()).v;
  const weekly = db.prepare("SELECT strftime('%Y-%W',created_at) wk, ROUND(SUM(kg),1) kg FROM deposits GROUP BY wk ORDER BY wk DESC LIMIT 6").all().reverse();
  const y = Number(setting('biogas_m3_per_t')), m = Number(setting('methane_fraction'));
  res.json({
    households: db.prepare("SELECT COUNT(*) c FROM users WHERE role='household'").get().c, partners: db.prepare('SELECT COUNT(*) c FROM partners').get().c,
    totalKg: Math.round(kg), monthKg: Math.round(mkg), activeBins: db.prepare('SELECT COUNT(*) c FROM bins WHERE active=1').get().c,
    couponsIssued: db.prepare('SELECT COUNT(*) c FROM coupons').get().c, couponsUsed: db.prepare("SELECT COUNT(*) c FROM coupons WHERE status='used'").get().c,
    contaminationAssumption: Number(setting('assumed_contamination')), weekly,
    bins: db.prepare('SELECT * FROM bins ORDER BY id').all(),
    recent: db.prepare('SELECT d.id,d.kg,d.points,d.seeded,d.created_at,u.name,b.name bin FROM deposits d JOIN users u ON u.id=d.user_id JOIN bins b ON b.id=d.bin_id ORDER BY d.id DESC LIMIT 10').all(),
    recovery: recovery(kg / 1000, y, m), assumptions: { biogasM3PerTonne: y, methaneFraction: m }
  });
});
app.get('/api/admin/recovery', auth('admin'), (req, res) => {
  const t = Number(req.query.tonnes), y = Number(req.query.yield), m = Number(req.query.methane);
  if (![t, y, m].every(Number.isFinite) || t < 0 || t > 100000 || y < 0 || y > 500 || m < 0.3 || m > 0.8) return res.status(400).json({ error: 'Use tonnes 0 to 100000, yield 0 to 500 m3/t and methane fraction 0.3 to 0.8.' });
  res.json(recovery(t, y, m));
});
app.post('/api/admin/bins/:id/toggle', auth('admin'), limit(30), (req, res) => {
  const r = db.prepare('UPDATE bins SET active=1-active,updated_at=? WHERE id=?').run(now(), Number(req.params.id));
  if (!r.changes) return res.status(404).json({ error: 'Bin not found.' });
  res.json({ ok: true });
});

app.use('/api', (_q, res) => res.status(404).json({ error: 'Unknown endpoint.' }));
const dist = path.join(__dirname, '..', 'dist');
app.use(express.static(dist));
app.get('*', (_q, res) => res.sendFile(path.join(dist, 'index.html')));
app.use((err, _q, res, _n) => { console.error(err); res.status(500).json({ error: 'Something went wrong on the server.' }); });
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`EcoLoop demo on :${PORT}, db ${DB_PATH}`));
