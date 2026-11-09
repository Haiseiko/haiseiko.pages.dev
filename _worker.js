export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const slug = url.pathname.replace(/^\//, "").split("/")[0].toLowerCase();

    // / 는 메인 (지금은 빈 페이지)
    if (!slug) {
      return env.ASSETS.fetch(request);
    }

    if (slug === "favicon.ico" || slug === "robots.txt" || slug === "sitemap.xml") {
      return env.ASSETS.fetch(request);
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
          headers: { "Content-Type": "text/plain", "Retry-After": "1" },
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
          { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "KV_UNAVAILABLE" }),
        { status: 503, headers: { "Content-Type": "application/json", "Retry-After": "5" } }
      );
    }

    // 421 유지
    return new Response("421 Misdirected Request.", { status: 421 });
  }
}