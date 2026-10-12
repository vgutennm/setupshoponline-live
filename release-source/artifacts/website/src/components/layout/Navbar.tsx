import { siteConfig } from "@/lib/site-config";
import { useState } from "react";
import { useLocation } from "wouter";
import { Menu, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
const headerAssessment = { label: siteConfig.agenticAssessmentLabel, href: siteConfig.agenticAssessmentUrl };
const logoImg = "/images/setupshoponline-rectangle-logo.jpeg";

type NavItem =
  | { label: string; href: string; kind: "internal" }
  | { label: string; href: string; kind: "external" }
  | { label: string; sectionId: string; kind: "section" };

type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "AI Journey",
    items: [
      { label: "Products", href: "/products-services-solutions#products", kind: "internal" },
      { label: "Services", href: "/products-services-solutions#services", kind: "internal" },
      { label: "Solutions", href: "/products-services-solutions#solutions", kind: "internal" },
    ],
  },
  {
    label: "Company Info",
    items: [
      { label: "Why Us", href: "/why-setupshoponline", kind: "internal" },
      { label: "Contact", href: "/contact-us", kind: "internal" },
    ],
  },
];

export function Navbar() {
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const goHome = () => {
    setIsOpen(false);
    if (location !== "/") {
      window.location.assign("/");
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goToHomeSection = (id: string) => {
    setIsOpen(false);
    if (location !== "/") {
      setLocation("/");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const dropdownItemClass =
    "block rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-primary transition-colors w-full text-left";

  // Desktop navigation
  const DesktopNav = () => (
    <NavigationMenu aria-label="Main navigation" className="hidden lg:flex">
      <NavigationMenuList className="gap-0.5">
        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <a href="/" className={navigationMenuTriggerStyle()}>Home</a>
          </NavigationMenuLink>
        </NavigationMenuItem>
        {navGroups.map((group) => (
          <NavigationMenuItem key={group.label}>
            {group.label === "AI Journey" ? <div className="flex items-center">
              <a href="/products-services-solutions" className="rounded-l-md pl-3 pr-1 py-2 text-sm font-medium text-foreground/80 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary">AI Journey</a>
              <NavigationMenuTrigger aria-label="Show AI Journey sections" className="bg-transparent pl-0 pr-2"><span className="sr-only">AI Journey sections</span></NavigationMenuTrigger>
            </div> : <NavigationMenuTrigger className="bg-transparent px-3 font-medium text-foreground/80">
              {group.label}
            </NavigationMenuTrigger>}
            <NavigationMenuContent>
              <ul className="grid w-64 gap-1 p-2">
                {group.items.map((item) => (
                  <li key={item.label}>
                    <NavigationMenuLink asChild>
                      {item.kind === "section" ? (
                        <button onClick={() => goToHomeSection(item.sectionId)} className={dropdownItemClass}>
                          {item.label}
                        </button>
                      ) : item.kind === "external" ? (
                        <a href={item.href} target="_blank" rel="noopener noreferrer" className={dropdownItemClass}>
                          {item.label}
                        </a>
                      ) : (
                        <a href={item.href} className={dropdownItemClass}>
                          {item.label}
                        </a>
                      )}
                    </NavigationMenuLink>
                  </li>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );

  // Mobile: grouped sections in the sheet
  const MobileNav = () => (
    <>
      <button
        onClick={goHome}
        className="text-base font-semibold text-foreground hover:text-primary transition-colors text-left"
      >
        Home
      </button>
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{group.label === "AI Journey" ? <a href="/products-services-solutions" onClick={() => setIsOpen(false)} className="hover:text-primary">AI Journey</a> : group.label}</p>
          <div className="flex flex-col gap-3 pl-1">
            {group.items.map((item) =>
              item.kind === "section" ? (
                <button
                  key={item.label}
                  onClick={() => goToHomeSection(item.sectionId)}
                  className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors text-left"
                >
                  {item.label}
                </button>
              ) : item.kind === "external" ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                  className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
                >
                  {item.label}
                </a>
              )
            )}
          </div>
        </div>
      ))}
    </>
  );

  return (
    <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <a href="/" className="flex shrink-0 items-center gap-2">
          <img
            src={logoImg}
            alt="Set Up Shop Online Inc. logo"
            title="Set Up Shop Online | AI Consulting for Service Businesses"
            width={1000}
            height={480}
            decoding="async"
            className="h-14 w-auto object-contain"
          />
        </a>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-3">
          <DesktopNav />
          <Button asChild className="rounded-full h-9 px-4 text-sm font-semibold bg-primary hover:bg-primary/90 text-white border-0 shadow-md shadow-primary/30">
            <a href="tel:+12017570134" aria-label="Call Set Up Shop Online at 201-757-0134">
              <Phone className="w-4 h-4" />
              201-757-0134
            </a>
          </Button>
          <Button asChild className="rounded-full h-9 px-4 text-sm font-semibold bg-red-700 hover:bg-red-800 text-white border-0 shadow-md shadow-red-700/30">
            <a href={headerAssessment.href} onClick={() => setIsOpen(false)}>
              {headerAssessment.label}
            </a>
          </Button>

        </div>

        {/* Mobile Nav */}
        <div className="lg:hidden flex items-center">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-mr-2">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent aria-describedby={undefined} side="right" className="w-[min(100vw,360px)] sm:w-[400px] overflow-y-auto">
              <SheetTitle className="sr-only">Main navigation</SheetTitle>
              <nav aria-label="Mobile navigation" className="flex flex-col gap-6 mt-8">
                <MobileNav />
                <Button asChild className="w-full mt-2 bg-primary hover:bg-primary/90 text-white border-0 shadow-md shadow-primary/30">
                  <a
                    href="tel:+12017570134"
                    onClick={() => setIsOpen(false)}
                    aria-label="Call Set Up Shop Online at 201-757-0134"
                  >
                    <Phone className="w-4 h-4" />
                    201-757-0134
                  </a>
                </Button>
                <Button asChild className="w-full h-auto whitespace-normal py-3 text-center bg-red-700 hover:bg-red-800 text-white border-0 shadow-md shadow-red-700/30">
                  <a href={headerAssessment.href} onClick={() => setIsOpen(false)}>
                    {headerAssessment.label}
                  </a>
                </Button>

              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
