export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const slug = url.pathname.replace(/^\//, "").split("/")[0].toLowerCase();

    // Serve files that exist in the Pages assets before treating the path as a redirect slug.
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) {
      return asset;
    }

    // / 는 메인 (지금은 빈 페이지)
    if (!slug) {
      return asset;
    }

    if (slug === "favicon.ico" || slug === "robots.txt" || slug === "sitemap.xml") {
      return asset;
    }

    try {
      const dest = await env.REDIRECTS.get(slug);
      if (dest) {
        return Response.redirect(dest, 301);
      }
    } catch (e) {
      return new Response("KV REDIRECTS 바인딩 확인", { status: 500 });
    }

    // 알 수 없는 단축 주소는 이미지가 포함된 421 페이지를 반환
    const page = await env.ASSETS.fetch(
      new Request(new URL("/421.html", request.url), { method: "GET" })
    );
    return new Response(page.body, {
      status: 421,
      headers: page.headers,
    });
  }
}
