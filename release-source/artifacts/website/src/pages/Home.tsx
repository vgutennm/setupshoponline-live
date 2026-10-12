import { PositioningSections } from "@/components/positioning-sections";
import { OfferingJourney } from "@/components/offering-journey";
import metadata from "@/lib/page-metadata.json";
import { homepageFaqs } from "@/lib/faqs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { siteConfig } from "@/lib/site-config";
import { useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import {
  organizationSchema,
  strategyCallSchema,
  websiteSchema,
  localBusinessSchema,
  webPageSchema,
  faqPageSchema,
  professionalServiceSchema,
  MAIN_SERVICE_DESCRIPTION,
} from "@/lib/schema";
import { GoogleTrustSection } from "@/components/google-trust-section";
const heroImage = "/images/business-growth-consulting.webp";

const HOME_SEO_TITLE = metadata["/"].title;
const HOME_SEO_DESCRIPTION =
  metadata["/"].description;

export default function Home() {
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, []);

  const homeWebPage = webPageSchema({
    url: "/",
    name: HOME_SEO_TITLE,
    description: HOME_SEO_DESCRIPTION,
  });
  const homeFaqSchema = faqPageSchema(homepageFaqs);
  const homeServiceSchema = professionalServiceSchema({
    name: "AI Consulting for Service Businesses",
    description: MAIN_SERVICE_DESCRIPTION,
    url: "/",
  });

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
      <SEO
        title={HOME_SEO_TITLE}
        description={HOME_SEO_DESCRIPTION}
        ogTitle={HOME_SEO_TITLE}
        ogDescription={HOME_SEO_DESCRIPTION}
        twitterTitle={HOME_SEO_TITLE}
        twitterDescription={HOME_SEO_DESCRIPTION}
        url="/"
        schemas={[
          organizationSchema,
          websiteSchema,
          localBusinessSchema,
          homeWebPage,
          homeFaqSchema,
          homeServiceSchema,
          strategyCallSchema,
        ]}
      />
      <Navbar />

      <main className="pt-16 pb-24 md:pb-0">
        {/* HERO SECTION */}
        <section className="relative w-full pt-6 pb-6 px-4 bg-slate-50">
          <div className="container mx-auto max-w-7xl">
          {/* MOBILE HERO: photo above the offer */}
          <div className="md:hidden flex flex-col bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl border border-border/50 overflow-hidden">
            <figure className="m-0">
              <img
                src={heroImage}
                alt="Illustration of business leaders reviewing a dashboard in an office overlooking mountains"
                title="Handle More Business. Keep More of the Upside. | Set Up Shop Online"
                width={1916}
                height={821}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="block w-full h-[340px] object-cover object-right"
              />
            </figure>
            <div className="p-5 space-y-3">
              <div className="inline-flex max-w-full items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-xs font-semibold shadow-md shadow-primary/30">
                <span aria-hidden="true" className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
                </span>
                <span className="min-w-0">Profitable Growth for Established Service Businesses</span>
              </div>
              <p role="heading" aria-level={1} className="text-[1.7rem] font-bold tracking-tight leading-[1.15] text-foreground">
                Handle More Business. Keep More of the Upside.
              </p>
              <p className="text-base text-muted-foreground leading-relaxed">
                I help established service businesses remove the operational constraints that make growth expensive, so they can increase capacity, protect margins, and reduce dependence on the owner.
              </p>
              <p className="text-base text-muted-foreground leading-relaxed">
                We start with how your business works. Then we determine where better processes, connected systems, automation, AI, or agentic systems can make a meaningful difference.
              </p>
              <div className="flex flex-col gap-3">
                <Button asChild size="lg" className="w-full min-h-14 h-auto whitespace-normal px-3 py-3.5 text-sm font-semibold bg-orange-700 hover:bg-orange-800 text-white border-0 shadow-xl shadow-orange-700/20">
                  <a href="/free-agentic-readiness-assessment">Free Agentic Readiness Report</a>
                </Button>
              </div>
              <a href={siteConfig.calendlyUrl} className="block mt-4 text-base font-semibold underline">Book a 15-Minute Intro</a><a href="#how-i-help" className="block mt-3 text-sm underline">Explore How I Help</a>
              <p className="text-sm text-muted-foreground">
                Answer ten questions for your free report, or book a 15 minute intro.
              </p>
            </div>
          </div>

          {/* DESKTOP HERO: full-width image with overlay text on dark left side */}
          <div className="hidden md:block relative w-full bg-foreground min-h-[600px] rounded-3xl overflow-hidden shadow-xl border border-border/50">
            <img
              src={heroImage}
              alt="Illustration of business leaders reviewing a dashboard in an office overlooking mountains"
              title="Handle More Business. Keep More of the Upside. | Set Up Shop Online"
              width={1916}
              height={821}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="absolute inset-0 w-full h-full object-cover object-right"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-transparent" />

            <div className="relative z-10 container mx-auto px-4 py-16 flex items-center min-h-[600px]">
              <div className="max-w-2xl text-white">
                <div className="inline-flex max-w-full items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold mb-6 shadow-lg shadow-primary/30">
                  <span aria-hidden="true" className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
                  </span>
                  <span className="min-w-0">Profitable Growth for Established Service Businesses</span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-[1.12] mb-5 drop-shadow-lg">
                  Handle More Business. Keep More of the Upside.
                </h1>
                <p className="text-base text-white/85 leading-relaxed mb-4 max-w-xl drop-shadow">
                  I help established service businesses remove the operational constraints that make growth expensive, so they can increase capacity, protect margins, and reduce dependence on the owner.
                </p>
                <p className="text-base text-white/85 leading-relaxed mb-4 max-w-xl drop-shadow">
                  We start with how your business works. Then we determine where better processes, connected systems, automation, AI, or agentic systems can make a meaningful difference.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg" className="min-h-14 h-auto w-full sm:w-auto whitespace-normal px-6 py-3.5 text-base font-semibold bg-orange-700 hover:bg-orange-800 text-white border-0 shadow-xl shadow-orange-700/20">
                    <a href="/free-agentic-readiness-assessment">Free Agentic Readiness Report</a>
                  </Button>
                </div>
                <a href={siteConfig.calendlyUrl} className="inline-block mt-5 text-base font-semibold underline text-white">Book a 15-Minute Intro</a><a href="#how-i-help" className="block mt-3 text-sm underline text-white">Explore How I Help</a>
                <p className="mt-4 text-sm text-white/70 drop-shadow">
                  Answer ten questions for your free report, or book a 15 minute intro.
                </p>
              </div>
            </div>
          </div>
          </div>
        </section>

        <section id="our-mission" aria-labelledby="mission-heading" className="bg-white px-5 py-16 sm:px-6 md:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
              <div>
                <p className="mb-5 text-sm font-bold uppercase tracking-[0.18em] text-blue-700">Our mission</p>
                <h2 id="mission-heading" className="max-w-2xl text-3xl font-bold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                  Our mission is to give humans back their time <span className="text-blue-700">to be human.</span>
                </h2>
              </div>
              <p className="border-l-4 border-amber-500 pl-6 text-lg leading-relaxed text-slate-600 sm:text-xl">
                We eliminate the repetitive, low-value work people should not be doing so they can accomplish more in less time, focus on work they love, and spend more of their lives being human.
              </p>
            </div>

          </div>
        </section>

        <PositioningSections kind="home" />

        {/* GOOGLE TRUST / REVIEWS */}
        <GoogleTrustSection />

        {/* FAQ */}
        <section id="faq" className="py-6 md:py-8 px-4 scroll-mt-32">
          <div className="container mx-auto max-w-6xl">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl border border-border/50 p-6 md:p-10">
              <div className="text-center mb-8 space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Questions About the Intro Call</h2>
              </div>

              <Accordion type="single" collapsible className="w-full">
                {homepageFaqs.map((faq, i) => (
                  <AccordionItem key={i} value={`item-${i}`}>
                    <AccordionTrigger className="text-left text-lg font-medium">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed text-base">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
