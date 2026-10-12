import metadata from "@/lib/page-metadata.json";
import { siteConfig } from "@/lib/site-config";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

export default function ThankYouContact() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <SEO
        title={metadata["/thank-you/contact"].title}
        description={metadata["/thank-you/contact"].description}
        url="/thank-you/contact"
        noindex
      />
      <Navbar />
      <main className="pt-32 pb-14 md:pt-40 md:pb-20 px-4 bg-slate-50">
        <div className="container mx-auto max-w-6xl">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl border border-border/50 p-6 md:p-12 max-w-2xl mx-auto text-center space-y-8">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Thank you for getting in touch</h1>
              <p className="text-lg text-muted-foreground">
                Your inquiry has been submitted. I look forward to learning more about what you need.
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100/40 rounded-2xl p-8 border border-blue-200/60 space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                If you would like to discuss your business priority, you can also book a 15-minute intro or start with the free assessment.
              </p>
              <a href={siteConfig.calendlyUrl}>
                <Button className="bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 whitespace-normal h-auto py-3 text-center">Book a 15-Minute Intro</Button>
              </a>
            </div>

            <a href={siteConfig.agenticAssessmentUrl} className="block underline text-primary">{siteConfig.agenticAssessmentLabel}</a>
            <Link href="/">
              <Button variant="outline" className="mt-4 whitespace-normal h-auto py-3 text-center">Back to Home</Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
