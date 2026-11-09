# Joy-Full Java + Juice — website

Premium redesign of thejoyfullcafe.com for **Joy-Full Java + Juice**, 3811 Leitchfield Rd (KY 54), Owensboro, KY.
Built with Vite + Three.js (custom GLSL) + GSAP + Lenis. Static site — no server needed.

## Run locally
```
npm install
npm run dev
```

## Deploy on Render (Static Site)
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- (or let Render read `render.yaml` as a Blueprint)

## Where things live
| What | File |
|---|---|
| Menu items, prices, sizes, add-ons, hours, phone, links | `src/data/menu.js` |
| Page text and sections | `index.html` |
| Brand colors and fonts | `src/styles.css` (top of file) |
| Living-photo WebGL engine (depth relighting, focus pulls, steam, liquid transitions, opening) | `src/gl/photoworld.js` |
| Chapter photos + depth maps | `public/photos/*.webp`, `*.depth.jpg` |
| Menu card photos | `public/photos/menu/` |

## Content sources
- Menu, prices, sizes, customizations, hours: the cafe's published online menu (captured Nov 2, 2026).
- Story, meal prep, catering, classes, tagline: the cafe's current GoDaddy site.
- Real cafe photos (tagged "From the cafe"): acai bowls, mocha, avocado toast, Vanilla Chai Chiller, owner, store — from the cafe's own website and online menu listing.
- Sample photos (tagged "Sample photo"): every other menu item, from Unsplash under the Unsplash License (free for commercial use, no attribution required). Photo IDs are in `src/data/menu.js` naming / listed below. Replace any file in `public/photos/menu/` with the owner's own photo using the same file name, then set `stock` to false.
- Depth maps: generated with Depth Anything V2 Small (Apache-2.0).
- Photos for the juice and salad chapters (`main-squeeze`, `fruit-root`, `old-faithful`, `joyous-jade`, `summer-berry`) are also Unsplash sample photos.

## Owner to confirm before launch
- Hours: the online menu lists Sun 12–3, Mon–Tue 6–3, Wed–Thu 6–6, Fri 6–4, Sat 8–3; the old site said 6am–6pm.
- Chapter headlines on the scroll tour were written for the redesign — approve or replace.
- Menu spellings kept as published: "Summer Berry Splender", Fruit Root lists carrot twice.

## Online ordering — order online, pay at pickup

- Customers: menu → **Add** → customize → bag → pickup (ASAP or a time today) → name + phone → review (subtotal, KY tax, total, **PAY AT PICKUP**) → **PLACE ORDER** → order number + live **JOYTRACK** link (`/track/<code>`).
- No card, no online payment. Orders are created **UNPAID · PAY AT PICKUP** and never auto-marked paid.
- Owner dashboard: `/admin` — live board (New → Preparing → Ready for pickup → Picked up), item-by-item prep, ETA, **MARK AS PAID** (cash / card at counter / other in-person methods) recording who and when, live "ordering right now" carts, sold-out switches, pause ordering, staff PINs.
- COMPLETED (handed over) and PAID (money collected) are separate statuses.

### Run locally
`npm install` then `npm run build && npm start` → http://localhost:3001 (dev owner password: `joyfull-dev`).
Or `npm run dev:server` + `npm run dev` for hot reload.

### Deploy (Render Web Service + Supabase)
Environment variables: `DATABASE_URL` (Supabase → Connect → **Session pooler** string), `OWNER_PASSWORD`, `SESSION_SECRET`, `NODE_ENV=production`, `TAX_RATE=0.06`.
Tables are created automatically in a private `joyfull` schema with row-level security on.

## Agency API (BDT monitoring + control)

Owner dashboard → click your name (top right) → **Connections** (or Ctrl/Cmd + Shift + K). Owner only.

- **API keys** — generate a key for BDT (full control or read-only). Shown once; stored hashed. Revoke anytime.
- **Website switch** — turn the whole public site off/on (customers see a "We'll be right back" page; dashboard + API keep working).
- **Errors** — server errors, crashes, database outages and visitors' browser errors, live.
- **Alerts to BDT** — signed webhooks (`X-Joyfull-Signature: sha256=HMAC(secret, body)`) for errors, site on/off, database, new orders.
- **Activity** — audit log of every control action taken with a key.

Base URL `https://<site>/api/agency/v1`, header `Authorization: Bearer jjj_live_…`.
Endpoints: `/ping`, `/status`, `/health`, `/alerts`, `/errors`, `/metrics`, `/orders`, `/orders/:number`, `/menu`, `/settings`, `/audit`, `/events` (SSE),
and controls `POST /site`, `/ordering`, `/announcement`, `/menu/:itemId`, `/orders/:number/status`, `/errors/resolve`, `/sessions/revoke`.
