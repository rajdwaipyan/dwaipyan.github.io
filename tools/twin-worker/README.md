# Live AI for the digital twin (optional)

The digital twin already works without any server: it matches questions against the portfolio's own content
in the visitor's browser. This folder is only for connecting a real language model, so answers are written
rather than matched. **It has not been tested against a live API key** — follow the test step below.

Why a server is needed: an API key must never be placed in website code, where anyone could copy it.
This small Cloudflare Worker keeps the key and passes questions to the model.

## What you need
- A Cloudflare account (the free Workers plan is enough for a personal site).
- An Anthropic API key (console.anthropic.com). API usage is paid per request — set a spending limit there.

## Set up
1. Install the tool and sign in: `npm install -g wrangler` then `wrangler login`.
2. In `wrangler.toml`, set `MODEL` to a current model id (a small, fast model is enough) from
   https://docs.claude.com/en/docs/about-claude/models
3. From this folder: `wrangler secret put ANTHROPIC_API_KEY` (paste the key when asked), then `wrangler deploy`.
4. Copy the Worker's URL (it ends in `.workers.dev`) into `_data/twin.yml` as `endpoint: "https://…"` and commit.

## Test
Open the site, ask the twin a question, and open its "More" menu: the note there should say answers come from
an AI model. Ask something that is not on the site (it should say it doesn't know) and something that is.
If the Worker fails, is slow, or the daily limit is reached, the twin quietly answers from the portfolio content instead.

## Safeguards in the Worker
- Only requests from your site's origin are accepted (`ALLOWED_ORIGIN`).
- Each visitor (IP address) is limited to `DAILY_LIMIT` questions a day; questions are capped at 300 characters
  and answers at 300 tokens.
- The model is told to answer only from `assets/twin-knowledge.json` and to say when it doesn't know.
- Nothing is stored: no conversation logs are kept by the Worker.

To switch live AI off again, set `endpoint: ""` in `_data/twin.yml`.
