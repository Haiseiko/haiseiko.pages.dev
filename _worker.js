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
      return new Response("523 Origin Is Unreachable.Check KV.", { status: 523 });
    }

    return new Response("418 I'm a teapot.", { status: 418 });
  }
}
