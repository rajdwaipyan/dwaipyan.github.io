# Dwaipyan Mandal — portfolio

Personal site for Dwaipyan Mandal: websites, web applications and CRM automation.

Live: https://rajdwaipyan.github.io/dwaipyan.github.io/

## What the site is

A professional identity site for three audiences — organisations and development partners, universities, and
clients — built on the "Surface & Structure" idea: every section shows what people see and what sits underneath.

| Page | URL | Content comes from |
| --- | --- | --- |
| Home | `/` | hero, pathways, snapshots — `index.html` + all data files |
| Experience | `/experience/` | `_data/experience.yml`, `_data/skills.yml` |
| Leadership | `/leadership/` | `_data/leadership.yml` |
| Education | `/education/` | `_data/education.yml`, `_data/publications.yml` |
| Portfolio | `/portfolio/` | `_data/projects.yml` (+ the "What I build" and automation demos) |
| About | `/about/` | `about/index.html`, `_data/timeline.yml`, `_data/publications.yml` |
| CV | `/cv/` | generated from the data files; printable / Save as PDF |

Facts still to confirm are listed in `CONTENT_REVIEW.md` (not published).

## Design system

- **Type:** two families only. Display — `"Avenir Next", Avenir, "Helvetica Neue", Arial, sans-serif` (Avenir is a
  system font on Apple devices and is not redistributable, so it is not self-hosted; other systems use the fallbacks).
  Text — Roboto, self-hosted variable font (`assets/fonts`, SIL Open Font License). Set centrally at the top of `style.css`.
- **Colour:** paper, ink and two sunflower tones — Surjamukhi means "facing the sun". Sienna `#9e3f0a` for text accents,
  sunflower `#eba83a` for fills.
- **Hero:** an editorial cover — the name as a masthead, the cut-out portrait in front of it, a flat sun behind.
  The cut-out (`assets/img/dwaipyan-mandal-cutout-*.webp`) was made from the original `Profile.png`.

## Stack

Static site on GitHub Pages. No framework, no npm, no animation library.

```
_layouts/default.html  the page shell: <head> (SEO, social cards), header, footer, guide, scripts
_includes/
  jsonld.html          structured data (Person, NGO, page, breadcrumbs) built from the data files
  site-header.html     monogram, navigation capsule, CV + Contact, phone menu
  site-footer.html     links, X-ray mode and "Meet the drawn me" (both optional extras)
  project.html         one portfolio case study ("room")
  exp-track.html       one career track on /experience/
  timeline.html        milestones list
  guide.html           the optional drawn guide (inline SVG)
_data/                 experience, education, leadership, skills, projects, publications, timeline
style.css              all styles, design tokens at the top
assets/js/             ES modules loaded by main.js (core, nav, hero, builder, machine, contact, xray, guide, sound, particles, fx)
```

Each page sets `title`, `description`, `root` ("" or "../") and `nav` in its front matter.

## How the motion works (for developers)

Everything is plain HTML, CSS and ES modules — no framework, no animation library, no build step.

- **The guide** is ~40 SVG shapes inlined in the page. Expressions and gestures are CSS classes on
  `<aside id="guide">` (`do-wave`, `do-dance`, `is-asleep`…) driving `@keyframes` on SVG groups with
  `transform-box: view-box`. The head "turns" by shifting the face layer a few pixels toward the pointer
  while the ears and hair move less — cheap parallax that reads as 3D. On the left edge the drawing is
  mirrored with `scaleX(-1)` so he always faces the page.
- **Costumes** are hidden `<g class="g-prop p-…">` groups shown with `[data-prop~="glasses"]` selectors.
- **Section awareness** is one `IntersectionObserver` watching a thin band in the middle of the viewport;
  each section carries its own `data-guide`, `data-guide-prop`, `data-guide-side` attributes.
- **Sound** is synthesised on the fly (oscillators + filtered noise) and only starts after a click,
  which is also what browsers require. Mute is remembered in `localStorage`.
- **Halftone reveal** animates a registered custom property (`@property --dot`) inside a repeating
  `radial-gradient` mask.
- **Scratch card** is a canvas painted with sand, erased with `destination-out`; coverage is sampled
  every 250 ms with `getImageData`.
- **Performance and access**: the speech bubble is absolutely positioned so it never shifts layout
  (CLS 0); the particle loop only runs while particles exist; everything decorative is switched off
  under `prefers-reduced-motion`; the page is complete without JavaScript.

## Common edits

**Update your career.** Edit `_data/experience.yml` (roles), `_data/education.yml` (degrees, training),
`_data/leadership.yml` (CEO role, programmes) or `_data/timeline.yml` (milestones). Every page and the CV update
from these files.

**Add or change a project.** Open `_data/projects.yml` on GitHub, press the pencil icon, and copy an
existing entry. Put screenshots in `assets/img/work/`. Choose a `layout`:

- `system` — browser + a detail image + a three-step flow (good for automation projects)
- `split` — browser with a phone in front
- `scroll` — the page scrolls inside the browser as visitors scroll (needs a tall `full` image, 1582×1978)
- `stack` — tilted browser with a phone, visual on the left
- `poster` — big screenshot with a giant outlined word behind it (change the word in `style.css`, `.layout-poster .room-visual::before`)

Leave `role` and `outcome` empty until you can back them up — empty fields are hidden.

**Add a milestone.** Open `_data/timeline.yml` and add an entry at the top (newest first). Use
`published: false` to keep a draft entry out of the site until it can be confirmed.

**Change what the guide says.** Each section's line is its `data-guide="…"` attribute in the HTML; project
lines are the `guide:` field in `_data/projects.yml`. On phones he only speaks when tapped, plus hello and
the contact section.

**Change contact details.** Search `index.html` and `assets/js/contact.js` for `rajdwaipayan@gmail.com`.

**Move to a new address** (repo renamed to `rajdwaipyan.github.io`, or a custom domain): replace
`https://rajdwaipyan.github.io/dwaipyan.github.io/` in `index.html`, `about/index.html`, `robots.txt` and `sitemap.xml`, and
`/dwaipyan.github.io/` in `404.html` (use `/` for a root site).

**When content changes**, update `<lastmod>` in `sitemap.xml` and `dateModified` in the JSON-LD.

## Contact form

There is no server. "Write the email" opens the visitor's own email app with the brief filled in, and the
page says so. To receive submissions directly instead, connect a form service (for example Formspree or
Web3Forms): it gives you an endpoint URL to use as the form's `action`. No secret key is needed in the page.

## Publishing articles later

Put each article in its own folder, e.g. `notes/n8n-to-gohighlevel/index.html`, with front matter (`---` lines)
so Jekyll processes it, reuse `../../style.css`, and give it its own title, description, canonical URL and an
`Article` JSON-LD block whose `author` is `{"@id": "https://rajdwaipyan.github.io/dwaipyan.github.io/#person"}`.
Link it from the home page and add it to `sitemap.xml`.

## Licence

Code: MIT (see `LICENSE`). Fonts: SIL Open Font License (see `assets/fonts/`).
Photos, screenshots of client sites and written content © their owners.
