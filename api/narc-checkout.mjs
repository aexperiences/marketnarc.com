// The Narc — create a Stripe Checkout Session (subscription). Repo path: /api/narc-checkout.mjs -> /api/narc-checkout
// ONE product, all six modes. Prices resolved by lookup_key so the SAME code works in test and live.
//   ANNUAL  standard  -> narc_annual            ($69.99/yr)   [the flagship — always lead with annual]
//   ANNUAL  seasonal  -> narc_annual_seasonal   ($59.99/yr)   [Tax Jan–Apr · Benefits Oct–Dec]
//   MONTHLY standard  -> narc_monthly           ($9.99/mo)
//   MONTHLY seasonal  -> narc_monthly + intro coupon (NARC_INTRO_COUPON): $7.99/mo for 3 months, then $9.99
// The server — not the client — decides whether it's a seasonal window, so pricing can't be spoofed.
//
// STAGED / INERT until Anthony flips it live:
//   * Returns {staged:true} unless env NARC_PAYMENTS_LIVE is 1/true/on.
//   * Even then it needs STRIPE_SECRET_KEY (which only Anthony sets). No live key lives in this file.
//   * Nothing here can charge a card until BOTH are set. This is the go-live switch — his click.

const SITE = 'https://marketnarc.com';
const RETURN = '/thenarc-pricing';   // success returns here; page verifies + stores the unlock token

function seasonForMonth(m) {           // 1..12
  if (m >= 1 && m <= 4) return 'tax';        // tax season
  if (m >= 10 && m <= 12) return 'benefits'; // open enrollment
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  // --- go-live gate: staged until Anthony sets NARC_PAYMENTS_LIVE ---
  const live = /^(1|true|on|yes)$/i.test(process.env.NARC_PAYMENTS_LIVE || '');
  if (!live) {
    res.status(200).json({ staged: true, message: 'The Narc checkout is staged. Payments are not live yet.' });
    return;
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) { res.status(500).json({ error: 'Server is missing STRIPE_SECRET_KEY' }); return; }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const plan = (body.plan === 'monthly') ? 'monthly' : 'annual';
    const season = seasonForMonth(new Date().getUTCMonth() + 1);

    let lookup, coupon = null;
    if (plan === 'annual') {
      lookup = season ? 'narc_annual_seasonal' : 'narc_annual';
    } else {
      lookup = 'narc_monthly';
      if (season) coupon = process.env.NARC_INTRO_COUPON || null; // $2/mo off for 3 months -> $7.99, then $9.99
    }

    // Resolve the active price by lookup_key.
    const priceRes = await fetch('https://api.stripe.com/v1/prices?lookup_keys[]=' + encodeURIComponent(lookup) + '&active=true&limit=1', {
      headers: { 'Authorization': 'Bearer ' + key }
    });
    const priceData = await priceRes.json();
    if (!priceRes.ok || !priceData.data || !priceData.data.length) {
      res.status(500).json({ error: 'Price not found for lookup_key "' + lookup + '". Create it in Stripe first.', detail: priceData });
      return;
    }
    const priceId = priceData.data[0].id;

    const form = new URLSearchParams();
    form.set('mode', 'subscription');
    form.set('line_items[0][price]', priceId);
    form.set('line_items[0][quantity]', '1');
    form.set('success_url', SITE + RETURN + '?paid={CHECKOUT_SESSION_ID}');
    form.set('cancel_url', SITE + RETURN + '?canceled=1');
    form.set('billing_address_collection', 'auto');
    form.set('metadata[scope]', 'narc');
    form.set('metadata[plan]', plan);
    form.set('metadata[season]', season || 'standard');
    form.set('subscription_data[metadata][scope]', 'narc');
    form.set('subscription_data[trial_period_days]', '3'); // 3-day free trial, then auto-renews
    // Stripe: allow_promotion_codes and discounts are mutually exclusive.
    if (coupon) form.set('discounts[0][coupon]', coupon);
    else form.set('allow_promotion_codes', 'true');

    const sessRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    const sess = await sessRes.json();
    if (!sessRes.ok) { res.status(502).json({ error: 'Stripe error', detail: sess }); return; }
    res.status(200).json({ url: sess.url });
  } catch (e) {
    res.status(500).json({ error: 'Server error', detail: String(e) });
  }
}
