import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Download, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

type Status = { ready: boolean; email_status?: string };
export default function ThankYouWorkbook() {
  const [status, setStatus] = useState<Status | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { fetch("/api/workbook/session").then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(setStatus).catch(() => setFailed(true)); }, []);
  const sending = status && ["pending", "accepted", "sending"].includes(status.email_status || "");
  return <div className="min-h-screen bg-slate-50 font-sans">
    <SEO title="Your Workbook | Set Up Shop Online" description="Download your workbook and take your next step." url="/thank-you/workbook" noindex />
    <Navbar />
    <main className="pt-28 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        {!status?.ready ? <section className="rounded-2xl border border-slate-200 bg-white p-8 md:p-12 text-center">
          <h1 className="text-3xl font-bold">{!status && !failed ? "Getting your workbook ready…" : "Get your free workbook."}</h1>
          {(status || failed) && <><p className="mt-4 text-slate-600 text-base">{failed ? "We could not check your download. Please refresh this page, or return to the form." : "Please fill out the short form first. Then you can download your copy here."}</p></>}
        </section> : <>
          <section className="bg-white border border-blue-100 rounded-2xl p-7 md:p-12 text-center shadow-sm">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-5 text-blue-700" aria-hidden="true" />
            <p className="text-sm uppercase tracking-wider text-blue-700 font-bold mb-3">Your next step starts here</p>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">Your workbook is ready</h1>
            <p className="mt-4 text-base text-slate-600">Download and save a copy before adding your answers. Keep it available as you decide your next step.</p>
            <Button asChild size="lg" className="mt-7 h-auto min-h-14 px-6 py-4 text-base whitespace-normal"><a href="/api/workbook/download"><Download className="h-5 w-5" aria-hidden="true" />Download My Workbook</a></Button>
            <p role="status" className="mt-5 max-w-lg mx-auto text-sm leading-relaxed text-slate-600">{sending ? "We are sending a copy to your inbox. Please check your spam folder too." : <>You can still download your workbook here. We could not email it yet. For help, email <a href="mailto:vlad@setupshoponline.com" className="text-blue-700 underline">vlad@setupshoponline.com</a>.</>}</p>
          </section>
          <section className="mt-8 rounded-2xl bg-slate-900 text-white p-7 md:p-12">
            <p className="text-sm uppercase tracking-wider font-semibold text-blue-200 mb-4">An optional next step · Free</p>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">Choose your next business improvement.</h2>
            <p className="mt-5 text-base text-slate-200 leading-relaxed">Explore one recurring workflow and answer 10 questions. Get a free Agentic Readiness Report with practical priorities and next steps based on your answers.</p>
            <Button asChild className="mt-7 bg-red-700 hover:bg-red-800 text-white h-auto min-h-14 px-5 py-4 text-base whitespace-normal w-full sm:w-auto"><a href={siteConfig.agenticAssessmentUrl}>{siteConfig.agenticAssessmentLabel}</a></Button>
            <p className="mt-4 text-sm text-slate-300">Your workbook and report are free. No purchase is required.</p>
          </section>
        </>}
      </div>
    </main>
    <Footer />
  </div>;
}
