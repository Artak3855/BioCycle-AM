import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route, NavLink, Link, Navigate, useNavigate } from 'react-router-dom';
import { Leaf, Recycle, Gift, MapPin, Store, ShieldCheck, LogOut, Scale, Ticket, X } from 'lucide-react';
import { T, fmt, date } from './text.js';

async function api(path, { method = 'GET', body } = {}) {
  const t = sessionStorage.getItem('token');
  const r = await fetch('/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { if (r.status === 401) sessionStorage.clear(); throw new Error(j.error || 'Request failed'); }
  return j;
}
function useLoad(path) {
  const [data, setData] = useState(null); const [err, setErr] = useState('');
  const load = useCallback(() => api(path).then((d) => { setData(d); setErr(''); }).catch((e) => setErr(e.message)), [path]);
  useEffect(() => { load(); }, [load]);
  return [data, err, load];
}
const State = ({ data, err }) => err ? <p className="msg err" role="alert">{err} <Link to="/demo">Choose a role</Link></p> : !data ? <p className="muted">Loading…</p> : null;
const Stat = ({ label, value, hint }) => <div className="card stat"><div className="muted">{label}</div><div className="big">{value}</div>{hint && <div className="muted sm">{hint}</div>}</div>;
const Demo = ({ children }) => <span className="tag">{children || 'Simulated'}</span>;

function Landing() {
  return (<div>
    <header className="top"><b className="logo"><Leaf size={20} /> {T.brand}</b><nav><a href="#how">How it works</a><a href="#recovery">Recovery</a><Link className="btn sm" to="/demo">Explore the platform</Link></nav></header>
    <section className="hero"><div><p className="pill">{T.demoBanner}</p><h1>{T.tagline}</h1><p className="lead">{T.sub} Households deposit food scraps, earn points and redeem them with local businesses while the collected feedstock is routed toward biogas and digestate recovery.</p>
      <div className="row"><Link className="btn" to="/demo">Start Recycling</Link><a className="btn ghost" href="#how">Explore the Platform</a></div></div>
      <div className="card flow"><b>One deposit, end to end <Demo /></b><ol><li>2.4 kg deposited at a bin</li><li>+24 points awarded (10 points/kg, configurable)</li><li>Points redeemed for a partner coupon</li><li>Feedstock counted toward recovery estimates</li></ol></div></section>
    <section id="how" className="wrap"><h2>How it works</h2><div className="grid3">
      {[[Recycle, 'Deposit organic waste', 'Identify yourself at a smart bin and deposit eligible food scraps. The bin records the weight.'], [Gift, 'Earn reward points', 'Verified weight becomes points. The rate is an example, not a final policy.'], [Store, 'Redeem discounts', 'Spend points on offers from participating businesses and support circular recovery.']].map(([I, t, d]) => <div className="card" key={t}><I className="ic" /><h3>{t}</h3><p>{d}</p></div>)}</div></section>
    <section className="wrap"><div className="grid2"><div className="card"><h3>For households</h3><p>A simple way to separate food waste and get something back. Track your deposits, balance and coupons in one place.</p></div><div className="card"><h3>For partner businesses</h3><p>Publish offers, see coupon redemptions and manage promotions. Redemptions show engagement; they do not by themselves prove new customers.</p></div></div></section>
    <section id="recovery" className="wrap"><h2>From collection to resources</h2><div className="card"><p className="flowline">Collection → Sorting and preprocessing → Anaerobic digestion → Biogas + digestate</p><p>Biogas can be used for heat or power. Digestate may become a soil amendment only after testing, treatment and compliance checks. Output depends on feedstock, moisture, contamination and plant design. This demo only <b>estimates</b> from adjustable assumptions <Demo />.</p></div></section>
    <section className="wrap"><div className="card cta"><h2>See the demo</h2><p>Enter as a household, a partner or an administrator. No sign-up needed.</p><Link className="btn" to="/demo">Start Recycling</Link></div></section>
    <footer className="foot">{T.brand} is a working name. Demo project for {T.city}. Contact details to be added. No real partners, bins or results are shown.</footer></div>);
}

function DemoEntry() {
  const nav = useNavigate(); const [err, setErr] = useState('');
  const go = async (role) => { try { const s = await api('/session', { method: 'POST', body: { role } }); sessionStorage.setItem('token', s.token); sessionStorage.setItem('role', role); nav(role === 'household' ? '/app' : '/app/' + role); } catch (e) { setErr(e.message); } };
  return (<div className="wrap narrow"><Link to="/" className="logo"><Leaf size={20} /> {T.brand}</Link><h1>Choose a demo role</h1><p className="muted">Demo-only access: roles are simulated and need no password. It is not production authentication.</p>
    {err && <p className="msg err" role="alert">{err}</p>}
    <div className="grid3">{[['household', Recycle, 'Household user', 'Deposit waste, earn points, redeem coupons.'], ['partner', Store, 'B2B partner', 'Manage offers and check coupon use.'], ['admin', ShieldCheck, 'Administrator', 'Monitor bins, deposits and recovery estimates.']].map(([r, I, t, d]) =>
      <button key={r} className="card pick" onClick={() => go(r)}><I className="ic" /><b>{t}</b><span className="muted">{d}</span></button>)}</div></div>);
}

function Shell({ role }) {
  const nav = useNavigate();
  const links = { household: [['/app', 'Dashboard', Leaf], ['/app/rewards', 'Rewards', Gift], ['/app/coupons', 'My coupons', Ticket], ['/app/bins', 'Collection points', MapPin]], partner: [['/app/partner', 'Partner dashboard', Store], ['/app/bins', 'Collection points', MapPin]], admin: [['/app/admin', 'Administration', ShieldCheck], ['/app/bins', 'Collection points', MapPin]] }[role];
  return (<div className="shell"><aside><Link to="/" className="logo"><Leaf size={20} /> {T.brand}</Link><nav>{links.map(([to, l, I]) => <NavLink key={to} end to={to}><I size={18} />{l}</NavLink>)}</nav>
    <button className="link" onClick={() => { sessionStorage.clear(); nav('/demo'); }}><LogOut size={16} /> Switch role</button></aside>
    <main><div className="banner">{T.demoBanner}</div>
      <Routes>
        {role === 'household' && <><Route index element={<Household />} /><Route path="rewards" element={<Rewards />} /><Route path="coupons" element={<Coupons />} /></>}
        {role === 'partner' && <Route path="partner" element={<Partner />} />}
        {role === 'admin' && <Route path="admin" element={<Admin />} />}
        <Route path="bins" element={<Bins />} /><Route path="*" element={<Navigate to={role === 'household' ? '/app' : '/app/' + role} replace />} />
      </Routes></main></div>);
}

function Household() {
  const [me, err, reload] = useLoad('/me'); const [deps, , reloadDeps] = useLoad('/deposits'); const [open, setOpen] = useState(false);
  if (!me) return <State data={me} err={err} />;
  return (<div><div className="head"><div><h1>Hello, {me.user.name}</h1><p className="muted">{me.user.district}, {T.city}</p></div><button className="btn" onClick={() => setOpen(true)}><Scale size={16} /> Deposit Organic Waste</button></div>
    <div className="grid4"><Stat label="Points balance" value={fmt(me.user.points)} /><Stat label="Total deposited" value={fmt(me.totalKg, 1) + ' kg'} /><Stat label="This month" value={fmt(me.monthKg, 1) + ' kg'} /><Stat label="Coupons redeemed" value={me.coupons} /></div>
    <div className="card"><b>Impact estimate</b> <Demo>Estimate</Demo><p>About {fmt(me.co2eEstimateKg, 1)} kg CO₂e of landfill methane avoided, using a rough 0.5 kg per kg of food waste. Treat it as an illustration, not a measured result.</p></div>
    <div className="grid2"><div className="card"><b>Deposit history</b><div className="scroll"><table><thead><tr><th>Date</th><th>Bin</th><th>kg</th><th>Points</th></tr></thead><tbody>{deps?.length ? deps.map((d) => <tr key={d.id}><td>{date(d.created_at)}</td><td>{d.bin}</td><td>{fmt(d.kg, 1)}</td><td>+{d.points}</td></tr>) : <tr><td colSpan="4" className="muted">No deposits yet. Use the deposit button to make your first.</td></tr>}</tbody></table></div></div>
      <div className="card"><b>Recent activity</b><ul className="list">{me.recent.map((r, i) => <li key={i}><span>{r.reason}</span><b className={r.delta > 0 ? 'pos' : 'neg'}>{r.delta > 0 ? '+' : ''}{r.delta}</b></li>)}</ul></div></div>
    {open && <DepositModal onClose={() => setOpen(false)} onDone={() => { reload(); reloadDeps(); }} />}</div>);
}

function DepositModal({ onClose, onDone }) {
  const [bins] = useLoad('/bins'); const [binId, setBin] = useState(''); const [id, setId] = useState(false); const [kg, setKg] = useState(''); const [err, setErr] = useState(''); const [ok, setOk] = useState(null); const [busy, setBusy] = useState(false);
  const submit = async (e) => { e.preventDefault(); setErr(''); const n = Number(kg);
    if (!binId) return setErr('Choose a collection bin.'); if (!id) return setErr('Scan the demo QR code first.');
    if (!kg || !Number.isFinite(n) || n < 0.1 || n > 25) return setErr('Enter a weight between 0.1 and 25 kg.');
    setBusy(true); try { setOk(await api('/deposits', { method: 'POST', body: { binId: Number(binId), kg: n } })); onDone(); } catch (x) { setErr(x.message); } setBusy(false); };
  return (<div className="modal" role="dialog" aria-modal="true" aria-label="Deposit organic waste"><div className="card sheet"><button className="x" onClick={onClose} aria-label="Close"><X size={18} /></button>
    {ok ? <div><h2>Deposit accepted</h2><p>{fmt(ok.kg, 1)} kg recorded. You earned <b>{ok.points} points</b>. New balance: <b>{fmt(ok.balance)}</b>.</p><p className="muted sm">The bin and the weight were simulated.</p><button className="btn" onClick={onClose}>Done</button></div> :
      <form onSubmit={submit}><h2>Deposit organic waste</h2><p className="muted sm">Simulation: no real bin or scale is connected. Reward rate is a configurable example (10 points per kg).</p>
        <label>Collection bin<select value={binId} onChange={(e) => setBin(e.target.value)}><option value="">Select a bin</option>{bins?.filter((b) => b.active).map((b) => <option key={b.id} value={b.id}>{b.name} ({b.district})</option>)}</select></label>
        <div className="qr"><div className={'qrbox' + (id ? ' on' : '')} aria-hidden="true" />{id ? <b>Identified as demo household</b> : <button type="button" className="btn ghost" onClick={() => setId(true)}>Scan demo QR code</button>}</div>
        <label>Weight (kg)<input inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} placeholder="e.g. 2.5" /></label>
        <div className="row">{[1, 2.5, 5].map((v) => <button type="button" key={v} className="chip" onClick={() => setKg(String(v))}>{v} kg</button>)}</div>
        {err && <p className="msg err" role="alert">{err}</p>}<button className="btn" disabled={busy}>{busy ? 'Submitting…' : 'Submit deposit'}</button></form>}</div></div>);
}

const cats = ['All', 'Groceries', 'Cafes', 'Bakery', 'Drinks', 'Household'];
function Rewards() {
  const [offers, err] = useLoad('/offers'); const [me, , reload] = useLoad('/me'); const [cat, setCat] = useState('All'); const [res, setRes] = useState(null);
  const redeem = async (o) => { try { const r = await api('/offers/' + o.id + '/redeem', { method: 'POST' }); setRes({ ok: true, text: `Coupon ${r.code} issued for "${r.offer}". Balance: ${r.balance} points.` }); reload(); } catch (e) { setRes({ ok: false, text: e.message }); } };
  if (!offers) return <State data={offers} err={err} />;
  return (<div><div className="head"><h1>Rewards</h1><b>{fmt(me?.user.points ?? 0)} points</b></div><p className="muted">Offers come from fictional demo partners <Demo /></p>
    <div className="row" role="group" aria-label="Filter by category">{cats.map((c) => <button key={c} className={'chip' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>)}</div>
    {res && <p className={'msg ' + (res.ok ? 'ok' : 'err')} role="status">{res.text}</p>}
    <div className="grid3">{offers.filter((o) => cat === 'All' || o.category === cat).map((o) => <div className="card" key={o.id}><span className="muted sm">{o.partner} · {o.category}</span><h3>{o.title}</h3><p>{o.description}</p><p><b>{o.discount}</b> · valid until {date(o.valid_until)}</p>
      <button className="btn" onClick={() => redeem(o)} disabled={(me?.user.points ?? 0) < o.cost}>{o.cost} points{(me?.user.points ?? 0) < o.cost ? ' (not enough)' : ''}</button></div>)}</div></div>);
}
function Coupons() {
  const [c, err] = useLoad('/coupons'); if (!c) return <State data={c} err={err} />;
  return (<div><h1>My coupons</h1>{!c.length && <p className="muted">No coupons yet. Redeem an offer in Rewards.</p>}<div className="grid3">{c.map((x) => <div className="card" key={x.code}><span className="muted sm">{x.partner}</span><h3>{x.title}</h3><p>{x.discount}</p><code className="code">{x.code}</code><p className="sm"><span className={'tag ' + x.status}>{x.status === 'active' ? 'Active' : 'Used'}</span> issued {date(x.created_at)}</p></div>)}</div></div>);
}
function Bins() {
  const [b, err] = useLoad('/bins'); if (!b) return <State data={b} err={err} />;
  return (<div><h1>Collection points</h1><p className="muted">Illustrative locations around {T.city}, not installed infrastructure <Demo /></p><div className="grid3">{b.map((x) => <div className="card" key={x.id}><b>{x.name}</b><p className="muted">{x.district}</p><div className="meter" aria-label={'Fill level ' + x.fill + '%'}><i style={{ width: x.fill + '%' }} /></div><p className="sm">{x.fill}% full · <span className={'tag ' + (x.active ? 'used' : 'off')}>{x.active ? 'Operational' : 'Disabled'}</span></p><p className="sm muted">Accepts fruit and vegetable scraps, bread, coffee grounds. Updated {date(x.updated_at)}.</p></div>)}</div></div>);
}

function Partner() {
  const [s, err, reload] = useLoad('/partner/stats'); const empty = { title: '', category: 'Groceries', description: '', discount: '', cost: 100, valid_until: new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10) };
  const [f, setF] = useState(empty); const [edit, setEdit] = useState(null); const [msg, setMsg] = useState(null); const [code, setCode] = useState('');
  if (!s) return <State data={s} err={err} />;
  const say = (ok, text) => setMsg({ ok, text });
  const save = async (e) => { e.preventDefault(); try { await api(edit ? '/partner/offers/' + edit : '/partner/offers', { method: edit ? 'PUT' : 'POST', body: { ...f, cost: Number(f.cost) } }); say(true, edit ? 'Offer updated.' : 'Offer created.'); setF(empty); setEdit(null); reload(); } catch (x) { say(false, x.message); } };
  const toggle = async (o) => { try { await api('/partner/offers/' + o.id, { method: 'PUT', body: { active: !o.active } }); reload(); } catch (x) { say(false, x.message); } };
  const use = async (e) => { e.preventDefault(); try { await api('/partner/coupons/use', { method: 'POST', body: { code } }); say(true, 'Coupon accepted.'); setCode(''); reload(); } catch (x) { say(false, x.message); } };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (<div><h1>{s.partner.name}</h1><p className="muted">Fictional demo partner <Demo /></p>
    <div className="grid4"><Stat label="Coupons issued" value={s.issued} /><Stat label="Coupons used" value={s.used} /><Stat label="Active offers" value={s.offers.filter((o) => o.active).length} /><Stat label="Simulated visits" value={s.estimatedVisits} hint="Equals used coupons" /></div>
    <p className="muted sm">{s.note}</p>{msg && <p className={'msg ' + (msg.ok ? 'ok' : 'err')} role="status">{msg.text}</p>}
    <div className="grid2"><form className="card" onSubmit={use}><b>Accept a coupon</b><label>Coupon code<input value={code} onChange={(e) => setCode(e.target.value)} placeholder="EL-XXXXXXXX" /></label><button className="btn">Mark as used</button><p className="muted sm">A coupon can be used only once.</p></form>
      <form className="card" onSubmit={save}><b>{edit ? 'Edit offer' : 'Create offer'}</b><label>Title<input value={f.title} onChange={set('title')} /></label><label>Category<select value={f.category} onChange={set('category')}>{cats.slice(1).map((c) => <option key={c}>{c}</option>)}</select></label><label>Discount<input value={f.discount} onChange={set('discount')} placeholder="10% off" /></label><label>Points required<input type="number" value={f.cost} onChange={set('cost')} /></label><label>Valid until<input type="date" value={f.valid_until} onChange={set('valid_until')} /></label><label>Description<input value={f.description} onChange={set('description')} /></label>
        <div className="row"><button className="btn">{edit ? 'Save changes' : 'Create offer'}</button>{edit && <button type="button" className="btn ghost" onClick={() => { setEdit(null); setF(empty); }}>Cancel</button>}</div></form></div>
    <div className="card"><b>Offers</b><div className="scroll"><table><thead><tr><th>Offer</th><th>Points</th><th>Issued</th><th>Used</th><th>Status</th><th /></tr></thead><tbody>{s.offers.map((o) => <tr key={o.id}><td>{o.title}</td><td>{o.cost}</td><td>{o.issued}</td><td>{o.used}</td><td>{o.active ? 'Enabled' : 'Disabled'}</td><td className="row"><button className="chip" onClick={() => { setEdit(o.id); setF({ title: o.title, category: o.category, description: o.description || '', discount: o.discount, cost: o.cost, valid_until: o.valid_until.slice(0, 10) }); }}>Edit</button><button className="chip" onClick={() => toggle(o)}>{o.active ? 'Disable' : 'Enable'}</button></td></tr>)}</tbody></table></div></div>
    <div className="card"><b>Recent coupon activity</b><ul className="list">{s.recent.map((r) => <li key={r.code}><span>{r.title} <code>{r.code}</code></span><span className={'tag ' + r.status}>{r.status}</span></li>)}</ul></div></div>);
}

function Admin() {
  const [s, err, reload] = useLoad('/admin/stats'); const [t, setT] = useState(''); const [y, setY] = useState(''); const [m, setM] = useState(''); const [r, setR] = useState(null); const [e2, setE2] = useState('');
  useEffect(() => { if (s && t === '') { setT(String(s.recovery.tonnes.toFixed(2))); setY(String(s.assumptions.biogasM3PerTonne)); setM(String(s.assumptions.methaneFraction)); } }, [s]);
  useEffect(() => { if (t === '') return; api(`/admin/recovery?tonnes=${t}&yield=${y}&methane=${m}`).then((d) => { setR(d); setE2(''); }).catch((x) => setE2(x.message)); }, [t, y, m]);
  if (!s) return <State data={s} err={err} />;
  const max = Math.max(1, ...s.weekly.map((w) => w.kg));
  const toggle = async (id) => { await api('/admin/bins/' + id + '/toggle', { method: 'POST' }); reload(); };
  return (<div><h1>Administration</h1>
    <div className="grid4"><Stat label="Households" value={s.households} /><Stat label="Organic waste collected" value={fmt(s.totalKg) + ' kg'} hint="Sum of deposit records" /><Stat label="This month" value={fmt(s.monthKg) + ' kg'} /><Stat label="Active bins" value={s.activeBins} /><Stat label="Partners" value={s.partners} /><Stat label="Coupons issued" value={s.couponsIssued} /><Stat label="Coupons used" value={s.couponsUsed} /><Stat label="Contamination" value={Math.round(s.contaminationAssumption * 100) + '%'} hint="Assumption, not measured" /></div>
    <div className="grid2"><div className="card"><b>Weekly deposits (kg)</b><div className="bars">{s.weekly.map((w) => <div key={w.wk}><i style={{ height: (w.kg / max) * 100 + '%' }} /><span className="sm">{fmt(w.kg)}</span><span className="sm muted">{w.wk.slice(5)}</span></div>)}</div></div>
      <div className="card"><b>Collection points</b><ul className="list">{s.bins.map((b) => <li key={b.id}><span>{b.name} · {b.fill}%</span><button className="chip" onClick={() => toggle(b.id)}>{b.active ? 'Disable' : 'Enable'}</button></li>)}</ul></div></div>
    <div className="card"><b>Recent deposits</b><div className="scroll"><table><thead><tr><th>Date</th><th>User</th><th>Bin</th><th>kg</th><th>Source</th></tr></thead><tbody>{s.recent.map((d) => <tr key={d.id}><td>{date(d.created_at)}</td><td>{d.name}</td><td>{d.bin}</td><td>{fmt(d.kg, 1)}</td><td>{d.seeded ? 'Seeded demo' : 'Created in session'}</td></tr>)}</tbody></table></div></div>
    <div className="card"><b>Resource recovery estimate</b> <Demo>Estimate</Demo><p className="muted sm">Calculated from assumptions below, not measured output. Real yield depends on feedstock composition, moisture, contamination, digester design and process conditions. Raw biogas is not interchangeable with natural gas, and no price comparison is made here. Digestate can be used as a soil amendment only after testing, treatment and compliance checks.</p>
      <div className="grid3"><label>Feedstock (tonnes)<input type="number" step="0.01" value={t} onChange={(e) => setT(e.target.value)} /></label><label>Biogas yield (m³ per tonne)<input type="number" value={y} onChange={(e) => setY(e.target.value)} /></label><label>Methane fraction (0.3 to 0.8)<input type="number" step="0.01" value={m} onChange={(e) => setM(e.target.value)} /></label></div>
      {e2 && <p className="msg err" role="alert">{e2}</p>}
      {r && <div className="grid4"><Stat label="Biogas" value={fmt(r.biogasM3) + ' m³'} /><Stat label="Methane" value={fmt(r.methaneM3) + ' m³'} /><Stat label="Energy equivalent" value={fmt(r.energyKwh) + ' kWh'} hint="Methane at 9.97 kWh/m³" /><Stat label="Digestate" value={fmt(r.digestateT, 2) + ' t'} hint="Assumed 90% of feedstock mass" /></div>}</div></div>);
}

export default function App() {
  const role = sessionStorage.getItem('role');
  return (<Routes><Route path="/" element={<Landing />} /><Route path="/demo" element={<DemoEntry />} />
    <Route path="/app/*" element={role && sessionStorage.getItem('token') ? <Shell role={role} /> : <Navigate to="/demo" replace />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>);
}
