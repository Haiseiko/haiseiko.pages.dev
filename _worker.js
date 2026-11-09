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

    try {
      const dest = await env.REDIRECTS.get(slug);
      if (dest) {
        return Response.redirect(dest, 302);
      }
    } catch (e) {
      const msg = String(e?.message || e).toLowerCase();
      // 한도 / 쿼터 초과면 429
      if (msg.includes("limit") || msg.includes("quota") || msg.includes("exceed") || msg.includes("429")) {
        return new Response(
          JSON.stringify({ error: "LIMIT_EXCEEDED" }),
          { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } }
        );
      }
      // 그 외 KV 장애는 503
      return new Response(
        JSON.stringify({ error: "KV_UNAVAILABLE" }),
        { status: 503, headers: { "Content-Type": "application/json", "Retry-After": "5" } }
      );
    }

    // 네가 달라는 대로 421로 넣어뒀어. 근데 실무용은 아래 421만 404로 바꾸면 돼
    return new Response("421 Misdirected Request.", { status: 421 });
  }
}