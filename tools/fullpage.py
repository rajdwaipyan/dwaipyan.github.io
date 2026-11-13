"""Temporary: full-page captures of each portfolio site for the scrolling browser previews.
Writes assets/img/full/<slug>-900.webp and -480.webp plus tools/fullpage-report.json.
It also records whether each site allows framing (X-Frame-Options / CSP frame-ancestors) — read only, never bypassed."""
import asyncio, json, re, io, os, time
from PIL import Image
from playwright.async_api import async_playwright
Image.MAX_IMAGE_PIXELS = None
OUT = "assets/img/full"; os.makedirs(OUT, exist_ok=True)
rows = [l.split("\t") for l in open("tools/fullpage-sites.txt").read().split("\n") if l.strip()]
CAP = 14400
ACCEPT = re.compile(r"^(accept( all)?( cookies)?|allow( all)?( cookies)?|agree|i agree|got it|ok|okay|accept & close|aceptar|accepter|akkoord|alle akzeptieren)$", re.I)
report = {}

def frame_policy(h):
    xfo = (h.get("x-frame-options") or "").lower()
    csp = (h.get("content-security-policy") or "").lower()
    fa = re.search(r"frame-ancestors([^;]*)", csp)
    fa = fa.group(1).strip() if fa else ""
    blocked = bool(xfo) and ("deny" in xfo or "sameorigin" in xfo)
    if fa and fa not in ("*", "* data: blob:"): blocked = True
    return {"xfo": xfo, "frame_ancestors": fa, "embeddable": not blocked}

async def one(browser, slug, url):
    ctx = await browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1,
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36")
    page = await ctx.new_page()
    r = {"url": url}
    try:
        resp = await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        r["status"] = resp.status if resp else None
        r.update(frame_policy(resp.headers if resp else {}))
        r["final_url"] = page.url
        try: await page.wait_for_load_state("networkidle", timeout=15000)
        except Exception: pass
        await page.wait_for_timeout(2500)
        for b in await page.query_selector_all("button, a[role=button], a.cc-btn, [id*=accept], [class*=accept]"):
            try:
                t = (await b.inner_text()).strip()
                if t and len(t) < 30 and ACCEPT.match(t) and await b.is_visible():
                    await b.click(timeout=2000); await page.wait_for_timeout(800); break
            except Exception: pass
        last = 0
        for i in range(60):
            h = await page.evaluate("Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0)")
            y = (i + 1) * 700
            await page.evaluate(f"window.scrollTo(0, {y})"); await page.wait_for_timeout(280)
            if y > h and h == last: break
            last = h
            if y > CAP + 2000: break
        await page.wait_for_timeout(1200)
        await page.evaluate("window.scrollTo(0, 0)"); await page.wait_for_timeout(1500)
        h = await page.evaluate("Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0)")
        r["page_height"] = h
        clip_h = max(900, min(h, CAP))
        png = await page.screenshot(full_page=True, clip={"x": 0, "y": 0, "width": 1440, "height": clip_h}, timeout=90000, animations="disabled")
        im = Image.open(io.BytesIO(png)).convert("RGB")
        r["captured_height"] = im.height; r["clipped"] = h > CAP
        for w in (900, 480):
            im.resize((w, round(im.height * w / 1440)), Image.LANCZOS).save(f"{OUT}/{slug}-{w}.webp", "WEBP", quality=66, method=6)
        r["ok"] = True
        r["title"] = (await page.title())[:120]
    except Exception as e:
        r["ok"] = False; r["error"] = str(e)[:300]
    finally:
        await ctx.close()
    report[slug] = r
    print(slug, r.get("ok"), r.get("captured_height"), r.get("embeddable"), r.get("error", "")[:80], flush=True)

async def main():
    sem = asyncio.Semaphore(4)
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        async def run(s, u):
            async with sem:
                try: await asyncio.wait_for(one(browser, s, u), 240)
                except Exception as e:
                    report[s] = {"url": u, "ok": False, "error": "timeout " + str(e)[:100]}; print(s, "TIMEOUT", flush=True)
        await asyncio.gather(*(run(s, u) for s, u in rows))
        await browser.close()
    report["_captured"] = time.strftime("%Y-%m-%d")
    json.dump(report, open("tools/fullpage-report.json", "w"), indent=1, sort_keys=True)
asyncio.run(main())
