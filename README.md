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

Static site on GitHub Pages, built by Jekyll. No framework and no build step; the motion layer uses
GSAP 3.13 + ScrollTrigger and Lenis 1.3.23, self-hosted in `assets/vendor/` (see its README).

```
_layouts/default.html  the page shell: <head> (SEO, social cards), header, footer, guide, scripts
_layouts/case.html     one case-study page, built from its entry in _data/projects.yml
_layouts/post.html     one journal article (reading progress, related entries)
_templates/            journal-post.md — copy into _posts/ to publish (never published itself)
_includes/
  jsonld.html          structured data (Person, NGO, page, breadcrumbs) built from the data files
  site-header.html     monogram, mega menu (from _data/navigation.yml), CV, phone menu
  site-footer.html     closing call to action, link groups, the big name, X-ray mode and the drawn guide
  project.html         one portfolio case study ("room")
  exp-track.html       one career track on /experience/
  timeline.html        milestones list
  guide.html           the optional drawn guide (inline SVG)
_data/                 navigation, experience, education, leadership, skills, projects, publications, timeline
style.css              all styles, design tokens at the top
assets/js/             ES modules loaded by main.js (core, menu, hero, motion, cases, journal, builder, machine, contact, xray, guide, sound, particles, fx)
assets/vendor/         gsap.min.js, ScrollTrigger.min.js, lenis.min.js (unmodified, with licences)
portfolio/<id>/        one short file per case study (front matter only)
journal/               the journal landing page
```

Each page sets `title`, `description`, `root` ("" or "../") and `nav` in its front matter.

## How the motion works (for developers)

Plain HTML, CSS and ES modules with GSAP, ScrollTrigger and Lenis — no framework, no build step.

- **One clock.** `assets/js/motion.js` drives Lenis from `gsap.ticker` (no second requestAnimationFrame
  loop) and calls `ScrollTrigger.update` on every Lenis scroll. Lenis also handles same-page `#anchor` links.
- **Attributes, not per-page scripts.** Headings (`.section-title`, `.page-title`, `[data-split]`) rise word
  by word; `[data-clip]` unmasks an image; `[data-stagger]` brings a group in one by one; `[data-speed]` is
  parallax; `[data-count]` counts a number up (only verified numbers are used); `[data-hscroll]` is the
  pinned sideways showcase (a swipeable row under 960px); `[data-dims]` is the sticky picture panel;
  `[data-magnetic]` makes a button lean toward the pointer; `data-cursor="View"` labels the cursor ring.
- **The hero** (`hero.js`) runs one GSAP timeline: sun rises, letters lift, portrait unmasks, wall and deck
  arrive. On phones the name and portrait are painted immediately (they are the largest content) and
  only settle. The wall of client screenshots is CSS animation, paused on hover.
- **Fallbacks.** With `prefers-reduced-motion`, Lenis and all GSAP motion stay off and every element is
  shown in place. If the vendor scripts fail to load, the page works exactly as before (`html.no-gsap`).

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

## Publishing a journal entry

1. Copy `_templates/journal-post.md` into `_posts/` (create the folder the first time).
2. Rename it `YYYY-MM-DD-short-title.md`; it will be published at `/journal/short-title/`.
3. Fill in `title`, `description`, `category` (Technology, Leadership, Development or Research) and write in Markdown.
4. Commit to `main`. The entry appears on `/journal/` (newest is featured), on the home page, in the sitemap,
   with `BlogPosting` structured data, a reading-progress bar and related entries — nothing else to edit.

## Adding a website to the portfolio

Add a line to `_data/sites.yml` (`slug`, `name`, `url`, `domain`, `cat`) and save a 800 × 500 screenshot of its home
page as `assets/img/sites/<slug>.webp`. No screenshot? Add `shot: false` and the card shows the name instead.

## Adding a video (Watch & Explore)

Add an entry to `videos:` in `_data/videos.yml` — the file starts with a commented example. Only `id`, `title`,
`platform`, `url` and `categories` are required; YouTube thumbnails are taken from YouTube, Shorts are detected
from `/shorts/` links, and `featured: true` puts a video in the large slot. Fill in `channels` to show the
Subscribe / Follow buttons. The page (`/watch/`), its menu link, the home-page row and its sitemap entry appear
automatically once there is at least one video. YouTube plays in a pop-up player (youtube-nocookie.com, loaded only
when a visitor presses play); Facebook videos open on Facebook unless the entry has `embed: true`.

## AI Prompt Engineering service page

`/ai-prompt-engineering/` is built from two data files, so content changes never need the HTML or JavaScript:

- `_data/ai_services.yml` — services (and which library category each links to), the "works with" tool names,
  before-and-after examples, the per-tool setup templates (`setup:`), process, packages and prices, use cases and FAQ.
- `_data/prompt_library.yml` — the free prompt library: categories and prompts (`id`, `title`, `category`, `tools`,
  `summary`, `prompt`). Write `[BRACKETS]` for anything the reader fills in; they are highlighted on the page.

`assets/js/ai.js` runs the page. **Everything works in the browser, with no server:**

| Works on this site (front end only) | Would need a backend or third-party service |
|---|---|
| Prompt library search, category and tool filters, sort, viewer, copy, `.txt` download, shareable `#prompt-<id>` links | Accounts, logins or saved favourites |
| Prompt builder (fills a template; no AI model is called) | Generating answers with a real AI model |
| Setup templates with copy | — |
| Pricing view switch, package finder, "start with this package" (pre-selects the form) | Online checkout or payments |
| Enquiry form: opens the visitor's email app or WhatsApp with the message written; "copy message" | Sending or storing form submissions on a server |

The marquee bands are CSS animations (paused on hover/focus and off screen, turned into scrollable rows when the
visitor prefers reduced motion). The page carries Service (offer catalogue of starting prices) and FAQPage
structured data. Pages also cross-fade on navigation in browsers that support view transitions (`style.css`, base).

## Services

`/services/` and one page per practice (`services/web-development/`, `ai-automation/`, `crm-automation/`,
`cybersecurity/`) are built from `_data/services.yml` with `_layouts/service.html`. A category page lists each
service (description, typical situations, technologies), related case studies with live previews, related links
and a contact block (`_includes/services-cta.html`). To add a service, add an entry under its category; to add a
practice, add a category and a two-line page in `services/<id>/index.html` (copy an existing one). The AI Prompt
Engineering page stays at `/ai-prompt-engineering/` and now sits under Services (navigation and breadcrumbs).

## Scrolling website previews

Every website in the portfolio, the case-study pages and the services pages show the site in a browser frame
that scrolls by itself from top to bottom, pauses, glides back and repeats (`_includes/browser.html`,
`assets/js/preview.js`). Visitors can pause, replay, change speed, or scroll the frame themselves — any scroll,
tap or key inside it hands control to them. Previews only run while on screen; with reduced motion they wait for Play.

**What scrolls is a full-page capture, not the live site.** Another website's page cannot be scrolled from this
site (browsers forbid it across domains), and most of these sites also refuse to be framed. So each site was
captured top to bottom by `tools/fullpage.py` (run on GitHub Actions, 1440 px desktop width) into
`assets/img/full/<slug>-900.webp` / `-480.webp`, listed with their size and capture date in `_data/previews.yml`.
The page always says it is a capture and links to the live site. Where a site allows framing (`embed: true`),
the large viewer also offers **Live site**: the real page in a frame, which the visitor scrolls.

To refresh captures: add the site to `tools/fullpage-sites.txt`, run `tools/fullpage.py` (Python + Playwright;
needs normal internet access), then update `_data/previews.yml` from `tools/fullpage-report.json`.

## Liquid Glass interface

The interface layer — header capsule, mega menu, phone menu, buttons, filters, preview frames, dialogs, social
icons — uses translucent "glass" surfaces (blur, a bright top edge, soft shadow): see the LIQUID GLASS block in
`style.css` (tokens `--g-*`). Text-heavy content stays on solid backgrounds for contrast. Browsers without
`backdrop-filter`, and visitors with "reduce transparency" switched on, get solid surfaces instead.

## Photography

`/photography/` is built from `_data/photography.yml`: albums (title, Flickr link, description, categories, cover)
and their photographs (id, title, width, height, Flickr page). Images are local copies in `assets/img/photos/`
as `<id>-1024.webp` and `<id>-560.webp`; each one links back to its Flickr page. To add a photo, save those two
files and add a line to the album; to add an album, copy an album block. `featured` picks the first-screen photo.
Facebook albums are listed under `facebook:` as link cards.

## Social links and WhatsApp

`_data/social.yml` holds the profile links (hero, contact, footer) and the WhatsApp number and greeting used by
the sticky chat button (`_includes/whatsapp.html`).

## Adding a case study

Add the project to `_data/projects.yml` (including `place`, `region`, `work` and `filters`), add screenshots to
`assets/img/work/`, then create `portfolio/<id>/index.html` containing only front matter — copy
`portfolio/eagle/index.html` and change `project`, `title`, `description` and `crumb`.

## Licence

Code: MIT (see `LICENSE`). Fonts: SIL Open Font License (see `assets/fonts/`).
Photos, screenshots of client sites and written content © their owners.
