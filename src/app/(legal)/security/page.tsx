import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Security", description: "How SmartStock protects your account and inventory data." };

export default function SecurityPage() {
  return (
    <LegalPage
      title="Security"
      intro={<p>Inventory you can trust needs a system you can trust. Here is how SmartStock protects your data, and how to report a problem.</p>}
      sections={[
        {
          id: "isolation",
          title: "Workspace isolation",
          body: (
            <p>
              Every table enforces PostgreSQL row-level security. Each read and write is checked against your workspace membership inside the
              database itself, so even a hand-crafted request cannot reach another workspace&apos;s rows. Anonymous visitors have no access to any
              business data.
            </p>
          ),
        },
        {
          id: "ledger",
          title: "Tamper-proof stock history",
          body: (
            <p>
              Stock only changes through one database function that locks the product, checks the live balance and writes the movement in the same
              transaction. Movements cannot be edited or deleted; corrections are new, visible adjustments. Your user ID and workspace are taken
              from your verified session, never from the browser.
            </p>
          ),
        },
        {
          id: "accounts",
          title: "Accounts and sessions",
          body: (
            <ul>
              <li>Passwords are hashed by Supabase Auth and must be at least 10 characters with letters and numbers.</li>
              <li>Repeated sign-in and sign-up attempts are rate-limited.</li>
              <li>Sessions use HTTP-only cookies and are re-verified on the server for every protected page and action.</li>
            </ul>
          ),
        },
        {
          id: "web",
          title: "Web protections",
          body: (
            <ul>
              <li>HTTPS everywhere, with HSTS in production.</li>
              <li>A strict, per-request Content Security Policy blocks injected scripts.</li>
              <li>Clickjacking protection (frame-ancestors none), no MIME sniffing, a strict referrer policy and a locked-down permissions policy.</li>
              <li>Built-in cross-site request forgery protection on all form actions.</li>
              <li>No secret service keys are ever sent to browsers.</li>
            </ul>
          ),
        },
        {
          id: "report",
          title: "Reporting a vulnerability",
          body: (
            <>
              <p>
                Found a security issue? Email <a href={`mailto:${site.securityEmail}`}>{site.securityEmail}</a> with steps to reproduce. Please give
                us reasonable time to fix it before disclosing it publicly, and do not access or change other people&apos;s data while testing.
              </p>
              <p>We will acknowledge good-faith reports and will not pursue legal action against researchers who follow this policy.</p>
            </>
          ),
        },
      ]}
    />
  );
}
