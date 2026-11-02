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
- Menu, prices, sizes, customizations, hours: the cafe's live ChowNow menu (captured Nov 2, 2026).
- Story, meal prep, catering, classes, tagline: the cafe's current GoDaddy site.
- Real cafe photos (tagged "From the cafe"): acai bowls, mocha, avocado toast, Vanilla Chai Chiller, owner, store — from the cafe's GoDaddy site and ChowNow listing.
- Sample photos (tagged "Sample photo"): every other menu item, from Unsplash under the Unsplash License (free for commercial use, no attribution required). Photo IDs are in `src/data/menu.js` naming / listed below. Replace any file in `public/photos/menu/` with the owner's own photo using the same file name, then set `stock` to false.
- Depth maps: generated with Depth Anything V2 Small (Apache-2.0).
- Photos for the juice and salad chapters (`main-squeeze`, `fruit-root`, `old-faithful`, `joyous-jade`, `summer-berry`) are also Unsplash sample photos.

## Owner to confirm before launch
- Hours: ChowNow lists Sun 12–3, Mon–Tue 6–3, Wed–Thu 6–6, Fri 6–4, Sat 8–3; the old site said 6am–6pm.
- Chapter headlines on the scroll tour were written for the redesign — approve or replace.
- Menu spellings kept as published on ChowNow: "Summer Berry Splender", Fruit Root lists carrot twice.
