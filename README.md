# Dwaipyan Mandal — portfolio

Personal site for Dwaipyan Mandal: websites, web applications and CRM automation.

Live: https://rajdwaipyan.github.io/dwaipyan.github.io/

## Concept: Surface & Structure

Every section shows what a client sees and what is built underneath it:

| Section | Surface | Structure |
| --- | --- | --- |
| Hero | Portrait and name | Hover the portrait for a line-drawing "lens"; the name reacts to the pointer |
| What I build | A demo site | Scrolling turns it into a store, a client portal, then a connected CRM system |
| Selected work | Live client sites (screenshots) | Brief, role, stack and what was connected |
| Under the hood | A contact form | A working simulation: webhook → n8n → GoHighLevel → follow-up |
| X-ray mode | The whole page | Press **X** (or the header button) and the page labels its own HTML |
| The guide | A drawn Dwaipyan in the corner | He waves, blinks, watches the pointer and says one line per section |

## Stack

Static site on GitHub Pages. No framework, no npm, no animation library.

- **Jekyll** (built in to GitHub Pages) fills the project section from `_data/projects.yml`.
- **CSS** in one file, `style.css`, design tokens at the top.
- **JavaScript** as small ES modules in `assets/js/`, loaded by `main.js`. The page is complete without it.

```
index.html             the home page (content, SEO meta, JSON-LD); front matter lets Jekyll process it
about/index.html       the About page (full bio, leadership, education, research, learning, media)
_data/projects.yml     the projects — edit this to add, change or reorder work
_data/timeline.yml     career milestones — shown on the home page and the About page
_includes/project.html how one project "room" is rendered (layouts: system, split, scroll, stack, poster)
_includes/site-header.html, site-footer.html   shared by both pages (pass base="" or base="../")
_includes/timeline.html  renders _data/timeline.yml
_includes/guide.html   the guide's drawing (inline SVG) and speech bubble
style.css              all styles
assets/js/main.js      entry point; imports the modules below
  core.js              header, mobile menu, section colours, reveals, scroll progress, copy buttons
  hero.js              kinetic name + portrait lens
  builder.js           "What I build" demo states
  machine.js           "Under the hood" automation simulation (runs in the browser only)
  contact.js           project brief → pre-filled email (no backend)
  xray.js              X-ray mode
  guide.js             the guide: hello, per-section lines, blink, eyes, wave; quiet and hide buttons
assets/img/work/       client-site screenshots (desktop 1582×989, phone 520×1125, WebP)
assets/img/            portrait, line-art layer, workspace photo, social image, profile crops
404.html               not-found page (absolute /dwaipyan.github.io/ paths)
robots.txt, sitemap.xml
```

## Common edits

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
