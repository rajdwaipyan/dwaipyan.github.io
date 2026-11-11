# Vendor scripts (self-hosted, unmodified)

| File | Version | Source | Licence |
|---|---|---|---|
| gsap.min.js | 3.13.0 | npm `gsap@3.13.0` → `dist/gsap.min.js` | GSAP Standard "No Charge" License — https://gsap.com/standard-license |
| ScrollTrigger.min.js | 3.13.0 | npm `gsap@3.13.0` → `dist/ScrollTrigger.min.js` | same as above |
| lenis.min.js | 1.3.23 | npm `lenis@1.3.23` → `dist/lenis.min.js` | MIT — see LICENSE-lenis.txt |

They are loaded with `defer` before `assets/js/main.js`, so `window.gsap`, `window.ScrollTrigger`
and `window.Lenis` exist when the modules run. If any of them fails to load, the site still works:
the motion layer simply stays off. To update, replace the files and change the version here and in
the comment in `_layouts/default.html`.
