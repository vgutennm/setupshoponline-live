import { cpSync, rmSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createServer } from "../artifacts/website/node_modules/vite/dist/node/index.js";

rmSync("dist", { recursive: true, force: true });
cpSync("artifacts/website/dist/public", "dist/client", { recursive: true });

// Generate route-specific head tags for link previews and crawlers that do not run JavaScript.
const metadata = JSON.parse(readFileSync("artifacts/website/src/lib/page-metadata.json", "utf8"));
const faqs = JSON.parse(readFileSync("artifacts/website/src/lib/faqs.json", "utf8"));
const server = await createServer({
  configFile: resolve("artifacts/website/vite.config.ts"),
  server: { middlewareMode: true, watch: null, hmr: false },
  appType: "custom",
  optimizeDeps: { noDiscovery: true, include: [] },
});
try {
  const search = await server.ssrLoadModule("/src/lib/search-data.ts");
  const { renderPage } = await server.ssrLoadModule("/src/entry-prerender.tsx");
  const template = readFileSync("dist/client/index.html", "utf8")
    .replace(/<title[^>]*>[\s\S]*?<\/title>/g, "")
    .replace(/<meta\b[^>]*(?:name="(?:description|robots|twitter:[^"]+)"|property="og:[^"]+")[^>]*>/g, "")
    .replace(/<link\b[^>]*rel="canonical"[^>]*>/g, "")
    .replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g, "");
  const escape = text => text.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const origin = "https://setupshoponline.com";
  for (const [route, page] of Object.entries(metadata)) {
    const url = origin + search.canonicalPath(route);
    const schemas = search.getPageSchemas(route);
    const head = [
      '<title data-rh="true">'+escape(page.title)+'</title>',
      '<meta data-rh="true" name="description" content="'+escape(page.description)+'" />',
      '<meta data-rh="true" name="robots" content="'+(page.noindex ? "noindex, follow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1")+'" />',
      '<link data-rh="true" rel="canonical" href="'+url+'" />',
      ...Object.entries({"og:type":"website","og:site_name":"Set Up Shop Online","og:title":page.title,"og:description":page.description,"og:url":url,"og:image":origin+"/opengraph.jpg?v=canonical20261018opt","og:image:alt":"Set Up Shop Online business and AI consulting"}).map(([key,value])=>'<meta data-rh="true" property="'+key+'" content="'+escape(value)+'" />'),
      ...Object.entries({"twitter:card":"summary_large_image","twitter:title":page.title,"twitter:description":page.description,"twitter:image":origin+"/opengraph.jpg?v=canonical20261018opt","twitter:image:alt":"Set Up Shop Online business and AI consulting"}).map(([key,value])=>'<meta data-rh="true" name="'+key+'" content="'+escape(value)+'" />'),
      '<link data-rh="true" rel="alternate" type="text/plain" href="'+origin+'/llms.txt" title="Business and service overview" />',
      '<link data-rh="true" rel="alternate" type="application/ld+json" href="'+origin+'/llms.json" title="Business and service structured data" />',
      ...schemas.map(value=>'<script data-rh="true" type="application/ld+json">'+JSON.stringify(value).replaceAll('<','\\u003c')+'</script>'),
    ].join("\n    ");
    // Flat .html files keep extensionless routes without introducing trailing-slash redirects.
    const output = route === "/" ? "dist/client/index.html" : "dist/client"+route+".html";
    mkdirSync(dirname(output), { recursive: true });
    const body = renderPage(route);
    if (!body.includes("<main")) throw new Error(`Missing rendered content for ${route}`);
    writeFileSync(output, template.replace("</head>", head+"\n  </head>").replace('<div id="root"></div>', '<div id="root">'+body+'</div>'));
  }
  writeFileSync("dist/client/llms.json", JSON.stringify(search.machineReadableGraph, null, 2)+"\n");
  const catalog = JSON.parse(readFileSync("artifacts/website/src/lib/catalog.json", "utf8"));
  const positioning = JSON.parse(readFileSync("artifacts/website/src/lib/approved-positioning.json", "utf8"));
  const fullText = [readFileSync("dist/client/llms.txt", "utf8"), "\n## Products, Services, and Solutions\n",
    ...catalog.flatMap(section => ["## "+section.title, section.intro, ...section.offers.flatMap(offer => [
      "### "+offer.title, origin+"/products-services-solutions#"+offer.id, offer.short, ...offer.expanded,
      ...(offer.best ? ["Best for: "+offer.best] : []), ...offer.value.map(value => "Value to measure: "+value),
      offer.ctaDescription, "Next step: "+(offer.href.startsWith("http") ? offer.href : origin+offer.href), ""
    ])]), "## About Vlad Gutenmakher", ...positioning.why.flatMap(section => [section.heading, ...section.paragraphs])].join("\n\n");
  writeFileSync("dist/client/llms-full.txt", fullText+"\n");
  const urls = Object.entries(metadata).filter(([route,page]) => !page.noindex && search.canonicalPath(route) === route);
  const xmlEscape = value => escape(value).replaceAll("'", "&apos;");
  const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'+urls.map(([route]) =>
    '  <url><loc>'+xmlEscape(origin+route)+'</loc>'+search.pageImages(route).map(image => '<image:image><image:loc>'+xmlEscape(image.contentUrl)+'</image:loc></image:image>').join('')+'</url>'
  ).join('\n')+'\n</urlset>\n';
  writeFileSync("dist/client/sitemap.xml", sitemap);
  // Only runtime assets should be served; the build manifest is internal.
  rmSync("dist/client/.vite", { recursive: true, force: true });
  console.log("Prepared rendered pages, image sitemap, linked schema, and LLM reference files.");
} finally {
  await server.close();
}

await import("./build-workbook-worker.mjs");
