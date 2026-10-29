import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of Service", description: "The rules for using SmartStock." };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={<p>These terms apply when you use SmartStock. By creating an account you agree to them. Please read them; they are short.</p>}
      sections={[
        {
          id: "service",
          title: "The service",
          body: (
            <p>
              SmartStock lets you record products, storage locations and stock movements. It is provided by {site.operator}. We may improve,
              change or discontinue features; we will give reasonable notice before removing anything you rely on.
            </p>
          ),
        },
        {
          id: "account",
          title: "Your account",
          body: (
            <ul>
              <li>You must give a valid email address and be at least 16 years old.</li>
              <li>Keep your password secret. You are responsible for activity under your account.</li>
              <li>Tell us promptly at <a href={`mailto:${site.securityEmail}`}>{site.securityEmail}</a> if you suspect unauthorised access.</li>
            </ul>
          ),
        },
        {
          id: "data",
          title: "Your data",
          body: (
            <p>
              You own the inventory data you put into SmartStock. You give us permission to store and process it only to provide the service.
              You can export or delete it at any time from Settings. Our <Link href="/privacy">Privacy Policy</Link> explains how we handle it.
            </p>
          ),
        },
        {
          id: "use",
          title: "Acceptable use",
          body: (
            <>
              <p>Do not:</p>
              <ul>
                <li>break the law or infringe anyone&apos;s rights using the service;</li>
                <li>try to access other users&apos; data, probe or bypass security, or overload the service;</li>
                <li>upload malware or use the service to send spam;</li>
                <li>resell or sublicense the service without our written permission.</li>
              </ul>
              <p>Security research done in good faith under our <Link href="/security">Security policy</Link> is welcome.</p>
            </>
          ),
        },
        {
          id: "availability",
          title: "Availability and accuracy",
          body: (
            <p>
              We work to keep SmartStock available and correct, but it is provided &ldquo;as is&rdquo; without warranties. Stock figures are only
              as accurate as the movements recorded; you remain responsible for business decisions based on them and for keeping your own records
              where the law requires.
            </p>
          ),
        },
        {
          id: "liability",
          title: "Liability",
          body: (
            <p>
              To the extent the law allows, we are not liable for indirect or consequential losses, lost profits or lost data. Nothing in these
              terms limits liability that cannot be limited by law.
            </p>
          ),
        },
        {
          id: "ending",
          title: "Ending your use",
          body: (
            <p>
              You can stop at any time and delete your account in Settings. We may suspend accounts that breach these terms or put the service at
              risk, and will tell you why unless the law prevents it.
            </p>
          ),
        },
        {
          id: "law",
          title: "Changes and governing law",
          body: (
            <p>
              We may update these terms and will post changes here with a new date. These terms are governed by the laws of {site.jurisdiction}.
              Questions: <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
            </p>
          ),
        },
      ]}
    />
  );
}
