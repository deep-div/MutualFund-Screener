import { Info, Mail, HeadphonesIcon, ShieldCheck, BarChart2, Filter, BookOpen, Scale } from "lucide-react";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import TickerTape from "@/components/TickerTape";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { SITE_NAME, CONTACT_EMAIL, SUPPORT_EMAIL, PRIVACY_EMAIL, LEGAL_EMAIL } from "@/lib/siteConfig";

export default function About() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Seo
        title="About"
        description="About FundScreener — a free mutual fund screener and analytics tool that helps Indian investors research, compare, and filter funds by returns, risk, and cost."
        path="/about"
      />
      <div className="sticky top-0 z-[90] bg-[#0f1729]">
        <TickerTape />
        <Navbar />
      </div>

      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-2xl">

          {/* Header */}
          <div className="mb-8 flex items-center gap-3">
            <Info className="h-6 w-6 shrink-0 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">About & Contact</h1>
              <p className="text-sm text-muted-foreground">Learn about {SITE_NAME} and get in touch</p>
            </div>
          </div>

          {/* About Section */}
          <section className="space-y-5">
            <h2 className="text-[15px] font-semibold text-foreground">What is {SITE_NAME}?</h2>
            <p className="text-[13.5px] leading-relaxed text-muted-foreground">
              {SITE_NAME} is a free mutual fund screening and research tool built for Indian retail investors.
              It helps you cut through thousands of funds to find the ones that genuinely match your investment goals —
              without the noise of brokerage recommendations or sponsored content.
            </p>
            <p className="text-[13.5px] leading-relaxed text-muted-foreground">
              All fund data is sourced directly from AMFI (Association of Mutual Funds in India) and is refreshed
              regularly. {SITE_NAME} is purely informational — it does not provide investment advice or
              execute transactions.
            </p>

            {/* Feature grid */}
            <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
              {[
                {
                  icon: <Filter className="h-4 w-4 text-blue-600" />,
                  title: "Advanced Screening",
                  desc: "Filter funds by category, AMC, risk grade, returns, expense ratio, AUM, and more.",
                },
                {
                  icon: <BarChart2 className="h-4 w-4 text-blue-600" />,
                  title: "Fund Analytics",
                  desc: "Deep-dive into any fund — NAV history, trailing returns, portfolio holdings, and risk metrics.",
                },
                {
                  icon: <BookOpen className="h-4 w-4 text-blue-600" />,
                  title: "Learn",
                  desc: "Beginner-friendly guides on mutual fund concepts, SIPs, and how to read a fund factsheet.",
                },
                {
                  icon: <ShieldCheck className="h-4 w-4 text-blue-600" />,
                  title: "No Conflict of Interest",
                  desc: "No commissions. No distribution tie-ups. Just clean, unbiased data.",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="rounded-lg border border-border bg-muted/30 px-4 py-3.5 space-y-1"
                >
                  <div className="flex items-center gap-2">
                    {f.icon}
                    <span className="text-[13.5px] font-medium text-foreground">{f.title}</span>
                  </div>
                  <p className="text-[12.5px] leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>

            <p className="text-[13.5px] leading-relaxed text-muted-foreground pt-1">
              {SITE_NAME} is maintained independently. If you find a data error, a broken feature, or just
              want to share feedback, we'd genuinely like to hear from you.
            </p>
          </section>

          <div className="my-8 border-t border-slate-200" />

          {/* Contact Section */}
          <section className="space-y-5">
            <h2 className="text-[15px] font-semibold text-foreground">Contact Us</h2>
            <p className="text-[13.5px] leading-relaxed text-muted-foreground">
              We typically respond within 1–2 business days.
            </p>

            <div className="space-y-3">
              {[
                {
                  icon: <Mail className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />,
                  label: "General enquiries",
                  email: CONTACT_EMAIL,
                },
                {
                  icon: <HeadphonesIcon className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />,
                  label: "Technical support",
                  email: SUPPORT_EMAIL,
                },
                {
                  icon: <ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />,
                  label: "Privacy & data requests",
                  email: PRIVACY_EMAIL,
                },
                {
                  icon: <Scale className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />,
                  label: "Legal & terms",
                  email: LEGAL_EMAIL,
                },
              ].map((c) => (
                <div
                  key={c.email}
                  className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3.5"
                >
                  {c.icon}
                  <div>
                    <p className="text-[12.5px] text-muted-foreground">{c.label}</p>
                    <a
                      href={`mailto:${c.email}`}
                      className="text-[13.5px] font-medium text-blue-600 hover:underline"
                    >
                      {c.email}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="my-8 border-t border-slate-200" />

          <p className="text-[13px] text-muted-foreground">
            By using {SITE_NAME} you agree to our{" "}
            <Link to="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
            {" "}and{" "}
            <Link to="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>.
          </p>

        </div>
      </main>

      <Footer />
    </div>
  );
}
