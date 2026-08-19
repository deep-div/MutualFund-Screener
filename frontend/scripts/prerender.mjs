/**
 * Build-time prerenderer.
 *
 * Why: the app is a client-side-rendered SPA, so the HTML served to crawlers
 * (Googlebot / AdSense) is an empty `<div id="root">` shell. This script runs
 * the already-built app in a headless browser, lets it fetch the API and render,
 * then writes the fully-rendered HTML (with per-page <title>/meta/JSON-LD) to
 * disk so nginx's `try_files $uri $uri/ /index.html` serves real content.
 *
 * Flow:
 *   1. `vite preview` serves the built dist/ (SPA fallback + /api proxy).
 *   2. Enumerate routes: static pages + every blog detail page (from the API).
 *   3. Headless Chrome renders each route; capture document HTML.
 *   4. Write each capture to dist/<route>/index.html (home -> dist/index.html).
 *
 * Config via env:
 *   PRERENDER_API_TARGET     API origin the preview proxy forwards /api to
 *                            (default https://fundscreener.online)
 *   PUPPETEER_EXECUTABLE_PATH path to Chromium (set in Docker; omit locally to
 *                            use Puppeteer's bundled browser)
 *   PRERENDER_PORT           preview port (default 4173)
 */
import { preview } from "vite";
import puppeteer from "puppeteer";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = resolve(__dirname, "..", "dist");

const API_TARGET = (process.env.PRERENDER_API_TARGET || "https://fundscreener.online").replace(/\/+$/, "");
const PORT = Number(process.env.PRERENDER_PORT || 4173);
const UA = "Mozilla/5.0 (compatible; FundScreenerPrerender/1.0)";

// Static routes that always exist.
const STATIC_ROUTES = ["/", "/blogs", "/about", "/learn", "/tools", "/privacy", "/terms"];

/** Fetch every published blog and turn it into its detail route. */
async function getBlogRoutes() {
  const routes = [];
  const limit = 50; // API caps limit at 50 (le=50)
  let offset = 0;
  // Paginate until we have them all.
  for (;;) {
    const url = `${API_TARGET}/api/v1/blogs?limit=${limit}&offset=${offset}`;
    const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": UA } });
    if (!res.ok) throw new Error(`Blog list fetch failed: ${res.status} ${res.statusText}`);
    const data = await res.json();
    const items = data.items ?? [];
    for (const b of items) {
      if (b.published_date && b.category && b.slug) {
        routes.push(`/blogs/${b.published_date}/${b.category}/${b.slug}`);
      }
    }
    offset += items.length;
    if (!items.length || offset >= (data.total ?? offset)) break;
  }
  return routes;
}

// Canonical site origin for sitemap URLs (non-www apex; matches robots.txt and
// the served host). Override with PRERENDER_SITE_URL if the domain changes.
const SITE_URL = (process.env.PRERENDER_SITE_URL || "https://fundscreener.online").replace(/\/+$/, "");

/** Per-route sitemap hints; falls back to weekly/0.7 for anything unlisted. */
function sitemapHints(route) {
  if (route === "/") return { changefreq: "daily", priority: "1.0" };
  if (route === "/blogs") return { changefreq: "daily", priority: "0.95" };
  if (route.startsWith("/blogs/")) return { changefreq: "monthly", priority: "0.8" };
  if (route === "/learn" || route === "/tools") return { changefreq: "weekly", priority: "0.9" };
  if (route === "/about") return { changefreq: "monthly", priority: "0.8" };
  if (route === "/privacy" || route === "/terms") return { changefreq: "yearly", priority: "0.6" };
  return { changefreq: "weekly", priority: "0.7" };
}

/** Build sitemap.xml covering every prerendered route. */
async function writeSitemap(routes) {
  const today = new Date().toISOString().slice(0, 10);
  const entries = routes
    .map((route) => {
      const loc = `${SITE_URL}${route === "/" ? "/" : route}`;
      const { changefreq, priority } = sitemapHints(route);
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
  await writeFile(join(DIST_DIR, "sitemap.xml"), xml, "utf8");
  console.log(`[prerender] sitemap.xml written (${routes.length} urls)`);
}

/** Map a route to its output file path inside dist/. */
function routeToFile(route) {
  if (route === "/") return join(DIST_DIR, "index.html");
  const clean = route.replace(/^\/+|\/+$/g, "");
  return join(DIST_DIR, clean, "index.html");
}

async function main() {
  process.env.PRERENDER_API_TARGET = API_TARGET; // ensure preview proxy uses it

  console.log(`[prerender] API target: ${API_TARGET}`);
  console.log("[prerender] collecting blog routes…");
  let blogRoutes = [];
  try {
    blogRoutes = await getBlogRoutes();
  } catch (err) {
    console.error(`[prerender] ⚠ could not fetch blog routes (${err.message}); prerendering static pages only`);
  }
  const routes = [...STATIC_ROUTES, ...blogRoutes];
  console.log(`[prerender] ${routes.length} routes (${blogRoutes.length} blogs)`);

  const server = await preview({
    preview: { port: PORT, host: "127.0.0.1", strictPort: true },
  });
  const base = `http://127.0.0.1:${PORT}`;

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  // Capture everything first, THEN write — so the SPA fallback keeps serving the
  // shell (and not a prerendered page) while we render later routes.
  const captures = [];
  let failures = 0;

  for (const route of routes) {
    const page = await browser.newPage();
    await page.setUserAgent(UA);
    try {
      await page.goto(`${base}${route}`, { waitUntil: "networkidle2", timeout: 45000 });
      // Wait until the React tree has rendered real text (not a loading skeleton).
      await page
        .waitForFunction(
          () => {
            const r = document.getElementById("root");
            const txt = r ? (r.innerText || "").replace(/\s+/g, " ").trim() : "";
            return txt.length > 400;
          },
          { timeout: 20000 }
        )
        .catch(() => console.warn(`[prerender]   ⚠ thin content, capturing anyway: ${route}`));

      const html = await page.content();
      captures.push({ route, html });
      console.log(`[prerender]   ✓ ${route} (${html.length} bytes)`);
    } catch (err) {
      failures++;
      console.error(`[prerender]   ✗ ${route}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  for (const { route, html } of captures) {
    const file = routeToFile(route);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, html, "utf8");
  }

  await browser.close();
  await server.httpServer.close();

  // Regenerate sitemap.xml from the same route list so it always lists every
  // prerendered page (including each blog) instead of a hand-maintained subset.
  await writeSitemap(routes);

  console.log(`[prerender] done: ${captures.length} written, ${failures} failed`);
  if (captures.length === 0 || failures === routes.length) process.exit(1);
}

main().catch((err) => {
  console.error("[prerender] fatal:", err);
  process.exit(1);
});
