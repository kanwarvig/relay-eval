import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { NavLinks } from "@/components/nav-links";
import { demoReport } from "@/lib/demo-report";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Relay Eval — Workflow release evidence", template: "%s · Relay Eval" },
  description: "Run workflow versions repeatedly, inspect what actually happened, and block unsafe releases.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#080b18" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <div className="appShell">
          <header className="appHeader">
            <Link href="/" className="brand" aria-label="Relay Eval overview">
              <span className="brandMark" aria-hidden="true">R</span>
              <span><strong>Relay</strong><small>Eval</small></span>
            </Link>
            <NavLinks />
            <div className="headerMeta">
              <span className="environment">Synthetic demo</span>
              <span className="headerRun">{demoReport.testSet.version}</span>
            </div>
          </header>
          <div className="statusRail" aria-label="Evidence sequence">
            <div><span>Paired trials recorded</span><i /> <span>Final state inspected</span><i /> <span>Release policy evaluated</span><i /></div>
          </div>
          <main>{children}</main>
          <footer className="appFooter">
            <span>Relay Eval / harness {demoReport.harnessVersion}</span>
            <span>Deterministic test doubles · no real patient or customer data</span>
            <span><Link href="/api/runs">API</Link> · <code>npm run eval</code></span>
          </footer>
        </div>
      </body>
    </html>
  );
}
