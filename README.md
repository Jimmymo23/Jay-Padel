# Padel Quality private beta

A working first vertical slice of the version 1.1 blueprint: fictional venue/court discovery, court profiles, structured reviews, issue reports, owner moderation, and server-calculated provisional scores.

## Current scope

- Four explicitly fictional venues and twelve courts; illustrative scores are never included in real calculations.
- Search by venue, area and facility; area/type filters; sorting; directly addressable venue and court views.
- Platform ChatGPT authentication and persistent D1 records. The Site must remain owner-private during this beta. First signed-in user becomes the owner moderator atomically. Multi-user club/admin role provisioning is not implemented.
- One recorded review per user/court/local play date, validated ratings, date checks, ten submissions per day, publication queue and audited decisions.
- Published, unverified review scoring: category-first weighted means, recency, per-reviewer cap, minimum two reviewers and 60% coverage. Confidence remains low; no sample score is used after real published evidence exists.
- Issue report moderation; issue resolution and confirmation workflow is not yet implemented.

## Planned follow-up modules

Verified visit proof, processed public photos and private R2 evidence, higher confidence/trend calculations, review revisions and appeals, full account deletion/retention, club claims and maintenance confirmations, bilingual Arabic/English and production directory ingestion. Venue experience scoring is shown as insufficient evidence rather than fabricated.

This is a private development beta, not the complete public MVP. Do not open access or collect real booking receipts before implementing the remaining privacy and role controls.

## Development

Use Node 22+ and the existing lockfile. Install with the Sites installer or `npm run install:ci`. Generate schema changes with `npm run db:generate`; migrations belong in `drizzle/`. Build with `npm run build`, apply pending local D1 migrations using the generated `dist/server/wrangler.json`, then use `npm run dev`.

Local mock login uses `/signin-with-chatgpt?return_to=/`; it is provided by the portable development profile and is excluded from production.

## Validation

Run TypeScript checking, scoring fixtures in `tests/scoring.test.ts`, and the production build. Exercise sign-in, review persistence, duplicate rejection, moderation, issue publication and reload persistence against local D1. Hosted D1 migrations are applied by Sites publishing.

## Cloudflare deployment status

This is a local beta. Production contribution endpoints remain disabled until a verified authentication provider and explicit owner assignment are implemented. Do not trust client-supplied identity headers on a standalone Worker. Cloudflare account login, the real D1 binding, and a domain are required before deployment. The Sites hosting manifest is retained only for local starter compatibility; this project targets the user-owned Cloudflare account.
