# Dwaipyan Mandal — portfolio

Personal site for Dwaipyan Mandal: websites, web applications and CRM automation.

Live: https://rajdwaipyan.github.io/dwaipyan.github.io/

## Stack

Plain HTML, CSS and JavaScript — no framework, no build step. GitHub Pages builds it through the
Jekyll workflow in `.github/workflows/`; `_config.yml` only keeps repo-only files out of the published site.

```
index.html          the page (content, SEO meta, JSON-LD)
style.css           all styles; design tokens at the top
script.js           progressive enhancements (menu, previews, brief → email)
404.html            not-found page (uses absolute /dwaipyan.github.io/ paths)
robots.txt          allows crawling, points to the sitemap
sitemap.xml         one URL today; add a <url> per new page
assets/fonts/       self-hosted Bricolage Grotesque, Instrument Serif, DM Mono (SIL OFL)
assets/img/         portrait, workspace photo, social share image
assets/icons/       favicons
```

## Common edits

**Add a project.** Copy one `<li class="project">` block in the `#work` section. Keep the three facts
(Client / The site needed to / Built with) to things you can show. To add a screenshot instead of the
typographic cover, save a 1600×1000 WebP to `assets/img/work/<name>.webp` and replace the
`<div class="project-cover">` with:

```html
<div class="project-cover project-shot">
  <img src="assets/img/work/<name>.webp" width="1600" height="1000" loading="lazy" alt="Homepage of <client> website">
</div>
```
and add to `style.css`: `.project-shot { padding: 0; } .project-shot img { width: 100%; height: 100%; object-fit: cover; object-position: top; }`

**Change contact details.** Search `index.html` and `script.js` for `rajdwaipayan@gmail.com`.

**Move to a new address** (for example after renaming the repo to `rajdwaipyan.github.io`, or adding a
custom domain). Replace `https://rajdwaipyan.github.io/dwaipyan.github.io/` everywhere it appears in
`index.html`, `robots.txt` and `sitemap.xml`, and replace `/dwaipyan.github.io/` in `404.html`
(use `/` for a root site).

**Update the "last modified" date** in `sitemap.xml` and the JSON-LD `dateModified` when content changes.

## Licence

Code: MIT (see `LICENSE`). Fonts: SIL Open Font License (see `assets/fonts/`).
Photos and written content © Dwaipyan Mandal.

## Hero stage

The hero portrait is built from layers inside `<figure class="hero-stage">`: a lime disc, a violet
duotone echo of the same photo, an SVG of three orbits (with SMIL sparks), the arched portrait, and three
service links. Each layer's `--d` in `style.css` sets how far it moves with the pointer; `script.js` writes
`--mx`/`--my`. Everything is visible without JavaScript and static under reduced motion.

## Publishing articles later

Put each article in its own folder, e.g. `notes/n8n-to-gohighlevel/index.html`, reusing `style.css`
(`../../style.css`) and the header/footer markup. Give every page its own title, description, canonical URL and an
`Article` JSON-LD block whose `author` is `{"@id": "https://rajdwaipyan.github.io/dwaipyan.github.io/#person"}`, link to
it from the home page, and add it to `sitemap.xml`.
