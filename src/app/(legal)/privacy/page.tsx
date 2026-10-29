import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy", description: "How SmartStock collects, uses and protects your data." };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          SmartStock is an inventory tool. We collect the minimum needed to run it: your login and the inventory data you enter. We do not
          sell data, show ads or use tracking cookies.
        </p>
      }
      sections={[
        {
          id: "who",
          title: "Who we are",
          body: (
            <p>
              {site.operator} (&ldquo;we&rdquo;) operates SmartStock and is the controller of the personal data described here. Contact us at{" "}
              <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
            </p>
          ),
        },
        {
          id: "collect",
          title: "What we collect",
          body: (
            <>
              <ul>
                <li><strong>Account data:</strong> your email address and a securely hashed password (we never see or store it in plain text).</li>
                <li><strong>Inventory data:</strong> products, barcodes, prices, locations and stock movements you create, including which account recorded each movement and when.</li>
                <li><strong>Technical data:</strong> IP address, browser type and request logs kept by our hosting providers for security and troubleshooting.</li>
                <li><strong>Session cookies:</strong> strictly necessary cookies that keep you signed in (see the <Link href="/cookies">Cookie Policy</Link>).</li>
              </ul>
              <p>
                <strong>Camera:</strong> when you scan with your camera, video is decoded entirely in your browser. Frames are never recorded,
                stored or sent to us. Only the decoded barcode text is used to look up a product.
              </p>
            </>
          ),
        },
        {
          id: "use",
          title: "How we use it",
          body: (
            <ul>
              <li>To provide the service: sign you in, store your inventory and show your history (performance of a contract).</li>
              <li>To keep it secure: detect abuse, rate-limit sign-in attempts and investigate incidents (legitimate interests).</li>
              <li>To send essential account emails such as sign-up confirmation and password reset.</li>
            </ul>
          ),
        },
        {
          id: "share",
          title: "Who we share it with",
          body: (
            <>
              <p>We do not sell or rent personal data. We use these service providers (processors) to run SmartStock:</p>
              <ul>
                <li><strong>Supabase</strong> for the database and authentication.</li>
                <li><strong>Our web host</strong> (for example Vercel) to serve the application.</li>
              </ul>
              <p>We may disclose data if required by law or to protect the rights and safety of users and the service.</p>
            </>
          ),
        },
        {
          id: "retention",
          title: "How long we keep it",
          body: (
            <p>
              We keep your data while your account exists. When you delete your account, your login, workspace and inventory history are
              deleted immediately from the live database. Copies may remain in encrypted provider backups for a limited period before they are
              overwritten.
            </p>
          ),
        },
        {
          id: "rights",
          title: "Your rights",
          body: (
            <>
              <p>Depending on where you live you may have the right to access, correct, export, restrict or delete your data, and to object to processing.</p>
              <ul>
                <li><strong>Export:</strong> Settings → Your data → Download my data.</li>
                <li><strong>Delete:</strong> Settings → Delete account. This is permanent.</li>
                <li><strong>Anything else:</strong> email <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>. You may also complain to your local data protection authority.</li>
              </ul>
            </>
          ),
        },
        {
          id: "security",
          title: "Security",
          body: (
            <p>
              Data is encrypted in transit (HTTPS) and protected by database row-level security so each workspace can only reach its own rows.
              Read more on our <Link href="/security">Security page</Link>.
            </p>
          ),
        },
        {
          id: "transfers",
          title: "International transfers",
          body: <p>Our providers may process data in other countries. Where required, transfers rely on appropriate safeguards such as standard contractual clauses.</p>,
        },
        {
          id: "children",
          title: "Children",
          body: <p>SmartStock is a business tool and is not intended for anyone under 16. We do not knowingly collect data from children.</p>,
        },
        {
          id: "changes",
          title: "Changes to this policy",
          body: <p>We will post any changes here and update the date at the top. Significant changes will be highlighted in the app.</p>,
        },
      ]}
    />
  );
}
