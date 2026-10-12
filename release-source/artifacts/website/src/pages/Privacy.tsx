import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/seo";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <SEO 
        title="Privacy Policy | Set Up Shop Online"
        description="Privacy policy for Set Up Shop Online Inc."
      />
      <Navbar />

      <main className="flex-1 pt-32 pb-14 px-4 bg-slate-50">
        <div className="container mx-auto max-w-6xl">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl border border-border/50 p-6 md:p-10">
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
          <div className="prose dark:prose-invert max-w-none text-muted-foreground">
            <p>Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            
            <p className="mt-6">This page explains how Set Up Shop Online Inc. uses information you share through this website.</p>
            
            <h2 className="text-foreground">Information We Collect</h2>
            <p>When you contact us via our forms or book a call, we collect information such as your name, email address, phone number, and business details necessary to provide our services.</p>
            
            <h2 className="text-foreground">How We Use Your Information</h2>
            <p>We use the information we collect to communicate with you, provide our services, and improve our website experience. We do not sell your personal data to third parties.</p>
            
            <h2 className="text-foreground">Free Assessments</h2>
            <p>We collect your contact details, business name, selected priority, answers, and saved progress to prepare your strategy. OpenAI processes your assessment answers to generate and automatically check the report. Please do not include private client information. Microsoft 365 delivers your report, and Set Up Shop Online receives the same report. We also receive a notice when an assessment remains unsubmitted for at least one hour after its last saved activity.</p>
            <p>A secure session cookie protects your assessment and lets you return in the same browser for 24 hours. Google reCAPTCHA and request limits help prevent abuse. We retain assessment and delivery records to provide the service and handle follow-up. You may request access or deletion by emailing vlad@setupshoponline.com. Starting an assessment does not subscribe you to other email campaigns or automated text messages.</p>
            <h2 className="text-foreground">Conversation to Client Conversion Kit</h2>
            <p>When you request this kit, we save your name, email address, phone number, request time, and delivery status only to fulfill your request and respond if you contact us. We do not sell your information, share it with others for their own purposes, subscribe you to marketing, or use it for unrelated purposes. This request does not authorize sales calls or texts.</p>
            <p>Hosting providers operate the form, Google reCAPTCHA helps prevent abuse, and Microsoft 365 delivers the kit and notifies Vlad of your request. A secure cookie protects your PDF access. Necessary request and delivery records remain private. You may ask for access or deletion by emailing vlad@setupshoponline.com.</p>
            <h2 className="text-foreground">Earlier Workbook Requests</h2>
            <p>When you request the free workbook, we save your name, email, phone number, submission time, time zone, source page, and available campaign details. We use these details to provide the workbook and follow up about your business. This does not sign you up for other email campaigns or automatic text messages.</p>
            <p>We keep a private record of the request and email status. A secure cookie lets you return to your download. We use limited request counts to help prevent spam. Workbook delivery emails are prepared for Microsoft 365 and are sent only when that service is connected.</p>
            <p>You can ask us to stop contacting you, or ask about your information, by emailing vlad@setupshoponline.com.</p>
            <h2 className="text-foreground">Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at:</p>
            <p>
              Set Up Shop Online Inc.<br />
              Email: vlad@setupshoponline.com<br />
              Address: 205 Applegate Road Suite 100 #1087, Stroudsburg, PA 18360
            </p>
          </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
