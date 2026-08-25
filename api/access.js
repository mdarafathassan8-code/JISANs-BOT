const crypto = require('crypto');
const { db, init } = require('./_db');

function passwordHash(password) {
  return crypto.createHmac('sha256', process.env.PASSWORD_SECRET || process.env.ADMIN_KEY || 'jisans-access-secret').update(password).digest('hex');
}

module.exports = async (req, res) => {
  try {
    await init();
    if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
    const body = req.body || {};
    const action = String(body.action || '');

    if (action === 'create') {
      const id = String(body.id || '');
      const password = String(body.password || '');
      const confirm = String(body.confirm || '');
      if (!id) return res.status(400).json({ error: 'Payment ID missing' });
      if (!/^\d{8}$/.test(password)) return res.status(400).json({ error: 'Password অবশ্যই ঠিক ৮ সংখ্যার হতে হবে।' });
      if (password !== confirm) return res.status(400).json({ error: 'Confirm password মিলেনি।' });
      const q = await db.execute({ sql: `SELECT id,status,expires_at,password_hash FROM payments WHERE id=?`, args: [id] });
      const p = q.rows[0];
      if (!p || p.status !== 'approved' || Number(p.expires_at) <= Date.now()) return res.status(403).json({ error: 'এই purchase-এর access active নেই।' });
      const hash = passwordHash(password);
      if (p.password_hash && p.password_hash !== hash) return res.status(409).json({ error: 'Password already created. নিচের Password Login ব্যবহার করুন।' });
      if (!p.password_hash) {
        const duplicate = await db.execute({ sql: `SELECT id FROM payments WHERE password_hash=? AND id<>? LIMIT 1`, args: [hash, id] });
        if (duplicate.rows[0]) return res.status(409).json({ error: 'এই password আগে ব্যবহার করা হয়েছে। অন্য ৮ সংখ্যার password দিন।' });
        await db.execute({ sql: 'UPDATE payments SET password_hash=? WHERE id=?', args: [hash, id] });
      }
      return res.json({ ok: true, expiresAt: new Date(Number(p.expires_at)).toISOString() });
    }

    if (action === 'login') {
      const password = String(body.password || '');
      if (!/^\d{8}$/.test(password)) return res.status(400).json({ error: 'Password অবশ্যই ৮ সংখ্যার হতে হবে।' });
      const hash = passwordHash(password);
      const q = await db.execute({ sql: `SELECT id,expires_at FROM payments WHERE password_hash=? AND status='approved' ORDER BY created_at DESC LIMIT 1`, args: [hash] });
      const p = q.rows[0];
      if (!p || Number(p.expires_at) <= Date.now()) return res.status(401).json({ error: 'Password সঠিক নয় অথবা access expired।' });
      return res.json({ ok: true, paymentId: p.id, expiresAt: new Date(Number(p.expires_at)).toISOString() });
    }

    return res.status(400).json({ error: 'invalid action' });
  } catch (e) {
    console.error('ACCESS_API_ERROR', e);
    return res.status(500).json({ error: e.message || 'access error' });
  }
};
