import { ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import TickerTape from "@/components/TickerTape";
import Footer from "@/components/Footer";

import { SITE_NAME, SITE_URL, PRIVACY_EMAIL as CONTACT_EMAIL } from "@/lib/siteConfig";

const LAST_UPDATED = "May 15, 2026";

interface Section {
  title: string;
  content: React.ReactNode;
}

const sections: Section[] = [
  {
    title: "1. Introduction",
    content: (
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
        {SITE_NAME},{" "}
        <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          {SITE_URL}
        </a>
        , is a mutual fund screening and research tool for Indian investors.
        This Privacy Policy describes how we collect, use, and share information when you visit our website.
        By using {SITE_NAME}, you consent to the practices described in this policy.
      </p>
    ),
  },
  {
    title: "2. Information We Collect",
    content: (
      <div className="space-y-2 text-[13.5px] leading-relaxed text-muted-foreground">
        <p><strong className="text-foreground font-medium">Account data:</strong> When you register or sign in with Google, we collect your email address and display name via Google OAuth.</p>
        <p><strong className="text-foreground font-medium">Usage data:</strong> We automatically collect information about how you use the site - pages visited, filters applied, search queries, and feature interactions - to improve the service.</p>
        <p><strong className="text-foreground font-medium">Technical data:</strong> IP address, browser type, operating system, referring URLs, and device identifiers collected via server logs and analytics tools.</p>
        <p><strong className="text-foreground font-medium">User-generated content:</strong> Screens (filter sets) and watchlists you save within the app.</p>
      </div>
    ),
  },
  {
    title: "3. How We Use Your Information",
    content: (
      <ul className="list-disc pl-5 space-y-1 text-[13.5px] leading-relaxed text-muted-foreground">
        <li>Authenticate your account and maintain your session.</li>
        <li>Save and restore your screens and watchlists.</li>
        <li>Analyse usage patterns to improve features and performance.</li>
        <li>Serve relevant advertisements via Google AdSense (see Section 5).</li>
        <li>Send transactional emails only (e.g., account-related notifications). We do not send marketing emails without your explicit consent.</li>
        <li>Comply with legal obligations.</li>
      </ul>
    ),
  },
  {
    title: "4. Cookies & Tracking Technologies",
    content: (
      <div className="space-y-2 text-[13.5px] leading-relaxed text-muted-foreground">
        <p>We use the following types of cookies and local storage:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground font-medium">Essential cookies:</strong> Required for authentication, session management, and security. These cannot be disabled without breaking core functionality.</li>
          <li><strong className="text-foreground font-medium">Preference storage:</strong> We use browser <code className="text-[12px] bg-muted px-1 py-0.5 rounded">localStorage</code> to restore your last-used filter preferences.</li>
          <li><strong className="text-foreground font-medium">Analytics cookies:</strong> Used to understand how visitors interact with the site (e.g., Google Analytics).</li>
          <li><strong className="text-foreground font-medium">Advertising cookies:</strong> Set by Google AdSense and associated partners (including the DoubleClick DART cookie) to deliver relevant advertisements based on your prior visits to this site and other sites on the Internet. You can manage or disable these as described in Section 5.</li>
        </ul>
        <p>You can disable cookies through your browser settings, but this may affect site functionality.</p>
      </div>
    ),
  },
  {
    title: "5. Third-Party Advertising (Google AdSense)",
    content: (
      <div className="space-y-2 text-[13.5px] leading-relaxed text-muted-foreground">
        <p>
          {SITE_NAME} uses <strong className="text-foreground font-medium">Google AdSense</strong>, a third-party advertising service provided by Google LLC, to display advertisements on this website.
          Google AdSense uses cookies — including the <strong className="text-foreground font-medium">DoubleClick DART cookie</strong> — to serve ads based on your prior visits to this website and other websites on the Internet.
        </p>
        <p>
          Google, as a third-party vendor, uses these cookies to serve ads to users based on their visit to {SITE_NAME} and other sites on the Internet. The use of the DART cookie enables Google and its partners to serve ads based on your interests and browsing history.
        </p>
        <p>
          You can control or disable advertising cookies at any time using the opt-out options below or through your browser's cookie settings.
        </p>
        <p className="font-medium text-foreground">Opt-out options:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Opt out of personalised advertising by Google:{" "}
            <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              adssettings.google.com
            </a>
          </li>
          <li>
            Opt out via the Network Advertising Initiative (NAI):{" "}
            <a href="https://optout.networkadvertising.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              optout.networkadvertising.org
            </a>
          </li>
          <li>
            Opt out via the Digital Advertising Alliance:{" "}
            <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              optout.aboutads.info
            </a>
          </li>
        </ul>
        <p>
          For more information on how Google uses data collected via advertising, please review{" "}
          <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Google's Advertising &amp; Privacy Policy
          </a>.
        </p>
      </div>
    ),
  },
  {
    title: "6. Third-Party Services",
    content: (
      <div className="space-y-2 text-[13.5px] leading-relaxed text-muted-foreground">
        <p>We use the following third-party services that may independently collect or process data:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground font-medium">Google Firebase</strong> - authentication and user data storage, governed by{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google's Privacy Policy</a>.
          </li>
          <li><strong className="text-foreground font-medium">Google AdSense</strong> - display advertising (see Section 5).</li>
          <li><strong className="text-foreground font-medium">Google Analytics</strong> - website usage analytics, governed by{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google's Privacy Policy</a>.
          </li>
        </ul>
        <p>We do not sell, trade, or rent your personal data to any third party for their own marketing purposes.</p>
      </div>
    ),
  },
  {
    title: "7. Data Storage & Security",
    content: (
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
        All data is transmitted over HTTPS (TLS encryption). Authentication and user data are stored using Google Firebase, which applies industry-standard security controls. We retain your account data for as long as your account remains active. Usage and technical logs may be retained for up to 12 months for analytical purposes.
      </p>
    ),
  },
  {
    title: "8. Children's Privacy (COPPA)",
    content: (
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
        {SITE_NAME} is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, please contact us immediately at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a>{" "}
        and we will delete it promptly.
      </p>
    ),
  },
  {
    title: "9. Your Rights",
    content: (
      <div className="space-y-2 text-[13.5px] leading-relaxed text-muted-foreground">
        <p>You have the following rights regarding your personal data:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground font-medium">Access & correction:</strong> Update your display name from your Profile page.</li>
          <li><strong className="text-foreground font-medium">Deletion:</strong> Delete your screens and watchlists directly within the app. To delete your account and all associated data, contact us.</li>
          <li><strong className="text-foreground font-medium">Opt-out of ads:</strong> Use the opt-out links in Section 5 to manage interest-based advertising preferences.</li>
          <li><strong className="text-foreground font-medium">Cookie management:</strong> Adjust or disable cookies via your browser settings.</li>
        </ul>
      </div>
    ),
  },
  {
    title: "10. Changes to This Policy",
    content: (
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
        We may update this Privacy Policy from time to time. The "Last updated" date at the top of this page will reflect any changes. Continued use of {SITE_NAME} after changes are posted constitutes your acceptance of the revised policy.
      </p>
    ),
  },
];

export default function Privacy() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Seo
        title="Privacy Policy"
        description="FundScreener privacy policy — how we collect, use, and protect your personal data when you use our mutual fund screener and tools."
        path="/privacy"
      />
      <div className="sticky top-0 z-[90] bg-[#0f1729]">
        <TickerTape />
        <Navbar />
      </div>

      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-2xl">

          {/* Header */}
          <div className="mb-8 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 shrink-0 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
              <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>
            </div>
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
            Questions or data requests?{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-blue-600 hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>

        </div>
      </main>

      <Footer />
    </div>
  );
}

