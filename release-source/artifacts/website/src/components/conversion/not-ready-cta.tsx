import { siteConfig } from "@/lib/site-config";
import { Button } from "@/components/ui/button";
import { Calendar, Phone } from "lucide-react";

export function NotReadyCTA() {
  return (
    <section className="py-6 md:py-10 px-4">
      <div className="container mx-auto max-w-2xl text-center space-y-6">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Make time for your next decision
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href={siteConfig.agenticAssessmentUrl} aria-label={siteConfig.agenticAssessmentLabel}>
            <Button size="lg" className="h-auto min-h-14 px-8 text-lg font-semibold gap-3 bg-red-700 hover:bg-red-800 text-white border-0 shadow-lg shadow-red-700/30 whitespace-normal h-auto py-3 text-center">
              <Calendar className="w-5 h-5" />
              {siteConfig.agenticAssessmentLabel}
            </Button>
          </a>
          <a href="tel:+12017570134" aria-label="Call Set Up Shop Online at 201 757 0134">
            <Button size="lg" variant="outline" className="h-auto min-h-14 px-8 text-lg font-semibold gap-3 whitespace-normal h-auto py-3 text-center">
              <Phone className="w-5 h-5" />
              Call 201 757 0134
            </Button>
          </a>
        </div>
        <p className="text-muted-foreground leading-relaxed max-w-xl mx-auto">
          Get a free Agentic Readiness Report based on your answers. For general questions, visit our Contact page.
        </p>
      </div>
    </section>
  );
}
