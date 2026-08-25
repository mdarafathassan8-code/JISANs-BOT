const webpush = require('web-push');
const { db, init } = require('./_db');

const auth = (req) => req.headers.authorization === `Bearer ${process.env.ADMIN_KEY}`;

function configure() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) throw new Error('VAPID keys are not configured');
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
}

async function sendPush(title, body) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
  configure();
  await init();
  const q = await db.execute('SELECT endpoint,p256dh,auth FROM push_subscriptions');
  for (const row of q.rows) {
    try {
      await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify({ title, body, url: '/admin.html' }));
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        await db.execute({ sql: 'DELETE FROM push_subscriptions WHERE endpoint=?', args: [row.endpoint] });
      } else {
        console.error('PUSH_SEND_ERROR', e.message || e);
      }
    }
  }
}

module.exports = async (req, res) => {
  try {
    await init();
    if (req.method === 'GET' && String(req.query.action || '') === 'publicKey') {
      return res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
    }
    if (!auth(req)) return res.status(401).json({ error: 'Admin Key ভুল হয়েছে' });
    if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
    const { subscription } = req.body || {};
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ error: 'Invalid push subscription' });
    }
    await db.execute({
      sql: `INSERT INTO push_subscriptions(endpoint,p256dh,auth,created_at) VALUES(?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh,auth=excluded.auth,created_at=excluded.created_at`,
      args: [subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, Date.now()]
    });
    return res.json({ ok: true, subscribed: true });
  } catch (e) {
    console.error('PUSH_API_ERROR', e);
    return res.status(500).json({ error: e.message || 'push error' });
  }
};

module.exports.sendPush = sendPush;
