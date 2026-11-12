# Reads Flickr's official public photoset feeds (no API key, public albums only) for the albums in
# tools/albums.txt, downloads each photo at 1024px, and writes optimised local copies + a JSON report.
# Also records the public Open Graph tags of two Facebook share links (no login, no scraping of private content).
import json, os, re, urllib.request, io, html
from PIL import Image
NSID = "199494905@N04"
UA = {"User-Agent": "Mozilla/5.0 (portfolio album import; contact rajdwaipyan.github.io)"}
OUT = "assets/img/photos"; os.makedirs(OUT, exist_ok=True)
def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read(), r.geturl(), r.status
report = {"albums": [], "facebook": []}
for sid in [l.strip() for l in open("tools/albums.txt") if l.strip()]:
    al = {"set": sid, "url": f"https://www.flickr.com/photos/{NSID}/sets/{sid}/"}
    try:
        raw, _, st = get(f"https://www.flickr.com/services/feeds/photoset.gne?set={sid}&nsid={NSID}&format=json&nojsoncallback=1&lang=en-us")
        txt = raw.decode("utf-8", "replace").replace("\\'", "'")
        feed = json.loads(txt)
        al["feed_title"] = feed.get("title"); al["feed_description"] = feed.get("description"); al["modified"] = feed.get("modified")
        photos = []
        for it in feed.get("items", []):
            m = it["media"]["m"]
            mm = re.search(r"/(\d+)_([0-9a-f]+)_m\.jpg", m)
            pid, secret = mm.group(1), mm.group(2)
            p = {"id": pid, "title": it.get("title"), "page": it.get("link"), "taken": it.get("date_taken"), "tags": it.get("tags"), "published": it.get("published")}
            try:
                big, _, _ = get(m.replace("_m.jpg", "_b.jpg"))
                im = Image.open(io.BytesIO(big)).convert("RGB")
                p["w"], p["h"] = im.size
                for w, q in ((1024, 74), (560, 70)):
                    t = im if im.width <= w else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
                    t.save(f"{OUT}/{pid}-{w}.webp", "WEBP", quality=q, method=6)
                p["ok"] = True
            except Exception as e:
                p["ok"] = False; p["err"] = repr(e)[:120]
            photos.append(p)
        al["photos"] = photos; al["status"] = "ok"
    except Exception as e:
        al["status"] = "error: " + repr(e)[:200]
    # the album page's own title (public HTML head)
    try:
        raw, _, _ = get(al["url"])
        h = raw.decode("utf-8", "replace")
        for k in ("og:title", "og:description", "og:image"):
            mm = re.search(r'<meta[^>]+property="%s"[^>]+content="([^"]*)"' % k, h)
            al["page_" + k.replace("og:", "")] = html.unescape(mm.group(1)) if mm else None
        mm = re.search(r'"photoCount"\s*:\s*(\d+)', h) or re.search(r'(\d+)\s+photos', h)
        al["page_photo_count"] = mm.group(1) if mm else None
    except Exception as e:
        al["page_error"] = repr(e)[:160]
    report["albums"].append(al)
for u in ["https://www.facebook.com/share/1DxYTzGWK7/", "https://www.facebook.com/share/1CyRqNS3nP/"]:
    fb = {"url": u}
    try:
        raw, final, st = get(u)
        h = raw.decode("utf-8", "replace"); fb["final"] = final; fb["status"] = st
        for k in ("og:title", "og:description", "og:image", "og:url"):
            mm = re.search(r'<meta[^>]+property="%s"[^>]+content="([^"]*)"' % k, h)
            fb[k] = html.unescape(mm.group(1)) if mm else None
        mm = re.search(r"<title>(.*?)</title>", h, re.S); fb["title"] = html.unescape(mm.group(1)).strip()[:200] if mm else None
    except Exception as e:
        fb["error"] = repr(e)[:200]
    report["facebook"].append(fb)
json.dump(report, open("tools/photo-report.json", "w"), indent=1, ensure_ascii=False)
print(json.dumps([(a["set"], a.get("status"), a.get("feed_title"), len(a.get("photos", []))) for a in report["albums"]], indent=1))
