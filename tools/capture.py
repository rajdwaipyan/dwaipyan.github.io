# Captures a 1440x900 screenshot of each site in tools/sites.txt -> assets/img/sites/<slug>.webp (800x500)
# and writes tools/capture-report.tsv (slug, url, final url, status, title). Run by .github/workflows/capture-shots.yml.
import asyncio, io, os, re
from playwright.async_api import async_playwright
from PIL import Image
OUT="assets/img/sites"; os.makedirs(OUT, exist_ok=True)
urls=[u.strip() for u in open("tools/sites.txt") if u.strip()]
def slug(u): return re.sub(r"[^a-z0-9]+","-", re.sub(r"^https?://(www\.)?","",u).strip("/").lower()).strip("-")
async def one(br, u, rows):
    s=slug(u); ctx=await br.new_context(viewport={"width":1440,"height":900}, user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36", locale="en-US")
    pg=await ctx.new_page(); status="?"; title=""; final=u
    try:
        r=await pg.goto(u, wait_until="domcontentloaded", timeout=45000); status=r.status if r else "?"
        await pg.wait_for_timeout(6000)
        # dismiss common cookie banners
        for sel in ["text=Accept all","text=Accept All","text=Accept","text=I agree","text=Allow all","text=Got it","#onetrust-accept-btn-handler"]:
            try:
                b=pg.locator(sel).first
                if await b.is_visible(timeout=500): await b.click(timeout=1500); await pg.wait_for_timeout(800); break
            except Exception: pass
        title=(await pg.title())[:120]; final=pg.url
        png=await pg.screenshot()
        im=Image.open(io.BytesIO(png)).convert("RGB").resize((800,500), Image.LANCZOS)
        im.save(f"{OUT}/{s}.webp","WEBP",quality=72,method=6)
    except Exception as e:
        status=f"ERR {type(e).__name__}"
    rows.append((s,u,final,str(status),title.replace("\t"," ")))
    await ctx.close()
async def main():
    rows=[]
    async with async_playwright() as p:
        br=await p.chromium.launch()
        sem=asyncio.Semaphore(6)
        async def run(u):
            async with sem: await one(br,u,rows)
        await asyncio.gather(*[run(u) for u in urls])
        await br.close()
    order={slug(u):i for i,u in enumerate(urls)}
    rows.sort(key=lambda r: order[r[0]])
    open("tools/capture-report.tsv","w").write("\n".join("\t".join(r) for r in rows)+"\n")
asyncio.run(main())
