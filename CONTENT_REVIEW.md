# Content review — information to confirm

This file is **not published** (it is excluded in `_config.yml`). It lists everything the site either
hides or states cautiously until you confirm it. When you confirm an item, update the data file named in
the right-hand column and delete the line here.

Status key: **Hidden** = in the data file but not shown · **Cautious** = shown in a reduced form · **Check** = shown, please verify.

## Experience — `_data/experience.yml`

| Item | Status | What I need |
| --- | --- | --- |
| Tech Maximus, Web Developer | Hidden (`published: false`) | Start and end month/year; is it a past role (memory says ~3 months) or current? |
| ED Shield Solutions start | Cautious (shown as "Present" only) | The year you co-founded it |
| Pentangular IT | Not on the site | Is it active, and should it appear? Your title and start year |
| SMS title Jan 2020 – Oct 2026 | Cautious ("IT & project management") | Your exact official title(s) — the old CV says "IT-Director / Executive Director" |
| SMS CEO responsibilities | Cautious (short note on /leadership/) | The responsibilities formally assigned to you as CEO |
| Freelance start "Apr 2020" | Check | Confirms the Fiverr start in your CV; is "6+ years" counted from 2020? |

## Leadership — `_data/leadership.yml`

| Item | Status | What I need |
| --- | --- | --- |
| SMS mission statement | Hidden (empty) | One sentence in the organisation's own words |
| SMS website | Hidden (empty) | URL, if there is one |
| ILO / Dhaka South City Corporation programme | Cautious (my part only) | Programme name, period, your exact role, and permission to describe it in more detail |
| Out-of-School Children programme, Bhanga, Faridpur | Hidden (`published: false`) | Permission to name it, period, your role |
| CV percentages (15% efficiency, 10% savings, 20% engagement, 30% participation, 25% turnaround) | Not published | A report or document that backs each figure — otherwise they stay off |
| "Three working principles" | Check | These are written in your voice — edit or approve |

## Education — `_data/education.yml`

| Item | Status | What I need |
| --- | --- | --- |
| Master's degree name | Shown as "Professional Masters in Information Technology (PMIT)" | Confirm the exact title on your certificate (PMIT vs MSc in IT) |
| Master's completion year | Shown as 2025 on the CV (report accepted 5 Apr 2025) | Official completion / result year |
| Project report summary and supervisor | Check | Approve the summary on /education/ and naming Prof. Dr. Fahima Tabassum |
| "A summary can be shared on request" | Check | Are you happy to share it? |
| English level | Cautious ("Working language · IELTS preparation in progress") | Add an official IELTS score only when you have one |
| BSc academic projects | Check | Confirm they were university projects |

## Portfolio — `_data/projects.yml`

| Item | Status | What I need |
| --- | --- | --- |
| Your role on ARCA, Vtek, ELS, O-Sea | Hidden (empty `role:`) | One sentence each on what you did |
| Challenge / solution for ARCA, Vtek, ELS, O-Sea | Hidden | Only if you know them first-hand |
| Outcomes for any project | Hidden | Only documented results (analytics, client statements you may quote) |
| Client permission | Check | Permission to show screenshots and name each client (especially Eagle Premier) |

## Writing — `_data/publications.yml`

| Item | Status | What I need |
| --- | --- | --- |
| Individual Medium articles | Cautious (profile link only) | Titles, dates and URLs of the articles you want listed |
| Peer-reviewed papers | Empty | Add when published |
| Independent coverage | Empty | Add only coverage written by others: outlet, author, date, URL |

## Public CV — `/cv/`

- The online CV is generated from the data files above, so it updates automatically.
- **Download:** there is no PDF download yet, on purpose. The page offers *Print / Save as PDF*. If you want a
  downloadable file, export the page to PDF, check it, add it to the repo as e.g. `assets/cv/dwaipyan-mandal-cv.pdf`,
  and ask for a download button to be added.
- **Private file:** `cv.pdf` in the repo root contains your NID number, date of birth, family names and referee
  phone numbers. It is excluded from the website, but anyone can still download it from GitHub. Recommended:
  delete it from the repository (and ideally from Git history).

## Contact details

- Email: rajdwaipayan@gmail.com is used everywhere. Add a separate business email for ED Shield if you have one.
- LinkedIn: the site uses `linkedin.com/in/dwaipyan-cyberexpert`. Your old CV shows `dwaipyan-mandal-cyber-sec` — confirm which is live.

## Motion & navigation upgrade (November 2026)

- **Journal:** the journal is live but empty — it says so. Nothing is published until you add a post
  (see README → "Publishing a journal entry"). The "Articles" list links to your Medium profile; add
  individual article titles and links to `_data/publications.yml` (`own_writing`) if you want each listed.
- **Case-study pages** (`/portfolio/<id>/`) show only what is in `_data/projects.yml`. Role, challenge,
  solution and outcome appear only where filled in — for ARCA, Vtek, ELS and O-Sea your role is still
  unconfirmed, so those pages show the brief, platform and screenshots only.
- **Portfolio filters** use the new `filters` field (region and type). Check that "Product catalogue"
  (Vtek) and "Online booking" (O-Sea) describe the work fairly.
- **Footer line** "Available for partnerships, academic collaboration and selected projects" — change it in
  `_includes/site-footer.html` if your availability changes.
- **Home numbers** reuse figures already on the site (6+ years, joined 2020, CEO 2026, 5 live client sites,
  2 degrees). Update them in `index.html` if any change.
