import metadata from "@/lib/page-metadata.json";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
import { webPageSchema, breadcrumbSchema } from "@/lib/schema";
import { GoogleProfileButton } from "@/components/google-profile-button";
import { Link } from "wouter";
import { Phone, MapPin, Mail, ShieldCheck, ArrowRight } from "lucide-react";
const vladPortrait = "/images/vlad-gutenmakher.webp";
const contactHeroImage = "/images/business-consultation.webp";

export default function ContactUs() {
  const pageWebPage = webPageSchema({
    url: "/contact-us",
    name: metadata["/contact-us"].title,
    description:
      metadata["/contact-us"].description,
  });
  const crumbs = breadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Contact Us", url: "/contact-us" },
  ]);

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
      <SEO
        title={metadata["/contact-us"].title}
        description={metadata["/contact-us"].description}
        url="/contact-us"
        schemas={[pageWebPage, crumbs]}
      />
      <Navbar />

      <main className="pt-24 pb-12">
        {/* HERO */}
        <section className="px-4 mb-6 md:mb-8">
          <div className="container mx-auto max-w-6xl">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl border border-border/50 overflow-hidden">
              <figure className="m-0">
                <img
                  src={contactHeroImage}
                  alt="Illustration of a video conversation in an office overlooking a mountain landscape"
                  title="Contact Vlad Gutenmakher | Set Up Shop Online"
                  width={1916}
                  height={821}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  className="block w-full h-auto md:max-h-[420px] lg:max-h-[480px] md:object-cover md:object-center"
                />
              </figure>
              <div className="p-6 md:p-10 text-center space-y-6">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wider text-primary font-semibold">Contact Us</p>
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Tell me where growth is getting harder</h1>
                  <div className="text-lg text-muted-foreground max-w-2xl mx-auto space-y-4">
                    <p>
                      If your business is handling more work but also creating more overhead, coordination, or owner involvement, let’s explore the constraint behind it.
                    </p>
                    <p>To discuss your business priority and whether we can help, book a 15-minute intro. You can also start with the free assessment.</p>
                    <p>
                      For general questions, existing-client needs, or partnership inquiries, use the contact form.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <a href={siteConfig.agenticAssessmentUrl} className="w-full sm:w-auto">
                    <Button size="lg" className="w-full sm:w-auto h-auto min-h-12 px-8 text-base font-semibold gap-2 bg-red-700 hover:bg-red-800 text-white border-0 shadow-lg shadow-red-700/30 whitespace-normal h-auto py-3 text-center">
                      {siteConfig.agenticAssessmentLabel} <ArrowRight className="w-4 h-4" />
                    </Button>
                  </a>
                  <a href={siteConfig.calendlyUrl} className="w-full sm:w-auto">
                    <Button size="lg" className="w-full sm:w-auto h-auto min-h-12 px-6 text-base font-semibold gap-2 shadow-lg shadow-primary/30 whitespace-normal h-auto py-3 text-center">
                      Book a 15-Minute Intro
                    </Button>
                  </a>
                </div>
                <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                  Answer 10 questions to get your free Agentic Readiness Report.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* GET IN TOUCH (Bigin Form) */}
        <section id="contact" className="py-6 md:py-8 px-2 md:px-4 bg-slate-50">
          <div className="container mx-auto max-w-6xl">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl border border-border/50 p-3 md:p-10">
              <div className="text-center mb-12 space-y-4 px-3 md:px-0">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">How can I help?</h2>
                <div className="text-lg text-muted-foreground max-w-2xl mx-auto space-y-4">
                  <p>
                    Share what you would like to discuss and the best way to reach you. A short description is enough to begin.
                  </p>
                  <p>What is happening in your business, and what would you like to improve?</p>
                  
                </div>
              </div>

              <div className="grid md:grid-cols-12 gap-12 items-start bg-background rounded-2xl p-2 md:p-10 border border-border shadow-sm">
                <div className="md:col-span-7 w-full overflow-hidden">
                  <iframe
                    width="100%"
                    height="1020px"
                    src={siteConfig.biginFormUrl}
                    className="border-0 w-full block"
                    title="Set Up Shop Online contact form"
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>

                <div className="md:col-span-5 flex flex-col items-center text-center p-8 bg-sidebar rounded-xl border border-border/50">
                  <div className="relative mb-5 w-full max-w-[240px] rounded-2xl overflow-hidden ring-1 ring-border shadow-[0_20px_60px_-15px_rgba(15,23,42,0.35)] bg-gradient-to-br from-slate-200/40 via-white to-slate-100 p-[3px]">
                    <div className="rounded-[14px] overflow-hidden bg-white">
                      <img
                        src={vladPortrait}
                        alt="Vlad Gutenmakher, AI Consultant and Value Architect"
                        title="Vlad Gutenmakher | AI Consultant and Value Architect"
                        width={1024}
                        height={1536}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  </div>
                  <ShieldCheck className="w-10 h-10 text-primary mb-4" />
                  <h3 className="font-bold text-lg mb-2">Scan to Connect Instantly</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Prefer using your mobile device? Scan this QR code to open our secure contact form on your phone.
                  </p>
                  <div className="bg-white p-3 rounded-xl shadow-md border border-border">
                    <img
                      src={siteConfig.qrCodeUrl}
                      alt="QR code that opens the Set Up Shop Online contact form on a mobile device"
                      title="Scan to open the Set Up Shop Online contact form on mobile"
                      width={160}
                      height={160}
                      loading="lazy"
                      decoding="async"
                      className="w-40 h-40 object-contain"
                    />
                  </div>
                  <div className="flex flex-col gap-3 pt-6 w-full">
                    <a href={`tel:${siteConfig.phone}`} className="flex-1">
                      <Button className="w-full gap-2 shadow-md shadow-primary/20 whitespace-normal h-auto py-3 text-center">
                        <Phone className="w-4 h-4" /> Call Now
                      </Button>
                    </a>
                    <Button asChild className="flex-1 w-full bg-red-700 hover:bg-red-800 text-white border-0 shadow-md shadow-red-700/30 whitespace-normal h-auto py-3 text-center">
                      <a href={siteConfig.agenticAssessmentUrl}>
                        {siteConfig.agenticAssessmentLabel}
                      </a>
                    </Button>
                  </div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-primary pt-4">
                    Vlad Gutenmakher | AI Consultant and Value Architect
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SUPPORT WHEREVER YOU OPERATE */}
        <section className="py-6 md:py-8 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl border border-border/50 p-6 md:p-10 space-y-8">
              <div className="text-center space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Support Wherever You Operate</h2>
                <div className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed space-y-4">
                  <p>
                    Based in the Pocono Mountains of Pennsylvania, working with service businesses across the United States and internationally.
                  </p>
                  <p>
                    Discovery, architecture, implementation coordination, and training can be supported remotely.
                  </p>
                </div>
              </div>

              <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                  <div className="min-w-0 p-4 sm:p-8 md:p-10 space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold">Set Up Shop Online Inc.</h3>
                      <div className="space-y-3 text-muted-foreground">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          <span>{siteConfig.address.street}<br />{siteConfig.address.city}, {siteConfig.address.state} {siteConfig.address.zip}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Phone className="w-5 h-5 text-primary shrink-0" />
                          <a href={`tel:${siteConfig.phone}`} className="hover:text-primary transition-colors">{siteConfig.phone}</a>
                        </div>
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-primary shrink-0" />
                          <a href={`mailto:${siteConfig.email}`} className="break-all hover:text-primary transition-colors">{siteConfig.email}</a>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2">
                      <Button className="gap-2 w-full sm:w-auto shadow-md shadow-primary/20 whitespace-normal h-auto py-3 text-center" asChild>
                        <a href={siteConfig.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 7 12 8 12s8-6.75 8-12c0-4.42-3.58-8-8-8z" fill="#EA4335" />
                            <circle cx="12" cy="10" r="3" fill="#FFFFFF" />
                          </svg>
                          View on Google Maps
                        </a>
                      </Button>
                      <GoogleProfileButton variant="default" className="w-full sm:w-auto shadow-md shadow-primary/20" />
                      <Button asChild className="gap-2 w-full sm:w-auto bg-red-700 hover:bg-red-800 text-white border-0 shadow-md shadow-red-700/30 whitespace-normal h-auto py-3 text-center">
                        <a href={siteConfig.agenticAssessmentUrl}>{siteConfig.agenticAssessmentLabel}</a>
                      </Button>
                    </div>
                  </div>

                  <div className="min-h-[280px] md:min-h-full">
                    <iframe
                      title="Map of the Pocono Mountains region"
                      src="https://www.google.com/maps?q=Pocono+Mountains,+Pennsylvania&t=&z=9&ie=UTF8&iwloc=&output=embed"
                      className="w-full h-full min-h-[280px] border-0"
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
