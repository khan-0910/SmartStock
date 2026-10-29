import { site } from "@/lib/site";

// RFC 9116 security contact file.
export function GET() {
  const expires = new Date(Date.now() + 365 * 86_400_000).toISOString();
  const body = [
    `Contact: mailto:${site.securityEmail}`,
    `Expires: ${expires}`,
    `Policy: ${site.url}/security`,
    `Preferred-Languages: en`,
    `Canonical: ${site.url}/.well-known/security.txt`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}
