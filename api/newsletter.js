import { getSql, initDb } from './_db.js';

export default async function handler(req, res) {
  const sql = getSql();
  await initDb(sql);

  if (req.method === 'POST') {
    const email = (req.body && req.body.email) || '';
    if (!email) return res.status(400).json({ ok: false, msg: 'email required' });
    await sql`INSERT INTO newsletter (email) VALUES (${email}) ON CONFLICT (email) DO NOTHING`;
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    const rows = await sql`SELECT email, created_at FROM newsletter ORDER BY created_at DESC`;
    return res.status(200).json(rows.map(r => ({ email: r.email, date: r.created_at })));
  }

  if (req.method === 'DELETE') {
    const email = (req.query && req.query.email) || (req.body && req.body.email);
    if (!email) return res.status(400).json({ ok: false, msg: 'email required' });
    await sql`DELETE FROM newsletter WHERE email = ${email}`;
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ ok: false, msg: 'Method not allowed' });
}
