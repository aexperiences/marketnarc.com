// The Narc — public runtime config. Repo path: /api/narc-config.mjs -> /api/narc-config
// One job: tell the app whether paid access is live. This is the SINGLE launch switch.
//   NARC_PAYMENTS_LIVE unset/0  -> { live:false }  -> app is fully free, no paywall.
//   NARC_PAYMENTS_LIVE=1        -> { live:true }   -> app gates the reveal behind the subscription.
// No secrets are exposed here. Fail-safe: if anything goes wrong, callers should treat it as NOT live
// (never lock people out because a config read hiccuped).

export default function handler(req, res) {
  const live = /^(1|true|on|yes)$/i.test(process.env.NARC_PAYMENTS_LIVE || '');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ live });
}
