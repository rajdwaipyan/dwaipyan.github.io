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

## Stack

Static site on GitHub Pages. No framework, no npm, no animation library.

- **Jekyll** (built in to GitHub Pages) fills the project section from `_data/projects.yml`.
- **CSS** in one file, `style.css`, design tokens at the top.
- **JavaScript** as small ES modules in `assets/js/`, loaded by `main.js`. The page is complete without it.

```
index.html             the page (content, SEO meta, JSON-LD); front matter lets Jekyll process it
_data/projects.yml     the projects — edit this to add, change or reorder work
_includes/project.html how one project "room" is rendered (layouts: system, split, scroll, stack, poster)
style.css              all styles
assets/js/main.js      entry point; imports the modules below
  core.js              header, mobile menu, section colours, reveals, scroll progress, copy buttons
  hero.js              kinetic name + portrait lens
  builder.js           "What I build" demo states
  machine.js           "Under the hood" automation simulation (runs in the browser only)
  contact.js           project brief → pre-filled email (no backend)
  xray.js              X-ray mode
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

**Change contact details.** Search `index.html` and `assets/js/contact.js` for `rajdwaipayan@gmail.com`.

**Move to a new address** (repo renamed to `rajdwaipyan.github.io`, or a custom domain): replace
`https://rajdwaipyan.github.io/dwaipyan.github.io/` in `index.html`, `robots.txt` and `sitemap.xml`, and
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
