import catalog from "./catalog.json";
import images from "./image-metadata.json";
import metadata from "./page-metadata.json";
import faqs from "./faqs.json";
import buyerFaqs from "./buyer-faqs.json";
import { siteConfig } from "./site-config";
import { organizationSchema, websiteSchema, localBusinessSchema, vladPersonSchema, strategyCallSchema, webPageSchema, aboutPageSchema, contactPageSchema, breadcrumbSchema, faqPageSchema } from "./schema";

export const origin = siteConfig.url;
const catalogUrl = `${origin}/products-services-solutions`;
export const imageObject = (image: { src: string; alt: string; description: string; width?: number; height?: number }) => ({
  "@type": "ImageObject", "@id": `${image.src.startsWith("http") ? image.src : origin + image.src}#image`,
  contentUrl: image.src.startsWith("http") ? image.src : origin + image.src,
  name: image.alt, caption: image.alt, description: image.description,
  ...(image.width ? { width: image.width, height: image.height } : {}),
  inLanguage: "en-US",
});

export const offerImages = catalog.flatMap(section => section.offers.map(offer => imageObject({
  src: `/images/offerings/${offer.id}.webp`, alt: offer.imageAlt,
  description: offer.imageDescription, width: 1536, height: 1024,
})));
export const catalogSchema = {
  "@context": "https://schema.org", "@type": "OfferCatalog", "@id": `${catalogUrl}#catalog`,
  name: "Set Up Shop Online Products, Services, and Solutions", url: catalogUrl,
  itemListElement: catalog.map(section => ({
    "@type": "OfferCatalog", "@id": `${catalogUrl}#${section.id}-catalog`,
    name: section.title, description: section.intro, url: `${catalogUrl}#${section.id}`,
    itemListElement: section.offers.map(offer => ({
      "@type": "Offer", "@id": `${catalogUrl}#${offer.id}-offer`, url: offer.href.startsWith("http") ? offer.href : origin + offer.href,
      ...(["workbook", "agentic-readiness"].includes(offer.id) ? { price: "0", priceCurrency: "USD" } : {}),
      itemOffered: {
        "@type": "Service", "@id": `${catalogUrl}#${offer.id}`, name: offer.title.split(":")[0],
        description: [offer.short, ...offer.expanded].join(" "), url: `${catalogUrl}#${offer.id}`,
        provider: { "@id": `${origin}/#organization` }, areaServed: "United States",
        serviceType: offer.title.split(":")[0], image: imageObject({ src: `/images/offerings/${offer.id}.webp`, alt: offer.imageAlt, description: offer.imageDescription, width: 1536, height: 1024 }),
      },
    })),
  })),
};

const imageKeys: Record<string, (keyof typeof images)[]> = {
  "/": ["hero", "portrait"],
  "/products-services-solutions": ["journey", "architecture"],
  "/why-setupshoponline": ["portrait"],
  "/contact-us": ["contact", "portrait"],
  "/book-a-call": ["portrait"],
  "/free-business-strategy": ["assessment"],
  "/free-agentic-readiness-assessment": ["agentic"],
  "/free-workbook": ["assessment"],
};
export function pageImages(route: string) {
  const items = [...(imageKeys[route] || []), "wordmark", "logo", "partner", "reviewQr"] as (keyof typeof images)[];
  return [...items.map(key => imageObject(images[key])), ...(route === "/products-services-solutions" ? offerImages : [])];
}
export function canonicalPath(route: string) {
  const data = (metadata as Record<string, { canonical?: string }>)[route];
  return data?.canonical || route;
}
export function getPageSchemas(route: string): Record<string, any>[] {
  const page = (metadata as Record<string, { title: string; description: string; noindex?: boolean }>)[route];
  if (!page || page.noindex) return [];
  const canonical = canonicalPath(route);
  const makePage = route === "/why-setupshoponline" ? aboutPageSchema : route === "/contact-us" ? contactPageSchema : webPageSchema;
  const pageNode: Record<string, any> = makePage({ url: canonical, name: page.title, description: page.description });
  const imgs = pageImages(route);
  pageNode.image = imgs.map(image => ({ "@id": image["@id"] }));
  if (imageKeys[route]?.length) pageNode.primaryImageOfPage = { "@id": imgs[0]["@id"] };
  if (route === "/products-services-solutions") {
    pageNode["@type"] = "CollectionPage";
    pageNode.mainEntity = { "@id": catalogSchema["@id"] };
  }
  const graph: Record<string, any>[] = [organizationSchema, websiteSchema, pageNode, ...imgs.map(image => ({ "@context": "https://schema.org", ...image }))];
  if (route !== "/") graph.push(breadcrumbSchema([{ name: "Home", url: "/" }, { name: page.title.split(" | ")[0], url: canonical }]));
  if (["/", "/why-setupshoponline", "/contact-us", "/book-a-call"].includes(route)) graph.push(vladPersonSchema, localBusinessSchema);
  if (["/", "/book-a-call"].includes(route)) graph.push(strategyCallSchema);
  if (route === "/") graph.push(faqPageSchema(faqs));
  if (route === "/products-services-solutions") graph.push(catalogSchema, faqPageSchema(buyerFaqs));
  return graph;
}
export const machineReadableGraph = {
  "@context": "https://schema.org",
  "@graph": [organizationSchema, websiteSchema, localBusinessSchema, vladPersonSchema, strategyCallSchema, catalogSchema, ...Object.values(images).map(imageObject), ...offerImages]
    .map(({ "@context": _context, ...node }: Record<string, any>) => node)
    .filter((node, index, nodes) => !node["@id"] || nodes.findIndex(other => other["@id"] === node["@id"]) === index),
};
