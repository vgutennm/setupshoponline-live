import { useLocation } from "wouter";
import { getPageSchemas, canonicalPath } from "@/lib/search-data";
import metadata from "@/lib/page-metadata.json";
import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
  schema?: Record<string, any>;
  schemas?: Record<string, any>[];
  noindex?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  twitterTitle?: string;
  twitterDescription?: string;
}

export function SEO({
  title = metadata["/"].title,
  description = metadata["/"].description,
  image = "/opengraph.jpg?v=canonical20261018opt",
  url,
  type = "website",
  schema,
  schemas,
  noindex = false,
  ogTitle,
  ogDescription,
  twitterTitle,
  twitterDescription,
}: SEOProps) {
  const [location] = useLocation();
  const requestedUrl = url || location;
  const route = requestedUrl.startsWith("http") ? new URL(requestedUrl).pathname : requestedUrl;
  const fullUrl = `https://setupshoponline.com${canonicalPath(route)}`;
  const fullImage = image.startsWith("http") ? image : `https://setupshoponline.com${image}`;
  const candidates = [...getPageSchemas(route), ...(schemas || []), ...(schema ? [schema] : [])];
  const seen = new Set<string>();
  const allSchemas = candidates.filter(s => { const key = s["@id"] || s["@type"]; if (seen.has(key)) return false; seen.add(key); return true; });
  const finalOgTitle = ogTitle ?? title;
  const finalOgDescription = ogDescription ?? description;
  const finalTwTitle = twitterTitle ?? ogTitle ?? title;
  const finalTwDescription = twitterDescription ?? ogDescription ?? description;

  // Static builds write one canonical metadata set into the document head.
  if (typeof window === "undefined") return null;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta
        name="robots"
        content={noindex ? "noindex, follow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"}
      />

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Set Up Shop Online" />
      <meta property="og:title" content={finalOgTitle} />
      <meta property="og:description" content={finalOgDescription} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:image:alt" content="Set Up Shop Online business and AI consulting" />
      <meta property="og:url" content={fullUrl} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTwTitle} />
      <meta name="twitter:description" content={finalTwDescription} />
      <meta name="twitter:image" content={fullImage} />
      <meta name="twitter:image:alt" content="Set Up Shop Online business and AI consulting" />

      <link rel="canonical" href={fullUrl} />
      <link rel="alternate" type="text/plain" href="https://setupshoponline.com/llms.txt" title="Business and service overview" />
      <link rel="alternate" type="application/ld+json" href="https://setupshoponline.com/llms.json" title="Business and service structured data" />

      {allSchemas.map((s, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(s)}</script>
      ))}
    </Helmet>
  );
}
