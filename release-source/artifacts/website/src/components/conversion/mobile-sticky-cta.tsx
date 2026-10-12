import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

export function MobileStickyCTA() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-md border-t border-border px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="grid grid-cols-[1fr_auto] gap-2 max-w-2xl mx-auto">
        <Button asChild className="min-w-0 h-auto min-h-14 px-3 text-sm font-semibold whitespace-normal text-center leading-snug py-2 bg-orange-700 hover:bg-orange-800 text-white border-0 shadow-md shadow-orange-700/20">
          <a href={siteConfig.calendlyUrl} target="_blank" rel="noopener noreferrer">
            Free 15-Minute Intro
          </a>
        </Button>
        <Button asChild className="min-w-0 h-auto min-h-14 px-3 text-sm font-semibold shadow-md shadow-primary/20">
          <a href={`tel:${siteConfig.phoneFull}`} aria-label="Call us at 201-757-0134">
            Call Us
          </a>
        </Button>
      </div>
    </div>
  );
}
