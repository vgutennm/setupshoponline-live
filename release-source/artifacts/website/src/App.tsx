import AlignableKit, { AlignableThankYou } from "@/pages/AlignableKit";
import AgenticReadiness from "@/pages/AgenticReadiness";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import ConversionKit, { ConversionKitAccess } from "@/pages/ConversionKit";
import WorkbookAccess from "@/pages/WorkbookAccess";
import FreeWorkbook from "@/pages/FreeWorkbook";
import GrowthStrategy from "@/pages/GrowthStrategy";
import ThankYouWorkbook from "@/pages/ThankYouWorkbook";
import ProductsServicesSolutions from "@/pages/ProductsServicesSolutions";
import BookACallPage from "@/pages/BookACall";
import Home from "@/pages/Home";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import ThankYouBooking from "@/pages/ThankYouBooking";
import ThankYouContact from "@/pages/ThankYouContact";
import WhyUs from "@/pages/WhyUs";
import { Redirect } from "wouter";
import ContactUs from "@/pages/ContactUs";
import { MobileStickyCTA } from "@/components/conversion/mobile-sticky-cta";
const roundLogo = "/images/setupshoponline-round-logo.webp?v=canonical20261018opt";

const queryClient = new QueryClient();

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    const scroll = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      if (target) {
        target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
        target.focus({ preventScroll: true });
      } else if (!id) window.scrollTo({top:0,left:0,behavior:"instant"});
    };
    const frame = requestAnimationFrame(scroll);
    window.addEventListener("hashchange", scroll);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("hashchange", scroll); };
  }, [location]);
  return null;
}

function GlobalMobileStickyCTA() {
  const [location] = useLocation();
  const hidden = ["/alignable-conversion-kit", "/conversionkit", "/free-agentic-readiness-assessment", "/agentic-assessment", "/agentic-readiness-preview", "/growth-strategy-preview", "/free-business-strategy", "/growth-assessment", "/workbook-access", "/free-workbook", "/thank-you/workbook", "/book-a-call", "/contact-us", "/thank-you/booking", "/thank-you/contact"];
  if (hidden.some(p => location === p || location.startsWith(p + "/"))) return null;
  return <MobileStickyCTA />;
}

function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!visible) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="group fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 w-12 h-12 md:w-14 md:h-14 rounded-full bg-white shadow-lg ring-1 ring-black/10 hover:scale-105 hover:shadow-xl transition-all"
      aria-label="Scroll to top"
      title="Scroll to top"
    >
      <img
        src={roundLogo}
        alt="Set Up Shop Online - back to top"
        width={256}
        height={256}
        decoding="async"
        loading="lazy"
        className="w-full h-full object-contain rounded-full"
      />
      <span
        aria-hidden="true"
        className="absolute -top-1 -right-1 w-5 h-5 md:w-6 md:h-6 rounded-full bg-amber-500 ring-2 ring-white shadow flex items-center justify-center group-hover:-translate-y-0.5 transition-transform"
      >
        <svg className="w-3 h-3 md:w-3.5 md:h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </span>
    </button>
  );
}

function Router() {
  return (
    <>
    <ScrollToTop />
    <Switch>
      <Route path="/alignable-conversion-kit/thank-you" component={AlignableThankYou} />
      <Route path="/alignable-conversion-kit" component={AlignableKit} />
      <Route path="/conversionkit" component={ConversionKit} />
      <Route path="/conversionkit/access" component={ConversionKitAccess} />
      <Route path="/" component={Home} />
      <Route path="/products-services-solutions" component={ProductsServicesSolutions} />
      <Route path="/why-setupshoponline" component={WhyUs} />
      <Route path="/book-a-call" component={BookACallPage} />
      <Route path="/contact-us" component={ContactUs} />
      <Route path="/workbook-access" component={WorkbookAccess} />
      <Route path="/free-workbook" component={GrowthStrategy} />
      <Route path="/free-agentic-readiness-assessment" component={AgenticReadiness} />
      <Route path="/agentic-assessment" component={AgenticReadiness} />
      <Route path="/agentic-readiness-preview" component={AgenticReadiness} />
      <Route path="/free-business-strategy" component={GrowthStrategy} />
      <Route path="/growth-assessment" component={GrowthStrategy} />
      <Route path="/growth-strategy-preview" component={GrowthStrategy} />
      <Route path="/thank-you/workbook" component={ThankYouWorkbook} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/thank-you/booking" component={ThankYouBooking} />
      <Route path="/thank-you/contact" component={ThankYouContact} />
      <Route component={NotFound} />
    </Switch>
    </>
  );
}

function App({ ssrPath }: { ssrPath?: string } = {}) {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter ssrPath={ssrPath} base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
            <GlobalMobileStickyCTA />
            <ScrollToTopButton />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
