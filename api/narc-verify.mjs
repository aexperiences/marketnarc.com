// The Narc — verify a completed Checkout Session and mint a signed unlock token.
// Repo path: /api/narc-verify.mjs -> /api/narc-verify
// Requires env STRIPE_SECRET_KEY and APP_SUB_SECRET. Returns { ok, token, until, scope }.
// Same HMAC scheme as the ESPO suite: base64url(payload) + "." + base64url(sig).
// The client trusts the token's presence for UI unlock; any paid server route must
// re-verify the signature so a free user can't forge it.

import crypto from 'node:crypto';

function sign(payload, secret) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return data + '.' + sig;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const key = process.env.STRIPE_SECRET_KEY;
  const secret = process.env.APP_SUB_SECRET;
  if (!key || !secret) { res.status(500).json({ error: 'Server missing STRIPE_SECRET_KEY or APP_SUB_SECRET' }); return; }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const sid = (body.session_id || '').toString();
    if (!sid.startsWith('cs_')) { res.status(400).json({ error: 'Bad session_id' }); return; }

    const r = await fetch('https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(sid) + '?expand[]=subscription', {
      headers: { 'Authorization': 'Bearer ' + key }
    });
    const s = await r.json();
    if (!r.ok) { res.status(502).json({ error: 'Stripe error', detail: s }); return; }

    const sub = (s.subscription && typeof s.subscription === 'object') ? s.subscription : null;
    const paid = s.payment_status === 'paid' || (sub && (sub.status === 'active' || sub.status === 'trialing'));
    if (!paid) { res.status(402).json({ ok: false, error: 'Not paid' }); return; }

    // Token valid until period end (+2-day grace), or 40 days if we couldn't read it.
    const until = sub && sub.current_period_end
      ? (sub.current_period_end * 1000) + (1000 * 60 * 60 * 24 * 2)
      : Date.now() + (1000 * 60 * 60 * 24 * 40);
    const subId = sub ? sub.id : (typeof s.subscription === 'string' ? s.subscription : sid);
    // One product: scope is always 'narc' (unlocks all six modes).
    const token = sign({ sub: subId, until, scope: 'narc', v: 1 }, secret);
    res.status(200).json({ ok: true, token, until, scope: 'narc' });
  } catch (e) {
    res.status(500).json({ error: 'Server error', detail: String(e) });
  }
}
