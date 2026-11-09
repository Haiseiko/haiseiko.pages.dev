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
        return Response.redirect(dest, 303);
      }
    } catch (e) {
      return new Response("KV REDIRECTS 바인딩 확인", { status: 500 });
    }

    return new Response("not found", { status: 404 });
  }
}
