import content from "@/lib/approved-positioning.json";
import { siteConfig } from "@/lib/site-config";
const portrait = "/images/vlad-gutenmakher.webp";

export function PositioningSections({ kind }: {kind: "home" | "why"}) {
  const sections = content[kind].filter(s => !["hero", "mission", "introduction"].includes(s.id));
  return <div id="how-i-help" className="scroll-mt-24">{sections.map((s,i) => <section key={s.id} className={`px-5 py-12 md:py-16 ${i%2===0 ? "bg-slate-50" : "bg-white"}`}>
    <div className="mx-auto max-w-6xl">
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight max-w-3xl mb-7">{s.heading}</h2>
      {s.id === "about-preview" && <img src={portrait} alt="Vlad Gutenmakher, founder of Set Up Shop Online and AI Consultant and Value Architect." className="w-44 rounded-2xl mb-7" width={1024} height={1536} loading="lazy" />}
      <div className={s.id === "method" || s.id === "principles" ? "grid gap-5 md:grid-cols-2" : "space-y-5 max-w-4xl"}>
        {s.paragraphs.map((p,n) => {
          const clean=p.replace(/^Problem card \d+ — /, "");
          const split=p.startsWith("Problem card ") ? [clean.slice(0,clean.indexOf(":")),clean.slice(clean.indexOf(":")+1).trim()] : p.includes(" — ") ? p.split(" — ") : null;
          return split ? <div key={n} className="rounded-xl border border-slate-200 bg-white p-6"><h3 className="text-xl font-bold mb-3">{split[0]}</h3><p className="text-base leading-relaxed text-slate-600">{split.slice(1).join(" — ")}</p></div> : <p key={n} className="text-lg leading-relaxed text-slate-600">{p}</p>;
        })}
      </div>
      {s.id === "method" && <p className="mt-6 text-base text-slate-500">Define the business outcome, design the improvement, and validate results before expanding.</p>}
      {s.button && <a className="inline-flex mt-7 rounded-lg bg-primary text-white px-6 py-3 text-base font-semibold" href={s.id === "service-introduction" ? "/products-services-solutions" : s.id === "about-preview" ? "/why-setupshoponline" : siteConfig.calendlyUrl}>{s.button}</a>}
      {s.id === "closing-invitation" && <a href={siteConfig.agenticAssessmentUrl} className="inline-block mt-5 sm:ml-6 text-primary underline text-base">{siteConfig.agenticAssessmentLabel}</a>}
    </div>
  </section>)}</div>;
}
