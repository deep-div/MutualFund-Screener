import { ScrollText, AlertCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import TickerTape from "@/components/TickerTape";
import Footer from "@/components/Footer";

import { SITE_NAME, SITE_URL, LEGAL_EMAIL as CONTACT_EMAIL } from "@/lib/siteConfig";

const LAST_UPDATED = "May 15, 2026";

interface Section {
  title: string;
  content: React.ReactNode;
}

const sections: Section[] = [
  {
    title: "1. Acceptance of Terms",
    content: (
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
        By accessing or using {SITE_NAME} ("{SITE_URL}"), you confirm that you are at least 18 years of age
        and agree to be bound by these Terms of Service and our{" "}
        <a href="/privacy" className="text-violet-600 hover:underline font-medium">Privacy Policy</a>.
        If you do not agree, please discontinue use immediately.
      </p>
    ),
  },
  {
    title: "2. No Financial Advice",
    content: (
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
        {SITE_NAME} is a data screening and research tool only. All mutual fund data, NAV values, returns,
        analytics, and calculators on this site are for <strong className="text-foreground font-medium">informational purposes only</strong> and
        do not constitute investment advice, financial planning advice, or a recommendation to buy or sell any
        security. {SITE_NAME} is not a SEBI-registered investment advisor. Always consult a qualified financial
        advisor before making investment decisions. Past performance is not indicative of future results.
      </p>
    ),
  },
  {
    title: "3. Acceptable Use",
    content: (
      <div className="space-y-2 text-[13.5px] leading-relaxed text-muted-foreground">
        <p>You may use {SITE_NAME} for lawful, personal, non-commercial research purposes only. You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Use automated bots, scrapers, or crawlers to extract data in bulk without written permission.</li>
          <li>Attempt to reverse-engineer, decompile, or disassemble any part of the platform.</li>
          <li>Upload or transmit malicious code, spam, or any content that violates applicable laws.</li>
          <li>Misrepresent your identity or impersonate any person or entity.</li>
          <li>Use the service in any manner that could damage, disable, or impair our infrastructure.</li>
          <li>Circumvent any security or access controls on the platform.</li>
        </ul>
      </div>
    ),
  },
  {
    title: "4. Intellectual Property",
    content: (
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
        All content on {SITE_NAME} - including but not limited to the website design, logos, text, graphics,
        code, and data presentations - is the property of {SITE_NAME} or its data licensors and is protected
        by applicable copyright and intellectual property laws. You may not reproduce, redistribute, or
        commercially exploit any content without our prior written consent. Mutual fund data is sourced from
        public regulatory filings and third-party data providers; we make no claim of ownership over
        underlying fund data.
      </p>
    ),
  },
  {
    title: "5. Third-Party Advertisements",
    content: (
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
        {SITE_NAME} displays advertisements served by <strong className="text-foreground font-medium">Google AdSense</strong> and
        other third-party ad networks. These advertisements are provided by third parties and {SITE_NAME} has
        no control over the content of such ads. The display of advertisements does not constitute an
        endorsement by {SITE_NAME} of the advertised products or services. By using this site, you acknowledge
        that third-party ad providers may use cookies and tracking technologies as described in our{" "}
        <a href="/privacy" className="text-violet-600 hover:underline font-medium">Privacy Policy</a>. You agree not to
        generate invalid clicks or impressions, click ads repeatedly, use bots/automation to interact with ads,
        or encourage others to click ads (for example, by using "support us by clicking ads" messaging). We may
        restrict or terminate access to protect platform and advertising policy compliance.
      </p>
    ),
  },
  {
    title: "6. Third-Party Links",
    content: (
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
        {SITE_NAME} may contain links to external websites or resources. We are not responsible for the
        content, accuracy, or privacy practices of those sites. Accessing third-party links is at your
        own risk.
      </p>
    ),
  },
  {
    title: "7. User Accounts",
    content: (
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
        You are responsible for maintaining the confidentiality of your account credentials and for all
        activity that occurs under your account. Notify us immediately at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-600 hover:underline">{CONTACT_EMAIL}</a>{" "}
        if you suspect unauthorised access to your account. We reserve the right to suspend or terminate
        accounts that violate these Terms.
      </p>
    ),
  },
  {
    title: "8. Disclaimer of Warranties",
    content: (
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
        {SITE_NAME} is provided <strong className="text-foreground font-medium">"AS IS"</strong> and{" "}
        <strong className="text-foreground font-medium">"AS AVAILABLE"</strong> without warranties of any
        kind, express or implied, including but not limited to warranties of merchantability, fitness for a
        particular purpose, or non-infringement. We do not warrant that the service will be uninterrupted,
        error-free, or that data will be accurate or complete at all times. Mutual fund NAV data may be
        delayed or subject to errors from data providers.
      </p>
    ),
  },
  {
    title: "9. Limitation of Liability",
    content: (
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
        To the fullest extent permitted by applicable law, {SITE_NAME} and its owners, employees, and
        affiliates shall not be liable for any direct, indirect, incidental, special, consequential, or
        punitive damages arising from your use of the service, including any investment losses or financial
        decisions made based on information obtained from this platform. You use {SITE_NAME} entirely at
        your own risk.
      </p>
    ),
  },
  {
    title: "10. Service Availability",
    content: (
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
        We strive to maintain continuous availability but do not guarantee uninterrupted access to{" "}
        {SITE_NAME}. We reserve the right to modify, suspend, or discontinue any part of the service at
        any time without notice, including for maintenance, updates, or any other reason.
      </p>
    ),
  },
  {
    title: "11. Changes to Terms",
    content: (
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
        We may update these Terms of Service at any time. The "Last updated" date at the top of this page
        reflects the most recent revision. Continued use of {SITE_NAME} after changes are posted constitutes
        your acceptance of the revised terms.
      </p>
    ),
  },
  {
    title: "12. Governing Law",
    content: (
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
        These Terms are governed by and construed in accordance with the laws of India. Any disputes arising
        out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the
        competent courts in India.
      </p>
    ),
  },
];

export default function Terms() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Seo
        title="Terms of Service"
        description="FundScreener terms of service governing your use of our mutual fund screener, calculators, and related tools."
        path="/terms"
      />
      <div className="sticky top-0 z-[90] bg-[#0f1729]">
        <TickerTape />
        <Navbar />
      </div>

      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-2xl">

          {/* Header */}
          <div className="mb-8 flex items-center gap-3">
            <ScrollText className="h-6 w-6 shrink-0 text-violet-600" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Terms of Service</h1>
              <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mb-8 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-[13.5px] leading-relaxed text-amber-800">
              <span className="font-semibold">Important:</span> {SITE_NAME} is a data research tool, not a
              financial advisor. Nothing on this site constitutes investment advice.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-7">
            {sections.map((s) => (
              <div key={s.title}>
                <h2 className="mb-2 text-[15px] font-semibold text-foreground">{s.title}</h2>
                {s.content}
              </div>
            ))}
          </div>

          <div className="my-8 border-t border-slate-200" />

          <p className="text-[13.5px] text-muted-foreground">
            Questions?{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-violet-600 hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>

        </div>
      </main>

      <Footer />
    </div>
  );
}

