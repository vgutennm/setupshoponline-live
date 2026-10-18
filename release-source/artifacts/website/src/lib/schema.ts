import { siteConfig } from "./site-config";

const SITE_URL = siteConfig.url;
const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const LOCALBIZ_ID = `${SITE_URL}/#localbusiness`;

const ORG_DESCRIPTION = "Set Up Shop Online helps established service businesses handle more work profitably. Vlad Gutenmakher connects business priorities, workflows, information, and technology to create more capacity and reduce dependence on the owner.";

const ORG_SLOGAN = "Handle More Business. Keep More of the Upside.";

export const MAIN_SERVICE_DESCRIPTION = "Business diagnosis, solution architecture, implementation guidance, and ongoing improvement. AI and agentic systems are used where they create meaningful business value.";

const POSITIONING_KEYWORDS = [
  "AI consulting for service businesses",
  "business-first AI strategy",
  "AI opportunity assessment",
  "business process improvement",
  "AI solution architecture",
  "AI implementation",
  "AI training and adoption",
  "AI value measurement",
  "workflow automation",
  "business systems integration"
];

const SERVICE_TYPES = [
  "AI Consulting for Service Businesses",
  "AI Strategy and Opportunity Assessment",
  "Business Process Improvement",
  "Solution Architecture and Implementation",
  "AI Training and Adoption Support",
  "Business Value Measurement",
  "Workflow Automation",
  "Business Systems Integration"
];

const postalAddress = {
  "@type": "PostalAddress" as const,
  streetAddress: siteConfig.address.street,
  addressLocality: siteConfig.address.city,
  addressRegion: siteConfig.address.state,
  postalCode: siteConfig.address.zip,
  addressCountry: siteConfig.address.country,
};

const sameAs = [
  siteConfig.googleProfileUrl,
  siteConfig.social.facebook,
  siteConfig.social.instagram,
  siteConfig.social.youtube,
  siteConfig.social.linkedin,
];

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORG_ID,
  name: siteConfig.name,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png?v=canonical20261018opt`,
  image: `${SITE_URL}/opengraph.jpg?v=canonical20261018opt`,
  email: siteConfig.email,
  telephone: siteConfig.phoneFull,
  description: ORG_DESCRIPTION,
  slogan: ORG_SLOGAN,
  knowsAbout: POSITIONING_KEYWORDS,
  areaServed: { "@type": "Country", name: "United States" },
  address: postalAddress,
  founder: { "@id": `${SITE_URL}#person-vlad-gutenmakher`, "@type": "Person", name: "Vlad Gutenmakher" },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: siteConfig.phoneFull,
    email: siteConfig.email,
    contactType: "sales",
    areaServed: "US",
    availableLanguage: ["English"],
  },
  sameAs,
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: SITE_URL,
  name: siteConfig.name,
  description: ORG_DESCRIPTION,
  publisher: { "@id": ORG_ID },
  inLanguage: "en-US",
};

export const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": LOCALBIZ_ID,
  name: siteConfig.name,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png?v=canonical20261018opt`,
  image: `${SITE_URL}/opengraph.jpg?v=canonical20261018opt`,
  telephone: siteConfig.phoneFull,
  email: siteConfig.email,
  address: postalAddress,
  geo: { "@type": "GeoCoordinates", latitude: 40.987, longitude: -75.249366 },
  description:
    "Business diagnosis, solution architecture, and implementation guidance for established service businesses. Start with the free assessment or a 15-minute intro.",
  slogan: ORG_SLOGAN,
  serviceType: SERVICE_TYPES,
  knowsAbout: POSITIONING_KEYWORDS,
  areaServed: "United States",
  parentOrganization: { "@id": ORG_ID },
  sameAs,
};

export function webPageSchema(opts: {
  url: string;
  name: string;
  description: string;
  primaryImage?: string;
  about?: string[];
  isPartOfWebsite?: boolean;
}) {
  const fullUrl = opts.url.startsWith("http") ? opts.url : `${SITE_URL}${opts.url}`;
  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${fullUrl}#webpage`,
    url: fullUrl,
    name: opts.name,
    description: opts.description,
    isPartOf: { "@id": WEBSITE_ID },
    about: (opts.about || POSITIONING_KEYWORDS).map((a) => ({ "@type": "Thing", name: a })),
    inLanguage: "en-US",
  };
  if (opts.primaryImage) {
    schema.primaryImageOfPage = {
      "@type": "ImageObject",
      url: opts.primaryImage.startsWith("http") ? opts.primaryImage : `${SITE_URL}${opts.primaryImage}`,
    };
  }
  return schema;
}

export function faqPageSchema(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export type ServiceItem = { name: string; description: string };

export function servicesItemListSchema(items: ServiceItem[], pageUrl: string) {
  const fullUrl = pageUrl.startsWith("http") ? pageUrl : `${SITE_URL}${pageUrl}`;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${fullUrl}#services`,
    name: "Set Up Shop Online Services",
    itemListElement: items.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Service",
        name: s.name,
        description: s.description,
        provider: { "@id": ORG_ID },
        areaServed: "United States",
        serviceType: s.name,
      },
    })),
  };
}

export function professionalServiceSchema(opts: { name: string; description: string; url: string }) {
  const fullUrl = opts.url.startsWith("http") ? opts.url : `${SITE_URL}${opts.url}`;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: opts.name,
    description: opts.description,
    provider: { "@id": ORG_ID },
    areaServed: "United States",
    url: fullUrl,
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url.startsWith("http") ? it.url : `${SITE_URL}${it.url}`,
    })),
  };
}

export function collectionPageSchema(opts: {
  url: string;
  name: string;
  description: string;
  items: { name: string; url: string; description?: string }[];
}) {
  const fullUrl = opts.url.startsWith("http") ? opts.url : `${SITE_URL}${opts.url}`;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${fullUrl}#webpage`,
    url: fullUrl,
    name: opts.name,
    description: opts.description,
    isPartOf: { "@id": WEBSITE_ID },
    inLanguage: "en-US",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: opts.items.map((it, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: it.url.startsWith("http") ? it.url : `${SITE_URL}${it.url}`,
        name: it.name,
      })),
    },
  };
}

export function articleSchema(opts: {
  url: string;
  headline: string;
  description: string;
  image?: string;
  about?: string[];
  articleSection?: string;
  client?: { name: string; url: string; sameAs?: string[] };
}) {
  const fullUrl = opts.url.startsWith("http") ? opts.url : `${SITE_URL}${opts.url}`;
  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${fullUrl}#article`,
    headline: opts.headline,
    description: opts.description,
    mainEntityOfPage: { "@type": "WebPage", "@id": fullUrl },
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORG_ID },
    author: { "@id": ORG_ID },
    inLanguage: "en-US",
  };
  const clientEntity = opts.client
    ? {
        "@type": "Organization",
        "@id": `${opts.client.url}#organization`,
        name: opts.client.name,
        url: opts.client.url,
        ...(opts.client.sameAs && opts.client.sameAs.length ? { sameAs: opts.client.sameAs } : {}),
      }
    : null;
  if (clientEntity || (opts.about && opts.about.length)) {
    schema.about = [
      ...(clientEntity ? [clientEntity] : []),
      { "@id": ORG_ID },
      ...((opts.about || []).map((a) => ({ "@type": "Thing", name: a }))),
    ];
  }
  if (clientEntity) {
    schema.mentions = [clientEntity];
  }
  if (opts.articleSection) schema.articleSection = opts.articleSection;
  if (opts.image) schema.image = opts.image.startsWith("http") ? opts.image : `${SITE_URL}${opts.image}`;
  return schema;
}

export function aboutPageSchema(opts: { url: string; name: string; description: string }) {
  const fullUrl = opts.url.startsWith("http") ? opts.url : `${SITE_URL}${opts.url}`;
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${fullUrl}#webpage`,
    url: fullUrl,
    name: opts.name,
    description: opts.description,
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORG_ID },
    inLanguage: "en-US",
  };
}

export function processItemListSchema(opts: {
  pageUrl: string;
  name: string;
  steps: { name: string; description: string }[];
}) {
  const fullUrl = opts.pageUrl.startsWith("http") ? opts.pageUrl : `${SITE_URL}${opts.pageUrl}`;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${fullUrl}#process`,
    name: opts.name,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: opts.steps.length,
    itemListElement: opts.steps.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: s.name,
      description: s.description,
    })),
  };
}

export function personSchema(opts: {
  name: string;
  jobTitle: string;
  description: string;
  url?: string;
  sameAs?: string[];
}) {
  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE_URL}#person-${opts.name.toLowerCase().replace(/\s+/g, "-")}`,
    name: opts.name,
    jobTitle: opts.jobTitle,
    description: opts.description,
    worksFor: { "@id": ORG_ID },
  };
  if (opts.url) schema.url = opts.url;
  if (opts.sameAs && opts.sameAs.length) schema.sameAs = opts.sameAs;
  return schema;
}

export function contactPageSchema(opts: { url: string; name: string; description: string }) {
  const fullUrl = opts.url.startsWith("http") ? opts.url : `${SITE_URL}${opts.url}`;
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "@id": `${fullUrl}#webpage`,
    url: fullUrl,
    name: opts.name,
    description: opts.description,
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORG_ID },
    mainEntity: { "@id": ORG_ID },
    inLanguage: "en-US",
  };
}

export const strategyCallSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": siteConfig.url + "/book-a-call#ai-strategy-call",
  name: "15-Minute Intro",
  description: "A 15-minute introductory call with Vlad Gutenmakher to share your business priority, ask questions, discuss fit, and identify an appropriate next step.",
  provider: { "@id": ORG_ID },
  url: siteConfig.url + "/book-a-call",
};

export const vladPersonSchema = personSchema({
  name: "Vlad Gutenmakher",
  jobTitle: "AI Consultant and Value Architect",
  description: "AI Consultant and Value Architect with more than 35 years across technology, engineering, solution architecture, technical sales, consulting, and implementation, plus approximately 20 years of entrepreneurship. Helps established service businesses handle more work profitably.",
  url: `${SITE_URL}/why-setupshoponline`,
  sameAs: ["https://www.linkedin.com/in/vladg/"],
});
