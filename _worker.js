export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const slug = url.pathname.replace(/^\//, "").split("/")[0].toLowerCase();

    // 진짜 파일 요청일 때만 ASSETS에서 가져오기
    // / , /421.html, /style.css, /favicon.ico 같은 경우만
    // /abc 같은 슬러그는 파일이 아니니까 ASSETS를 건너뜀
    const isFile = /\.[a-z0-9ㄱ-ㅎ]+$/i.test(url.pathname);

    if (url.pathname === "/" || isFile) {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return asset;
      if (isFile) return asset; // 없는 파일은 404 그대로
    }

    if (!slug) {
      return await env.ASSETS.fetch(request);
    }

    // 1초 안에 2번째부터 420 참을성 없음
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const rlKey = `__rl__:${ip}:${slug}`;
    const now = Date.now();

    try {
      const raw = await env.REDIRECTS.get(rlKey);
      let hits = raw ? JSON.parse(raw) : [];

      // 1000ms 안에 들어온 기록만 남기기
      hits = hits.filter((t) => now - t < 1000);

      if (hits.length >= 1) {
        return new Response("420 Enhance Your Calm - Please try again in 1 second.", {
          status: 420,
        });
      }

      hits.push(now);
      await env.REDIRECTS.put(rlKey, JSON.stringify(hits), { expirationTtl: 60 });
    } catch (e) {
      // 레이트리밋 체크 실패하면 그냥 통과
    }

    try {
      const dest = await env.REDIRECTS.get(slug);

      if (dest) {
        return Response.redirect(dest, 303);
      }
    } catch (e) {
      const msg = String(e?.message || e).toLowerCase();

      if (msg.includes("limit") || msg.includes("quota") || msg.includes("exceed") || msg.includes("429")) {
        return new Response(
          JSON.stringify({ error: "LIMIT_EXCEEDED" }),
        );
      }

      return new Response(
      );
    }

    // 알 수 없는 단축 주소는 이미지가 포함된 421 페이지를 반환
    const page = await env.ASSETS.fetch(
      new Request(new URL("/421.html", request.url), { method: "GET" })
    );

    if (page.status === 404) {
      return new Response("421 - Unknown short link", { status: 421 });
    }

    return new Response(page.body, {
      status: 421,
      headers: page.headers,
    });
  }
};