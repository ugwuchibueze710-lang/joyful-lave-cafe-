# Joy-Full Java + Juice — website

Premium redesign of thejoyfullcafe.com for **Joy-Full Java + Juice**, 3811 Leitchfield Rd (KY 54), Owensboro, KY.
Built with Vite + Three.js + GSAP + Lenis. Static site — no server needed.

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
| 3D scenes (one file per menu station) | `src/three/stations/` |
| Opening animation + camera journey | `src/three/world.js`, `src/main.js` |
| Photos (all from the cafe) | `public/photos/` |

## Content sources
- Menu, prices, sizes, customizations, hours: the cafe's live ChowNow menu (captured Nov 2, 2026).
- Story, meal prep, catering, classes, tagline: the cafe's current GoDaddy site.
- Photos: the cafe's GoDaddy site and ChowNow listing.
- 3D scenes are illustrations of real menu items and the real store wall — not photographs.

## Owner to confirm before launch
- Hours: ChowNow lists Sun 12–3, Mon–Tue 6–3, Wed–Thu 6–6, Fri 6–4, Sat 8–3; the old site said 6am–6pm.
- Chapter headlines on the scroll tour were written for the redesign — approve or replace.
- Menu spellings kept as published on ChowNow: "Summer Berry Splender", Fruit Root lists carrot twice.
