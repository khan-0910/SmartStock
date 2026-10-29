import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Cookie Policy", description: "SmartStock only uses strictly necessary cookies." };

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro={<p>SmartStock uses only strictly necessary cookies to keep you signed in. No analytics, advertising or tracking cookies, so there is no cookie banner to click through.</p>}
      sections={[
        {
          id: "what",
          title: "Cookies we set",
          body: (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink/15 text-xs uppercase tracking-wide text-ink/60">
                  <tr>
                    <th scope="col" className="py-2 pr-4">Name</th>
                    <th scope="col" className="py-2 pr-4">Purpose</th>
                    <th scope="col" className="py-2">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs">sb-*-auth-token</td>
                    <td className="py-2 pr-4">Keeps you signed in and lets the server verify who you are (set by Supabase Auth).</td>
                    <td className="py-2">Session, refreshed while you use the app</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs">sb-*-auth-token-code-verifier</td>
                    <td className="py-2 pr-4">Protects the email confirmation and sign-in flow (PKCE).</td>
                    <td className="py-2">Minutes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ),
        },
        {
          id: "none",
          title: "What we do not use",
          body: (
            <ul>
              <li>No analytics or advertising cookies.</li>
              <li>No third-party trackers or social media pixels.</li>
              <li>Product photos are served from our own domain, so third-party image hosts cannot set cookies on you.</li>
            </ul>
          ),
        },
        {
          id: "control",
          title: "Your choices",
          body: (
            <p>
              Because these cookies are strictly necessary, the law does not require consent for them. You can block or delete them in your browser
              settings, but you will not be able to stay signed in. Signing out removes the session cookie.
            </p>
          ),
        },
      ]}
    />
  );
}
