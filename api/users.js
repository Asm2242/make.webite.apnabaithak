import { getSql, initDb } from './_db.js';

export default async function handler(req, res) {
  const sql = getSql();
  await initDb(sql);

  if (req.method === 'POST') {
    const body = req.body || {};
    if (body.action === 'register') {
      const { name, email, password, phone } = body;
      const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (existing.length) return res.status(400).json({ ok: false, msg: 'Email already registered' });
      const id = Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      const referralCode = 'REF-' + Math.random().toString(36).slice(2, 8).toUpperCase();
      await sql`INSERT INTO users (id,name,email,password,phone,referral_code,credits,orders) VALUES (${id},${name},${email},${password},${phone},${referralCode},0,0)`;
      const user = { id, name, email, phone, referralCode, credits: 0, orders: 0 };
      return res.status(200).json({ ok: true, user });
    }
    if (body.action === 'login') {
      const { email, password } = body;
      const rows = await sql`SELECT id,name,email,phone,referral_code,credits,orders FROM users WHERE email = ${email} AND password = ${password}`;
      if (!rows.length) return res.status(401).json({ ok: false, msg: 'Invalid credentials' });
      const r = rows[0];
      const user = { id: r.id, name: r.name, email: r.email, phone: r.phone, referralCode: r.referral_code, credits: r.credits, orders: r.orders };
      return res.status(200).json({ ok: true, user });
    }
    return res.status(400).json({ ok: false, msg: 'Unknown action' });
  }

  if (req.method === 'GET') {
    const { code, id } = req.query || {};
    if (code) {
      const rows = await sql`SELECT id,name,email,phone,referral_code,credits,orders FROM users WHERE referral_code = ${code}`;
      if (!rows.length) return res.status(404).json({ ok: false });
      const r = rows[0];
      return res.status(200).json({ ok: true, user: { id: r.id, name: r.name, email: r.email, phone: r.phone, referralCode: r.referral_code, credits: r.credits, orders: r.orders } });
    }
    if (id) {
      const rows = await sql`SELECT id,name,email,phone,referral_code,credits,orders FROM users WHERE id = ${id}`;
      if (!rows.length) return res.status(404).json({ ok: false });
      const r = rows[0];
      return res.status(200).json({ ok: true, user: { id: r.id, name: r.name, email: r.email, phone: r.phone, referralCode: r.referral_code, credits: r.credits, orders: r.orders } });
    }
    const rows = await sql`SELECT id,name,email,phone,referral_code,credits,orders,created_at FROM users ORDER BY created_at DESC`;
    return res.status(200).json(rows.map(r => ({ id: r.id, name: r.name, email: r.email, phone: r.phone, referralCode: r.referral_code, credits: r.credits, orders: r.orders, date: r.created_at })));
  }

  res.status(405).json({ ok: false, msg: 'Method not allowed' });
}
