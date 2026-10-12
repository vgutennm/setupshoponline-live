import { siteConfig } from "@/lib/site-config";
import { SolutionArchitecture } from "@/components/solution-architecture";
import { OfferingJourney } from "@/components/offering-journey";
import { Fragment } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import buyerFaqs from "@/lib/buyer-faqs.json";
import catalog from "@/lib/catalog.json";
import metadata from "@/lib/page-metadata.json";
import "./catalog.css";

const route = "/products-services-solutions";
const booking = siteConfig.agenticAssessmentUrl;
const introBooking = "https://calendly.com/meet_with_setupshoponline/15-minute-intro";
function Action({ href, children, secondary = false }: { href: string; children: React.ReactNode; secondary?: boolean }) {
  return <Button asChild variant={secondary ? "outline" : "default"} className="h-auto min-h-12 whitespace-normal text-base px-6 py-3 text-center leading-relaxed"><a href={href}>{children}</a></Button>;
}
export default function ProductsServicesSolutions() {
  return <div className="min-h-screen bg-background font-sans">
    <SEO {...metadata[route]} url={route} />
    <Navbar />
    <main className="catalog pt-16">
      <header className="catalog-hero" aria-labelledby="offering-title">
        <div className="catalog-hero-copy">
          <p className="catalog-eyebrow">Products, Services &amp; Solutions</p>
          <h1 id="offering-title">Strategy first.<br />Implementation second.<br /><span>Results always.</span></h1>
          <p className="catalog-hero-description">Turn business challenges into measurable improvements. We help you find the right opportunity, build the right solution, and put it to work.</p>
          <nav aria-label="Explore our offerings" className="catalog-hero-nav">
            {catalog.map(section => <a key={section.id} href={`#${section.id}`}>{section.title}<span aria-hidden="true">↓</span></a>)}
          </nav>
          <p className="catalog-hero-note">Vendor-neutral guidance. Your business goals come first.</p>
        </div>
        <div className="catalog-hero-visual"><OfferingJourney hero /></div>
      </header>
      <section className="catalog-architecture" aria-labelledby="architecture-title">
        <div className="catalog-architecture-inner">
          <div className="catalog-architecture-copy">
            <p className="catalog-eyebrow">Built around your business</p>
            <h2 id="architecture-title">The right pieces.<br />Working together.</h2>
            <p>Connect your people, processes, technology, and data around the results that matter. From strategy and solution design to implementation and adoption, we support the complete journey.</p>
            <p>Not sure where to begin? Book a 15 minute intro call to share your goals, ask questions, and discuss the right next step. Select Get Started to choose a time.</p>
            <a href={introBooking} className="catalog-framework-link">Get Started</a>
          </div>
          <div className="catalog-architecture-visual"><SolutionArchitecture /><p className="catalog-image-hint">Select the diagram to explore the details</p></div>
        </div>
      </section>
      {catalog.map(section => <section key={section.id} className={`catalog-section catalog-${section.id}`} aria-labelledby={section.id}>
        <div className="container mx-auto max-w-6xl px-6 py-14 md:py-20">
          <div className="catalog-section-heading border-b border-slate-300 pb-8 mb-3">
            <h2 id={section.id} tabIndex={-1} className="text-4xl md:text-5xl font-bold">{section.title}</h2>
            <p className="text-lg md:text-xl mt-4 max-w-3xl leading-relaxed text-slate-600">{section.intro}</p>
          </div>
          {section.offers.map((offer, offerIndex) => <Fragment key={offer.id}>
            {offer.group && <h3 className="mt-12 mb-2 rounded-lg bg-slate-900 px-6 py-4 text-xl md:text-2xl font-semibold text-white">{offer.group}</h3>}
            <article aria-labelledby={offer.id} className="catalog-offer py-10 md:py-14 border-b border-slate-200 last:border-0">
              <div className="grid lg:grid-cols-[1fr_1.55fr] gap-7 lg:gap-12">
                <div>
                  <h4 id={offer.id} tabIndex={-1} className="text-2xl md:text-3xl font-bold leading-snug">{offer.title}</h4>
                  <p className="mt-5 text-lg leading-relaxed text-slate-600">{offer.short}</p>
                  <figure className="mt-7"><img
                    src={`/images/offerings/${offer.id}.webp`}
                    alt={offer.imageAlt}
                    aria-describedby={`${offer.id}-image-description`}
                    width={1536}
                    height={1024}
                    loading="lazy"
                    decoding="async"
                    className="block h-auto w-full rounded-xl border border-slate-200 shadow-sm"
                  /><figcaption id={`${offer.id}-image-description`} className="mt-3 text-sm leading-relaxed text-slate-600">{offer.imageDescription}</figcaption></figure>
                </div>
                <div className="min-w-0">
                  <div className="space-y-5 text-base leading-relaxed text-slate-700">
                    {offer.expanded.map((p, i) => ["Internal Business Brain", "Marketplace Knowledge Product"].includes(p) ? <h5 key={i} className="text-xl font-bold text-slate-950 pt-3">{p}</h5> : <p key={i}>{p}</p>)}
                  </div>
                  {offer.best && <dl className="catalog-measures mt-7 border-l-4 border-blue-600 pl-5 space-y-5">
                    <div><dt className="font-semibold text-slate-950 mb-1">Best for</dt><dd className="text-base leading-relaxed text-slate-600">{offer.best}</dd></div>
                    <div><dt className="font-semibold text-slate-950 mb-1">Value to measure</dt><dd className="text-base leading-relaxed text-slate-600 space-y-3">{offer.value.map(p => <p key={p}>{p}</p>)}</dd></div>
                  </dl>}
                  {offer.href && <div className="mt-7"><p className="mb-4 text-base leading-relaxed text-slate-600">{offer.ctaDescription}</p><Action href={offer.href}>{offer.button}</Action></div>}
                  {offer.related.length > 0 && <nav aria-label={`Related next steps for ${offer.title.split(":")[0]}`} className="mt-7">
                    <p className="font-semibold text-base mb-3">More to Discuss on Your Intro Call</p>
                    <p className="mb-3 text-sm leading-relaxed text-slate-600">Interested in one of these topics? Select a link to book a 15 minute intro call.</p>
                    <ul className="flex flex-wrap gap-x-5 gap-y-3 text-base">{offer.related.map(link => <li key={link.label}><a href={link.href} className="text-blue-700 underline underline-offset-4 hover:text-blue-900">{link.label}</a></li>)}</ul>
                  </nav>}
                </div>
              </div>
            </article>
            {offer.id === "suso-framework" && <aside aria-labelledby="framework-enquiry" className="my-8 p-7 md:p-10 bg-blue-50 border border-blue-200 rounded-2xl">
              <h4 id="framework-enquiry" tabIndex={-1} className="text-2xl md:text-3xl font-bold">Tell Us What You Want to Improve</h4>
              <div className="max-w-3xl space-y-4 my-5 text-base leading-relaxed text-slate-700">
                <p>Your next step is a 15 minute intro call. Share the result you want, what is getting in the way, and the teams or systems involved. We will discuss whether a deeper assessment makes sense.</p>
                <p>A single workflow or team can be the starting point when a focused scope makes sense. Adoption, measurement, and further improvement support can be agreed around the work your business needs.</p>
              </div>
              <Action href={introBooking}>Let’s Discuss Your Next Step</Action>
            </aside>}
          </Fragment>)}
        </div>
      </section>)}
      <section className="bg-slate-100 px-6 py-14 md:py-20">
        <div className="max-w-3xl mx-auto space-y-5 text-base leading-relaxed text-slate-700">
          <h2 className="text-3xl font-bold text-slate-950">How We Assess Value Across These Solutions</h2>
          <p>We begin with the result you want and how the work performs today. Together, we choose useful measures, consider the full cost of implementation and ongoing use, and review results after adoption.</p>
          <p>Time recovered creates capacity. Its financial value depends on how that capacity is used. Revenue gains are assessed alongside costs and margins to understand their contribution to profitability.</p>
          <p>Each engagement has an agreed scope. Additional services address new needs beyond the work already included.</p>
        </div>
      </section>
      <section className="max-w-4xl mx-auto px-6 py-14"><h2 className="text-3xl font-bold mb-8">Questions About Getting Started</h2>{buyerFaqs.map(f => <details key={f.q} className="border-b py-5"><summary className="text-lg font-semibold cursor-pointer">{f.q}</summary><p className="mt-4 text-base leading-relaxed text-slate-600">{f.a}</p></details>)}</section>
      <section className="px-6 py-14 md:py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-bold">Ready to Identify Your Best Next Step?</h2>
        <p className="max-w-2xl mx-auto my-6 text-lg text-slate-600 leading-relaxed">Book a 15 minute intro call to share your priority, learn how we can help, and discuss a practical next step. Select Take the Next Step to choose a time, or start with your free Agentic Readiness Assessment.</p>
        <div className="flex flex-wrap justify-center gap-4"><Action href={introBooking}>Take the Next Step</Action><Action href={booking} secondary>{siteConfig.agenticAssessmentLabel}</Action></div>
      </section>
    </main>
    <Footer />
  </div>;
}
