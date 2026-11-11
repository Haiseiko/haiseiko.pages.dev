import os, json, subprocess, urllib.request, urllib.error, time
import xml.etree.ElementTree as ET

SITE_URL = os.environ.get("SITE_URL", "https://haiseiko.pages.dev").rstrip("/")
KEY = os.environ.get("INDEXNOW_KEY", "")
BEFORE = os.environ.get("BEFORE_SHA", "")
CURRENT = os.environ.get("CURRENT_SHA", "")
HOST = "haiseiko.pages.dev"

def get_changed_files():
    # 풀 코드에서 이전 커밋 vs 지금 커밋
    try:
        if BEFORE and not BEFORE.startswith("0000000"):
            out = subprocess.check_output(
                ["git", "diff", "--name-only", BEFORE, CURRENT], text=True
            )
        else:
            out = subprocess.check_output(
                ["git", "diff", "--name-only", "HEAD^", "HEAD"], text=True
            )
        return [l.strip() for l in out.splitlines() if l.strip()]
    except Exception as e:
        print(f"diff 실패: {e}")
        return []

def parse_sitemap_text(text: str):
    try:
        root = ET.fromstring(text)
        ns = {"n": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        return [loc.text.strip() for loc in root.findall(".//n:loc", ns)]
    except Exception:
        return []

def sitemap_urls_from_file(path="sitemap.xml"):
    try:
        with open(path, encoding="utf-8") as f:
            return parse_sitemap_text(f.read())
    except Exception:
        return []

def sitemap_urls_from_commit(ref: str):
    try:
        out = subprocess.check_output(
            ["git", "show", f"{ref}:sitemap.xml"], text=True
        )
        return parse_sitemap_text(out)
    except Exception:
        return []

def file_to_urls(path: str):
    # 1. sitemap 자체가 바뀐 경우: 새로 생긴 URL만 보냄 (전체 X)
    if path == "sitemap.xml":
        old = set(sitemap_urls_from_commit(BEFORE)) if BEFORE and not BEFORE.startswith("0000000") else set()
        new = set(sitemap_urls_from_file())
        added = list(new - old)
        if added:
            print(f"sitemap에서 새로 생긴 URL만 보냄: {added}")
            return added
        return [f"{SITE_URL}/sitemap.xml"]

    # 2. 워커가 바뀐 경우: 얘만 예외로 전체 보냄 (모든 페이지를 만드니까)
    if path == "_worker.js":
        print("_worker.js 변경 - 전체 페이지 보냄 (예외)")
        return sitemap_urls_from_file()

    # 3. 나머지는 전부 거르기 없이 바뀐 파일 1개 = URL 1개
    # index.html -> /, README.md -> /README.md, 사진.jpg -> /사진.jpg
    if path == "index.html":
        return [f"{SITE_URL}/"]
    if path.endswith("/index.html"):
        return [f"{SITE_URL}/{path[:-len('/index.html')]}"]
    return [f"{SITE_URL}/{path}"]

def main():
    changed = get_changed_files()
    print(f"바뀐 파일: {changed}")

    urls = []
    for f in changed:
        urls += file_to_urls(f)

    urls = list(dict.fromkeys(urls))
    if not urls:
        print("바뀐 거 없음 - 종료")
        return

    print(f"바뀐 것만 보냄: {urls}")
    print("Cloudflare Pages 배포 대기 90초...")
    time.sleep(90)

    payload = {
        "host": HOST,
        "key": KEY,
        "keyLocation": f"{SITE_URL}/{KEY}.txt",
        "urlList": urls
    }

    req = urllib.request.Request(
        "https://api.indexnow.org/IndexNow",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            print(f"IndexNow 성공: {res.status}")
    except urllib.error.HTTPError as e:
        print(f"IndexNow 실패: {e.code} {e.read().decode()}")
    except Exception as e:
        print(f"IndexNow 에러: {e}")

if __name__ == "__main__":
    main()