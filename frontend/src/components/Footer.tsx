import { Link } from "react-router-dom";
import { CONTACT_EMAIL } from "@/lib/siteConfig";

const CURRENT_YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="bg-[#0f1729] text-white/70">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">

          {/* Brand */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="FundScreener logo" className="h-6 w-9" />
              <span className="text-[15px] font-bold text-white">FundScreener</span>
            </div>
            <p className="text-[13px] leading-relaxed text-white/50">
              Screen, analyse, and compare Indian mutual funds.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/40">Quick Links</p>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-[13px] text-white/60 transition-colors hover:text-white">
                  Screener
                </Link>
              </li>
              <li>
                <Link to="/tools" className="text-[13px] text-white/60 transition-colors hover:text-white">
                  Calculators
                </Link>
              </li>
              <li>
                <Link to="/learn" className="text-[13px] text-white/60 transition-colors hover:text-white">
                  Learn
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-[13px] text-white/60 transition-colors hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-[13px] text-white/60 transition-colors hover:text-white">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-[13px] text-white/60 transition-colors hover:text-white">
                  About & Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/40">Contact Us</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-[13px] text-white/60 transition-colors hover:text-white"
            >
              {CONTACT_EMAIL}
            </a>
            <p className="mt-3 text-[12px] text-white/35 leading-relaxed">
              Data sourced from AMFI. For informational use only - not investment advice.
            </p>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t border-white/10 pt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-[12px] text-white/35">
            © {CURRENT_YEAR} FundScreener. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="text-[12px] text-white/35 hover:text-white/70 transition-colors">
              Privacy
            </Link>
            <span className="text-white/20">·</span>
            <Link to="/terms" className="text-[12px] text-white/35 hover:text-white/70 transition-colors">
              Terms
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}

