import { Link, useLocation } from "wouter";
import { Star } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
const logoImg = "/images/setupshoponline-round-logo.webp?v=yinyang20261014";
const godaddyBadge = "/images/godaddy-agency-partner.webp";
const googleReviewQr = "/images/google-review-qr.png";

function SocialIcons({ size = "md" }: { size?: "sm" | "md" }) {
  const iconClass = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const linkClass = size === "sm"
    ? "w-8 h-8 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
    : "w-10 h-10 rounded-xl bg-muted hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center";

  return (
    <div className="flex items-center gap-3">
      <a href={siteConfig.social.linkedin} target="_blank" rel="noopener noreferrer" className={linkClass} aria-label="LinkedIn">
        <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
      </a>
      <a href={siteConfig.googleProfileUrl} target="_blank" rel="noopener noreferrer" className={linkClass} aria-label="Google Business Profile">
        <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      </a>
    </div>
  );
}

export function Footer() {
  const [location, setLocation] = useLocation();

  const goToHomeSection = (id: string) => {
    if (location !== "/") {
      setLocation("/");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="bg-sidebar border-t border-border py-8 md:py-10 mt-4">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2 space-y-6">
            <img
              src={logoImg}
              alt="Set Up Shop Online Inc. logo"
              title="Set Up Shop Online | AI Consulting for Service Businesses"
              width={1024}
              height={1024}
              loading="lazy"
              decoding="async"
              className="h-16 w-auto"
            />
            <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
              Set Up Shop Online helps established service businesses handle more work profitably. Vlad Gutenmakher connects business priorities, workflows, information, and technology to create more capacity and reduce dependence on the owner.
            </p>
            <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
              Business diagnosis, solution architecture, implementation guidance, and ongoing improvement. AI and agentic systems are used where they create meaningful business value.
            </p>
            <p className="font-semibold text-foreground text-sm max-w-sm leading-relaxed">
              Greater capacity. More freedom and choice.
            </p>

            <div className="pt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Follow Us</p>
              <SocialIcons />
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Elite Godaddy Agency Partner</p>
              <a href="https://www.godaddy.com/en/pro/agency-partners" target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg overflow-hidden">
                <img
                  src={godaddyBadge}
                  alt="GoDaddy Pro Trusted Agency Partner badge - Set Up Shop Online is a verified GoDaddy agency partner"
                  title="GoDaddy Pro Trusted Agency Partner | Set Up Shop Online"
                  width={768}
                  height={512}
                  loading="lazy"
                  decoding="async"
                  className="h-14 w-auto hover:opacity-80 transition-opacity"
                />
              </a>
            </div>


          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {["Products", "Services", "Solutions"].map(label => <li key={label}><a href={`/products-services-solutions#${label.toLowerCase()}`} className="hover:text-primary transition-colors">{label}</a></li>)}
              <li><Link href="/why-setupshoponline" className="hover:text-primary transition-colors">Why Vlad</Link></li>
              <li><Link href="/contact-us" className="hover:text-primary transition-colors">Contact</Link></li>
              <li><a href={siteConfig.agenticAssessmentUrl} className="hover:text-primary transition-colors">{siteConfig.agenticAssessmentLabel}</a></li>
            </ul>
            <div className="mt-8 space-y-2 text-sm text-foreground/80">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Get In Touch</p>
              <p><a href={`mailto:${siteConfig.email}`} className="break-all hover:text-primary transition-colors">{siteConfig.email}</a></p>
              <p><a href={`tel:${siteConfig.phone}`} className="hover:text-primary transition-colors">{siteConfig.phone}</a></p>
              <p>Serving businesses across the United States and internationally through remote collaboration.</p><p>{siteConfig.address.street}<br />{siteConfig.address.city}, {siteConfig.address.state} {siteConfig.address.zip}</p>
              <div className="flex flex-wrap items-start gap-4 mt-3">
                <a
                  href={siteConfig.googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 bg-white p-1.5 rounded-md shadow-sm border border-border hover:shadow-md transition-shadow"
                  aria-label="Scan QR code to leave a Google review"
                  data-testid="link-footer-google-review-qr"
                >
                  <img
                    src={googleReviewQr}
                    alt="QR code that opens the Google review page for Set Up Shop Online so customers can leave a review"
                    title="Scan to leave a Google review for Set Up Shop Online"
                    width={132}
                    height={132}
                    loading="lazy"
                    decoding="async"
                    className="w-20 h-20 block"
                  />
                </a>
                <div className="flex flex-col gap-1">
                  <a
                    href={siteConfig.googleReviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                    data-testid="link-footer-google-review"
                  >
                    <Star className="w-3.5 h-3.5" /> Leave a Google Review
                  </a>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Scan the QR code or tap to open our review page.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Resources & Legal</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="/free-agentic-readiness-assessment" className="hover:text-primary transition-colors">{siteConfig.agenticAssessmentLabel}</a></li>
              <li><a href="https://store.setupshoponline.com/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Login</a></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
            </ul>

            <h4 className="font-semibold mb-4 mt-8">Scan to Connect</h4>
            <div className="bg-white p-2 rounded-lg inline-block shadow-sm">
              <img
                src={siteConfig.qrCodeUrl}
                alt="QR code that opens the Set Up Shop Online contact form on a mobile device"
                title="Scan to open the Set Up Shop Online contact form on mobile"
                width={96}
                height={96}
                loading="lazy"
                decoding="async"
                className="w-24 h-24 object-contain"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              Scan this code to open our contact form directly on your mobile device.
            </p>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t border-border/50 text-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Set Up Shop Online Inc. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
