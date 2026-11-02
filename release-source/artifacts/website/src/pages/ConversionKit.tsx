import { useEffect, useRef, useState, type FormEvent } from "react";
import { BookOpen, Check, Download, LockKeyhole, Mail, MessageCircle, Users } from "lucide-react";
import { SEO } from "@/components/seo";
import { WorkbookCaptcha } from "@/components/WorkbookCaptcha";
import { Navbar } from "@/components/layout/Navbar";
import { siteConfig } from "@/lib/site-config";

type Field = "full_name" | "email" | "phone" | "human_confirmed";
const button = "inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-4 text-base font-bold text-slate-950 transition hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed";
export function KitHeader() {
  return <div className="h-16"><Navbar /></div>;
}
export default function ConversionKit() {
  const [captchaKey, setCaptchaKey] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [reset, setReset] = useState(0);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Partial<Record<Field,string>>>({});
  const requestId = useRef("");
  const started = useRef(0);
  const submitting = useRef(false);
  const successHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    requestId.current = crypto.randomUUID(); started.current = Date.now();
    let active = true;
    fetch("/api/conversionkit/config", { cache: "no-store" }).then(async r => { const v = await r.json(); if (!r.ok) throw new Error(v.error); return v; }).then(v => {
      if (!active) return; setPreview(v.preview === true); setCaptchaKey(v.recaptchaSiteKey || ""); setEmailEnabled(v.emailEnabled === true);
      if (!v.preview && !v.recaptchaSiteKey) setError("Verification is temporarily unavailable. Please refresh or try again shortly.");
    }).catch(() => { if (active) setError("The form is temporarily unavailable. Please refresh or try again shortly."); });
    return () => { active = false; };
  }, []);
  useEffect(() => { if (saved) successHeading.current?.focus(); }, [saved]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting.current || preview) return;
    const form = event.currentTarget, data = Object.fromEntries(new FormData(form)) as Record<string,string>;
    const next: Partial<Record<Field,string>> = {};
    if ((data.full_name || "").trim().length < 2) next.full_name = "Please enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((data.email || "").trim())) next.email = "Please enter a valid email address.";
    const phone = (data.phone || "").trim(), digits = phone.replace(/\D/g, "");
    if (phone && (!/^[+\d\s().-]+$/.test(phone) || digits.length < 7 || digits.length > 15)) next.phone = "Please enter a phone number with 7 to 15 digits.";
    if (!captchaToken) next.human_confirmed = "Please complete the verification.";
    setFields(next); setError("");
    if (Object.keys(next).length) { (form.elements.namedItem(Object.keys(next)[0]) as HTMLInputElement)?.focus(); return; }
    // Open during the user's click so the PDF can use a new tab without relying on an asynchronous popup.
    const pdfTab = window.open("/conversionkit/access?waiting=1", "_blank");
    if (pdfTab) pdfTab.opener = null;
    submitting.current = true; setBusy(true);
    try {
      const r = await fetch("/api/conversionkit/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, submission_id: requestId.current, started_at: started.current, recaptcha_token: captchaToken }) });
      const result = await r.json();
      if (!r.ok || !result.saved) { setFields(result.fields || {}); throw new Error(result.error || "Please try again."); }
      setSaved(true); setEmailEnabled(result.email_status !== "not_configured");
      if (pdfTab && !pdfTab.closed) pdfTab.location.replace("/api/conversionkit/download");
    } catch (e) {
      if (pdfTab && !pdfTab.closed) pdfTab.close();
      setError(e instanceof Error ? e.message : "Please check your connection and try again."); setCaptchaToken(""); setReset(n => n + 1);
    } finally { submitting.current = false; setBusy(false); }
  }
  return <div className="min-h-screen bg-white text-slate-900 font-sans">
    <SEO noindex title="Conversation to Client Conversion Kit | Free Networking Workbook" description="Make your next networking conversation more useful. Get Vlad Gutenmakher’s free Conversation to Client Conversion Kit with introductions, conversation prompts, practice exercises, and call notes." />
    <KitHeader />
    <main>
      <section className="bg-slate-50 px-5 pb-14 pt-10 md:py-16">
        <div className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <div>
            <p className="mb-5 text-sm font-bold uppercase tracking-widest text-blue-700">Free Conversation to Client Conversion Kit</p>
            <h1 className="max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.4rem]">Make your next conversation <span className="text-blue-700">worth continuing.</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">You have five to seven minutes. Learn how to introduce your work clearly, uncover what matters, and invite a relevant next conversation.</p>
            <p className="mt-5 text-xl font-bold">Conversation to Client Conversion Kit</p>
            <figure className="mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
              <img src="/images/conversionkit/conversion-kit-workbook.webp" alt="Illustrative mockup of the Conversation to Client Conversion Kit with practice sheets and a pen" width={1536} height={1024} fetchPriority="high" className="aspect-[3/2] w-full object-cover" />
              <figcaption className="px-5 py-3 text-sm text-slate-500">Free digital PDF. Read on screen or print to practice. Cover illustration.</figcaption>
            </figure>
          </div>
          <section id="get-kit" aria-labelledby="kit-form-title" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
            {saved ? <div className="py-5">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-700"><Check aria-hidden="true" /></div>
              <h2 ref={successHeading} tabIndex={-1} className="text-3xl font-bold outline-none">Your kit is ready.</h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">Your PDF opens in a new tab. If it did not open, use the button below.</p>
              <a href="/api/conversionkit/download" target="_blank" rel="noopener noreferrer" className={`${button} mt-6 w-full`}><BookOpen className="h-5 w-5 shrink-0" aria-hidden="true" />Open My Conversion Kit</a>
              <a href="/api/conversionkit/download?download=1" className="mt-4 block text-center text-base font-semibold text-blue-700 underline">Download the PDF</a>
              <p className="mt-6 text-base leading-relaxed text-slate-600">{emailEnabled ? "A thank you email with your PDF and intro call link is queued for delivery. Check your inbox and spam folder shortly." : "Email delivery is currently unavailable. Please download your copy now."}</p>
              <p className="mt-6 border-t border-slate-200 pt-6 text-base leading-relaxed">Want help with your next step? <a href={siteConfig.calendlyUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline">Book a 15 minute intro with Vlad.</a></p>
            </div> : <>
              <h2 id="kit-form-title" className="text-2xl font-bold">Get your free conversion kit</h2>
              <p className="mb-6 mt-3 text-base leading-relaxed text-slate-600">Open the PDF instantly in a new tab and receive a copy by email. No purchase or call required.</p>
              {preview && <p role="status" className="mb-5 rounded-lg bg-blue-50 p-4 text-sm leading-relaxed text-blue-900">This is the private page preview. Requests and emails are disabled here.</p>}
              <form onSubmit={submit} noValidate className="space-y-5">
                {([{name:"full_name",label:"Full name",type:"text",auto:"name",max:120},{name:"email",label:"Email address",type:"email",auto:"email",max:254},{name:"phone",label:"Phone number",type:"tel",auto:"tel",max:40}] as const).map(f => <div key={f.name}>
                  <label htmlFor={`kit-${f.name}`} className="mb-2 block text-base font-semibold">{f.label} <span className="text-sm font-normal text-slate-500">({f.name === "phone" ? "optional" : "required"})</span></label>
                  <input id={`kit-${f.name}`} name={f.name} type={f.type} autoComplete={f.auto} required={f.name !== "phone"} maxLength={f.max} aria-invalid={!!fields[f.name]} aria-describedby={fields[f.name]?`kit-${f.name}-error`:undefined} className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base outline-offset-2 focus:outline-2 focus:outline-blue-600 aria-[invalid=true]:border-red-600" />
                  {fields[f.name] && <p id={`kit-${f.name}-error`} className="mt-2 text-sm text-red-700">{fields[f.name]}</p>}
                </div>)}
                <div className="absolute -left-[10000px]" aria-hidden="true"><label htmlFor="kit-website">Leave this empty</label><input id="kit-website" name="website" tabIndex={-1} autoComplete="off" /></div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
                  <p className="mb-2 flex items-center gap-2 font-bold text-slate-800"><LockKeyhole className="h-4 w-4 shrink-0" aria-hidden="true" />Your information stays private</p>
                  <p>I use your details only to deliver this kit, send its confirmation email, and respond if you contact me. I will never sell your personal information, share it with others for their own use, or use it for unrelated purposes.</p>
                  <p className="mt-3">Secure hosting, Google reCAPTCHA, and email providers process information as needed to operate this form and deliver your kit. This request does not subscribe you to marketing or authorize sales calls or texts.</p>
                  <p className="mt-3">Questions or deletion requests: <a href="mailto:vlad@setupshoponline.com" className="break-all text-blue-700 underline">vlad@setupshoponline.com</a>.</p>
                </div>
                {!preview && <div aria-label="Human verification">{captchaKey ? <WorkbookCaptcha siteKey={captchaKey} reset={reset} onToken={setCaptchaToken} /> : <p className="text-sm text-slate-600">Loading verification…</p>}{fields.human_confirmed && <p role="alert" className="mt-2 text-sm text-red-700">{fields.human_confirmed}</p>}</div>}
                {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</p>}
                <p id="kit-delivery-note" className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm leading-relaxed text-blue-950"><Mail className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /><span>We’ll also email you a copy of the PDF so you can access it anytime.</span></p>
                <button type="submit" aria-describedby="kit-delivery-note" disabled={busy || preview || !captchaKey} className={`${button} w-full`}><Download className="h-5 w-5 shrink-0" aria-hidden="true" />{busy ? "Preparing your kit…" : "Get My Free Conversion Kit"}</button>
              </form>
            </>}
          </section>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-14 md:py-20">
        <p className="text-sm font-bold uppercase tracking-widest text-blue-700">A practical guide you can use at your next event</p>
        <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">Know what to say. Make room to listen.</h2>
        <div className="mt-9 grid gap-6 md:grid-cols-3">{[
          {icon:MessageCircle,title:"Introduce your work clearly",text:"Build your audio business card: who you help, the result they want, and why it matters. Practice ten versions and choose the one that fits."},
          {icon:Users,title:"Find a reason to continue",text:"Follow five steps: connect, find the result, find the deeper benefit, reflect their words, and invite a relevant next conversation."},
          {icon:BookOpen,title:"Practice before it counts",text:"Use 25 opener exercises, a complete example, partner practice, and a conversation record to improve one thing at a time."}
        ].map(item => <article key={item.title} className="rounded-2xl border border-slate-200 p-6"><item.icon className="h-7 w-7 text-blue-700" strokeWidth={1.5} aria-hidden="true" /><h3 className="mt-5 text-xl font-bold">{item.title}</h3><p className="mt-3 text-base leading-relaxed text-slate-600">{item.text}</p></article>)}</div>
      </section>
      <section className="bg-blue-950 px-5 py-14 text-white md:py-16"><div className="mx-auto grid max-w-6xl items-center gap-9 md:grid-cols-2">
        <img src="/images/conversionkit/networking-conversation.webp" alt="Two professionals having an attentive conversation beside a notebook and calendar" width={1536} height={1024} loading="lazy" className="aspect-[3/2] w-full rounded-2xl object-cover" />
        <div><p className="text-sm font-bold uppercase tracking-widest text-blue-200">For virtual and in person networking</p><h2 className="mt-4 text-3xl font-bold leading-tight md:text-4xl">A better next step starts with a useful conversation.</h2><p className="mt-5 text-lg leading-relaxed text-blue-100">For business owners, consultants, and service professionals who want their conversations to feel clear, relevant, and respectful.</p><p className="mt-4 text-base leading-relaxed text-blue-100">The goal is a booked qualification call when there is mutual interest. A booking is a starting point, not a qualified prospect or a guaranteed client.</p><a href="#get-kit" className={`${button} mt-7`}>Get My Free Conversion Kit</a></div>
      </div></section>
      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1fr_1.4fr] md:py-20"><div><p className="text-sm font-bold uppercase tracking-widest text-blue-700">Created by Vlad Gutenmakher</p><h2 className="mt-4 text-3xl font-bold">Prepare. Practice. Have the conversation.</h2><p className="mt-5 text-base leading-relaxed text-slate-600">Start with your introduction. Rehearse the framework with a partner. Keep the notes page beside you at your next event.</p></div><div className="space-y-1">{[
        ["What is included?","An 11 page PDF with message worksheets, the five step conversation framework, an example conversation, 25 opener exercises, a partner review, and call notes."],
        ["Do I need to book a call?","No. The kit is free and no call or purchase is required. Your confirmation email includes an optional 15 minute intro link."],
        ["How do I receive it?","Submit your name and email and complete reCAPTCHA. Your phone number is optional. The PDF opens in a new tab. We also email the PDF attachment and a link to reopen it."],
        ["Will you call me or add me to a mailing list?","No. Requesting this kit does not authorize sales calls, texts, or marketing subscriptions. Your details are used only for this request and any response you ask us for."]
      ].map(([q,a])=><details key={q} className="border-b border-slate-200 py-5"><summary className="cursor-pointer text-lg font-semibold">{q}</summary><p className="mt-4 text-base leading-relaxed text-slate-600">{a}</p></details>)}</div></section>
    </main>
    <footer className="border-t border-slate-200 px-5 py-8"><div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 text-sm text-slate-500 sm:flex-row"><p>© {new Date().getFullYear()} Set Up Shop Online, Inc.</p><div className="flex flex-wrap gap-5"><a href="mailto:vlad@setupshoponline.com" className="flex items-center gap-2 underline"><Mail className="h-4 w-4" aria-hidden="true" />Contact Vlad</a><a href="/privacy" className="underline">Privacy policy</a></div></div></footer>
  </div>;
}

export function ConversionKitAccess() {
  const [error, setError] = useState("");
  useEffect(() => {
    if (new URLSearchParams(location.search).get("waiting") === "1") return;
    let active = true;
    async function open() {
      const token = location.hash.slice(1);
      if (token) {
        history.replaceState(null, "", "/conversionkit/access");
        const r = await fetch("/api/conversionkit/access", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});
        if (!r.ok) throw new Error("This link is not valid. Please request your kit again.");
      }
      const r = await fetch("/api/conversionkit/session", {cache:"no-store"}); const v = await r.json();
      if (!r.ok || !v.ready) throw new Error("Please request your free kit first, or use the link in your confirmation email.");
      if (active) location.replace("/api/conversionkit/download");
    }
    open().catch(e => { if (active) setError(e.message || "Unable to open your kit. Please try again."); });
    return () => { active = false; };
  }, []);
  return <div className="min-h-screen bg-slate-50 font-sans"><SEO noindex title="Open Your Conversion Kit | Set Up Shop Online" description="Open your saved Conversion Kit PDF." /><KitHeader /><main className="mx-auto max-w-xl px-5 py-20"><h1 className="text-3xl font-bold">{error ? "Open your conversion kit" : "Preparing your conversion kit…"}</h1><p role="status" className="mt-5 text-base leading-relaxed text-slate-600">{error || "Your PDF will open here as soon as your request is complete."}</p>{error && <p className="mt-6 text-base leading-relaxed text-slate-600">You can also open the PDF attachment in your confirmation email.</p>}</main></div>;
}
