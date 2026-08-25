const { db, init } = require('./_db');
const { sendPush } = require('./push');

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;

module.exports = async (req, res) => {
  try {
    await init();
    if (req.method === 'GET') {
      const id = String(req.query.id || '');
      if (!id) return res.status(400).json({ error: 'invalid payment id' });
      const q = await db.execute({ sql: 'SELECT id,amount,status,reason,created_at,expires_at,password_hash FROM payments WHERE id=?', args: [id] });
      const p = q.rows[0];
      if (!p) return res.status(404).json({ error: 'payment not found' });
      return res.json({ payment: { ...p, password_set: !!p.password_hash } });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
    const body = req.body || {};

    if (body.action === 'create') {
      const id = makeId();
      await db.execute({ sql: `INSERT INTO payments(id,amount,status,created_at) VALUES(?, '50', 'pending', ?)`, args: [id, Date.now()] });
      // Creating/opening the payment page intentionally sends NO notification.
      return res.status(201).json({ ok: true, id });
    }

    if (body.action === 'submit') {
      const id = String(body.id || '');
      const screenshot = String(body.screenshot || '');
      if (!id || !screenshot.startsWith('data:image/')) return res.status(400).json({ error: 'Payment ID and screenshot are required' });
      if (screenshot.length > 5_500_000) return res.status(413).json({ error: 'Screenshot is too large' });
      const existing = await db.execute({ sql: 'SELECT status FROM payments WHERE id=?', args: [id] });
      if (!existing.rows[0]) return res.status(404).json({ error: 'Payment not found' });
      await db.execute({ sql: `UPDATE payments SET screenshot=?,status='pending',reason=NULL WHERE id=?`, args: [screenshot, id] });
      // This is the ONLY payment event that triggers the admin phone notification.
      try { await sendPush('JISANs BOT — New Payment', 'একটি নতুন Binance payment screenshot submit হয়েছে। Admin Panel খুলে review করুন।'); } catch (e) { console.error('PAYMENT_PUSH_ERROR', e.message || e); }
      return res.json({ ok: true, submitted: true });
    }

    return res.status(400).json({ error: 'invalid action' });
  } catch (e) {
    console.error('PAYMENT_API_ERROR', e);
    return res.status(500).json({ error: e.message || 'payment error' });
  }
};
