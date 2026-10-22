import { getSql, initDb } from './_db.js';

export default async function handler(req, res) {
  const sql = getSql();
  await initDb(sql);

  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM orders ORDER BY created_at DESC`;
    const out = rows.map(r => ({
      id: r.id, type: r.type, plan: r.plan, addons: r.addons ? JSON.parse(r.addons) : [],
      total: r.total, name: r.name, phone: r.phone, business: r.business, coupon: r.coupon,
      discount: r.discount, status: r.status, userId: r.user_id, referrerId: r.referrer_id, date: r.created_at
    }));
    return res.status(200).json(out);
  }

  if (req.method === 'POST') {
    const b = req.body || {};
    const id = Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const addons = JSON.stringify(b.addons || []);
    await sql`INSERT INTO orders (id,type,plan,addons,total,name,phone,business,coupon,discount,status,user_id,referrer_id)
      VALUES (${id},${b.type||'Plan Order'},${b.plan||''},${addons},${b.total||''},${b.name||''},${b.phone||''},${b.business||''},${b.coupon||''},${b.discount||0},'New',${b.userId||null},${b.referrerId||null})`;
    // credits
    if (b.userId) {
      await sql`UPDATE users SET credits = credits + 500, orders = orders + 1 WHERE id = ${b.userId}`;
    }
    if (b.referrerId) {
      await sql`UPDATE users SET credits = credits + 500 WHERE id = ${b.referrerId}`;
    }
    // return updated user if userId
    let user = null;
    if (b.userId) {
      const rows = await sql`SELECT id,name,email,phone,referral_code,credits,orders FROM users WHERE id = ${b.userId}`;
      if (rows.length) {
        const r = rows[0];
        user = { id: r.id, name: r.name, email: r.email, phone: r.phone, referralCode: r.referral_code, credits: r.credits, orders: r.orders };
      }
    }
    return res.status(200).json({ ok: true, id, user });
  }

  if (req.method === 'PATCH') {
    const b = req.body || {};
    if (!b.id) return res.status(400).json({ ok: false, msg: 'id required' });
    await sql`UPDATE orders SET status = ${b.status} WHERE id = ${b.id}`;
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const id = (req.query && req.query.id) || (req.body && req.body.id);
    if (!id) return res.status(400).json({ ok: false, msg: 'id required' });
    await sql`DELETE FROM orders WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ ok: false, msg: 'Method not allowed' });
}
