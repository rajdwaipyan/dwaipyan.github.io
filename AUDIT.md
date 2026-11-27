# Transformation audit — phase 1 (27 November 2026)

Repository-only document (excluded from the website). It records what exists, what phase 1 changed, how each part
was tested, the security findings, and what is planned next. "Tested" below means the test was actually run.

## 1. Architecture discovered
- **Static site:** Jekyll, built and deployed by GitHub Actions to GitHub Pages
  (`.github/workflows/jekyll-gh-pages.yml`), with a build check on every pull request (`build-check.yml`).
  Served at `rajdwaipyan.github.io/dwaipyan.github.io/`, a sub-path of the account's user site.
- **Content:** `_data/*.yml`, including projects, experience, education, leadership, skills, services, solutions and twin.
  Pages are Liquid templates; one layout (`default.html`) plus `case`, `service` and `post`.
- **Front end:** one stylesheet (`style.css`); ES modules started by `assets/js/main.js`; GSAP,
  ScrollTrigger and Lenis self-hosted in `assets/vendor/`; Roboto self-hosted; no build step, bundler or npm
  dependencies.
- **Optional server:** `tools/hostinger-api/` (PHP and PHPMailer for Hostinger). It is not deployed by GitHub Pages and
  not installed yet.
- **Third-party services:**
  - YouTube and Facebook video embeds, loaded on click.
  - Cloudflare Turnstile, only when the forms API is switched on.
  - WhatsApp and email links.
  - No analytics, trackers or advertising.
- **Routes:** 24 pages, including the new `/intelligence/` and `/rights/`, plus the journal post layout and `404.html`.

## 2. Feature-preservation matrix
Status: **kept** means untouched; **refined** means changed, with the change noted. "Regression test" names the
check that was run on this branch.

| Feature | Implementation | Status | Regression test (run) |
|---|---|---|---|
| Header, glass bar, mega menu, phone menu | `site-header.html`, `menu.js` | refined: new menu item, wordmark style | qa4 link and anchor check, 24 pages; axe scan |
| Home hero, night cover, portrait lens | `hero.js`, `index.html` | kept (hero work is phase 2) | screenshots; console clean |
| Digital twin (roaming, chat, voice) | `twin.js`, `twin-brain.js`, `twin.yml` | refined: never sits on form controls; knows the new feature | twqa 34/34, 35/35, 34/34 |
| Guide sounds, particles, X-ray mode | `sound.js`, `particles.js`, `xray.js` | kept | console clean on every page |
| Scroll motion (GSAP and Lenis), reveals, words | `motion.js`, `fx.js`, `core.js` | kept | console clean; reduced-motion scan |
| "What I build" demo, lead machine | `builder.js`, `machine.js` | kept | console clean |
| Browser previews, project viewer | `preview.js`, `browser.html` | kept | qa4; console clean |
| Portfolio filters, case studies | `cases.js`, `case.html` | refined: contrast | axe clean |
| Photography (tilt, albums, lightbox) | `photo.js` | refined: filter contrast | axe clean |
| Watch and Explore video player | `video.js` | kept | console clean |
| Services pages | `services.js`, `service.html` | kept | axe clean |
| Business Solutions, Builder, inquiry | `solutions.js`, `biz-planner.js` | kept | solqa 34/34, 33/33, 34/34 |
| AI Prompt Engineering page | `ai.js` | refined: tools marquee is keyboard-focusable | aiqa 38/38 × 4 viewports |
| Contact brief and email forms | `contact.js`, `forms-api.js`, API | kept | formsqa 48/48 (API on, CSP on) |
| WhatsApp button | `whatsapp.html` | kept (not modified) | aiqa WhatsApp test |
| Footer CTA, columns, wordmark and sun | `site-footer.html` | refined: copyright, colophon, rights link, back to top | screenshots at 1440 and 390 |
| SEO: titles, OG, canonical, JSON-LD, sitemap | layout, `jsonld.html` | kept, plus 2 sitemap entries | metadata script, 24 pages |
| Cache-busting import map | `default.html` | kept | module load check |
| `cv.pdf` exclusion | `_config.yml` | kept; build check now also guards `Profile.png` and `about.jpg` | build-check script run locally |

## 3. What phase 1 added
- **DWAIPYAN INTELLIGENCE** (`/intelligence/`): explained in sections 3.1–3.6.
- **Rights & credits** page (`/rights/`) and `NOTICE.md`, which scopes the MIT licence to code.
- **Footer:**
  - "© [year] Dwaipyan Mandal. All rights reserved." The year is set at build time and updated by script, so it is
    correct without JavaScript.
  - A colophon line, a rights link and a back-to-top link.
  - "Hand-built" was removed (it implied sole authorship).
- **Security:**
  - Content Security Policy on every page (meta tag).
  - Referrer policy.
  - Stricter build check.
  - Dependabot for Actions.
  - Removed a dangling source-map reference.
- **Accessibility:** every axe-core WCAG 2.2 AA violation fixed (section 6).

### 3.1 Intelligence architecture
- **Source of truth:** facts are not duplicated. The page embeds `projects`, `experience`, `education`, `leadership`
  and `skills` from `_data`, plus `_data/intelligence.yml`, which holds only the connections, intents and synonyms.
- **Graph:** `assets/js/intelligence-data.js` builds it, currently 74 nodes. Every curated reference is checked; one
  that doesn't resolve is dropped, never guessed. Tools with no links are removed. A tool used in a live project is
  upgraded to "Live project", and those projects are listed as its evidence.
- **Evidence labels:** Live project, Record, Described on this site, Self-described, Stated (not yet documented), Goal.
  Pentangular IT and Tech Maximus are shown as **Stated**, because the site doesn't document them yet. Graduate study
  and research interests are **Goals**.
- **Search:** transparent whole-word matching over labels, synonyms, tools, industries and places. It says which words
  matched, lifts the capabilities connected to a match, and drops single weak matches. It is not an AI model, and the
  page says so.
- **Map:** progressive. One item sits in the centre, its connections around it (up to 14 on desktop, 8 on phones),
  with the rest listed in the panel. Positions are measured and relaxed so labels never overlap. Each node is a real
  button with a full description; Escape or Backspace goes back along the trail. A List view, also rendered without
  JavaScript, is the alternative. Deep links work: `intelligence/?focus=cap:crm#map`.
- **Briefs:** six types plus "this item" and "my search". Each line links to its source and carries its evidence
  label. Export as copy, Markdown download or print/save as PDF (a print stylesheet keeps only the brief).
- **Cost:** the module loads only on `/intelligence/`. The embedded data is 22 KB.

## 4. Security findings
| # | Finding | Severity | Evidence | Business impact | Remediation | Status | Remaining risk |
|---|---|---|---|---|---|---|---|
| S1 | `cv.pdf` with ID number, date of birth and family/referee contacts is committed to a **public** repository | **Critical** | `git log -- cv.pdf` → 442e785; repo `visibility: public` | Identity-theft and privacy risk; anyone can download it from GitHub | Make the repo private, or remove the file from history (`git filter-repo` + force-push); assume copies exist | **Not fixed — owner decision** (reported 27 Nov) | Until removed, the file is public |
| S2 | `Profile.png` (full-resolution 3200×4800 original headshot) and `assets/img/about.jpg` (home workspace photo) are in the public repo, though excluded from the site | Medium | `_config.yml` exclude list; files in git | Master image easy to reuse; workspace photo shows a private interior | Remove from history together with S1 | Not fixed — owner decision | Same as S1 |
| S3 | MIT `LICENSE` has no scope, so it could be read as covering photos, text and portrait | Medium | `LICENSE` | Weakens "all rights reserved" for content | `NOTICE.md` scopes MIT to source code; `/rights/` explains | **Implemented** (takes effect when merged) | Copies taken before this change keep the rights granted then |
| S4 | No Content Security Policy | Medium | No CSP meta or header | Injected scripts could load from anywhere or send data out | Meta CSP: restricted script, connect, frame and img sources; `object-src 'none'`; `base-uri 'self'`; `form-action 'self' mailto:` | **Implemented and tested**: 0 violations on 19 pages × 2 sizes; forms with API 48/48 | `'unsafe-inline'` is needed for scripts (inline import map that changes every build); `frame-ancestors` cannot be set by meta, so clickjacking protection is impossible on GitHub Pages |
| S5 | GitHub Pages cannot send security headers (HSTS, `X-Frame-Options`, `Permissions-Policy`) | Low | Platform limitation | Header-based protections unavailable | Not claimed. GitHub Pages enforces HTTPS itself. To get headers, front the site with Cloudflare or move hosting | Recommendation | As stated |
| S6 | `main` has no branch protection | Medium | API: "Branch not protected" | A mistaken push or compromised token can publish directly | Settings → Branches → protect `main`: require a PR and the "Build check" status | Recommendation (needs owner) | — |
| S7 | Dependabot security updates disabled | Low | `security_and_analysis` | Vulnerable Actions versions not flagged | Added `.github/dependabot.yml` (Actions, monthly). Also enable "Dependabot alerts" in Settings | **Implemented** (config) | Alerts toggle is the owner's |
| S8 | Actions pinned by tag (`@v4`), not commit SHA | Low | workflows | A compromised tag could change build steps | Pin to SHAs (Dependabot keeps them current) | Recommendation | Low |
| S9 | Workflows' permissions and triggers | — | `contents: read` on PRs; `pull_request` (not `_target`) | — | None needed | Reviewed OK | — |
| S10 | Secrets in repository and history | — | Pattern scan of tracked files; secret scanning and push protection enabled on GitHub | — | None found; server config only as `config.sample.php` | Reviewed OK | — |
| S11 | `target="_blank"` links without `noopener` | — | Scan of built HTML | — | 0 found | Reviewed OK | — |
| S12 | Dangling `sourceMappingURL` in `lenis.min.js`; no source maps shipped | Info | file tail | 404 noise only | Comment removed; build check now fails on `*.map`, PHP or env files in the output | **Implemented** | — |
| S13 | Project `robots.txt` is never read (site is in a sub-path; root robots returns 404) | Low (SEO) | `rajdwaipyan.github.io/robots.txt` → 404 | Crawlers don't see the sitemap line | Add `robots.txt` with the sitemap URL to the user-site repo `rajdwaipyan.github.io`, or submit the sitemap in Google Search Console | Recommendation | — |

Not done, deliberately: right-click blocking, disabling text selection, anti-debugging, obfuscation or fingerprinting.
They harm legitimate visitors and accessibility, and they don't stop copying. Everything delivered to a browser can be
read; the protections above are about ownership notices, minimising what is published, and restricting what scripts
can do.

## 5. SEO
Measured on the built site:
- All 24 pages have unique titles and descriptions, canonical URLs, Open Graph and Twitter cards, valid JSON-LD,
  exactly one H1, alt text on every image, and are in the sitemap.
- The new pages follow the same pattern. The person schema was reviewed: no unverifiable claims.
- No URLs changed, so no redirects were needed.
- Recommendations: S13; five service-page titles are longer than 60 characters and get truncated in results.

## 6. Accessibility (axe-core, WCAG 2.2 AA tags, 1440 and 390, reduced motion)
- **Before:** 7 of 15 pages had violations. These were contrast on home, education, leadership, portfolio (8 nodes) and
  photography (18), plus two scroll regions that keyboard users couldn't reach (home, AI page).
- **After:** all 17 pages scanned are clean at both sizes, including `/intelligence/` and `/rights/`.
- Lighthouse accessibility: 100 on every page measured.
- **New features:**
  - Every map node is a labelled button.
  - The selected item uses `aria-current`; the panel is announced through `aria-live`.
  - The List view works without the map.
  - Evidence labels pair a shape with the colour, never colour alone.
  - Focus is always visible.
  - With reduced motion, the map's transitions are off.

## 7. Performance (Lighthouse 12, simulated mobile, local gzip server)
| Page | Before: perf / LCP / TBT | After: perf / LCP / TBT |
|---|---|---|
| Home | 80 / 3.5 s / 390 ms | 89 / 2.7 s / 290 ms |
| About | 90 / 3.3 s / 30 ms | 89 / 3.5 s / 100 ms |
| Experience | 92 / 3.0 s / 80 ms | 92 / 3.0 s / 90 ms |
| Solutions | 91 / 3.2 s / 120 ms | 93 / 2.4 s / 230 ms |
| Portfolio | 76–99 / 2.0–4.7 s (3 runs) | 76–88 / 3.1–4.6 s (3 runs) |
| Intelligence (new) | — | 88 / 3.2 s / 200 ms |

- CLS is 0 everywhere.
- Run-to-run variance is large (Portfolio on unchanged `main`: 2.0–4.7 s), so no regression is claimed or excluded
  beyond that range.
- `style.css` grew by 25 KB uncompressed (about 5 KB gzipped).
- **LCP is above the 2.5 s "good" threshold on most pages, before and after.** Making it faster is phase 2's first
  task: hero image and font loading, and deferring non-critical modules.

## 8. Testing results (all executed on this branch)
| Area | Result |
|---|---|
| axe-core WCAG 2.2 AA | 17 pages × 2 sizes clean |
| Console errors, including CSP violations | 0 on 19 pages × 2 sizes |
| Horizontal overflow | 0 on every page scanned |
| Links and anchors (24 pages) | 0 problems |
| Intelligence: graph build | 74 nodes; 0 unresolved references; 0 isolated nodes |
| Intelligence: map layout (8 nodes × 5 viewports, 320 → 1440) | 0 overlaps; 0 outside the map; all targets ≥ 40 px |
| Intelligence: flows (intent, search, map, brief) at 1440 and 390 | pass; no console errors |
| Business Solutions suite | 34/34, 33/33, 34/34 |
| AI page suite | 38/38 × 4 viewports, twice in a row (after the twin fix) |
| Digital twin suite | 34/34, 35/35, 34/34 |
| Email forms with API and CSP on (desktop and phone) | 48/48 |
| GitHub build-check script (run locally on the build) | "build output OK" |

Not run here:
- real GitHub Pages deployment (the PR build check runs real Jekyll);
- Safari and Firefox engines (unavailable in this environment; scripts were checked against Safari 14/iOS 14 and
  Firefox 100 syntax targets in an earlier phase).

## 9. Known limitations
- Hero and motion refinement, the performance work and audience entry paths are not in phase 1 (planned for phase 2).
- CSP needs `'unsafe-inline'` for scripts, and clickjacking protection isn't possible on GitHub Pages (S4, S5).
- S1, S2, S6 and the Dependabot alerts toggle need the owner's action.
- The intelligence search is keyword-based by design. If the optional AI backend is installed later, it could add a
  natural-language layer on top of the same verified graph.

## 10. Phase 2 plan (by impact, then risk)
1. **Performance:** LCP under 2.5 s on home, about and portfolio. Preload or priority for hero assets, defer
   non-critical modules, review font loading.
2. **Hero refinement:** keep the drawn portrait; a meaningful first interaction (for example "What are you looking
   for?" leading into DWAIPYAN INTELLIGENCE); clearer pathways for clients, recruiters, NGOs and academics.
3. **Audience entry points:** short routes for each audience into Intelligence briefs, the CV, Leadership and Education.
4. **Storytelling:** an interactive timeline on About using only existing facts, with facts and reflections visibly
   separated.
5. **SEO:** root `robots.txt` (S13), shorter service titles.
