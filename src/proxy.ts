import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/supabase/env";

// Signed-in area is everything except these.
const PUBLIC_PATHS = ["/login", "/signup", "/auth", "/privacy", "/terms", "/cookies", "/security", "/.well-known"];

/**
 * Per-request Content-Security-Policy with a fresh nonce. Next.js reads the
 * nonce from the request header and stamps it on its own scripts, so no
 * inline script runs without it.
 */
function contentSecurityPolicy(nonce: string, supabaseUrl: string) {
  const isDev = process.env.NODE_ENV !== "production";
  const supabase = new URL(supabaseUrl).origin;
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Styles: the dev server, next/font and animation libraries inject <style>
    // tags without a nonce. Inline CSS cannot run code, so scripts keep the
    // strict nonce policy and styles allow inline.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `media-src 'self' blob:`,
    `connect-src 'self' ${supabase}${isDev ? " ws://localhost:* ws://127.0.0.1:*" : ""}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

// Refreshes the Supabase session cookie on every request, keeps signed-out
// visitors on public pages and applies the CSP. Server pages and actions
// re-check the user; this is only the first line of defence.
export async function proxy(request: NextRequest) {
  const { url, anonKey } = supabaseEnv();
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce, url);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const next = () => {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("Content-Security-Policy", csp);
    return res;
  };
  let response = next();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        requestHeaders.set("cookie", request.cookies.toString());
        response = next();
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = path === "/" || PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && !isPublic) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("next", path + request.nextUrl.search);
    return redirectWithCookies(login, response);
  }

  // Signed-in visitors skip the marketing page and auth forms.
  if (user && (path === "/" || path === "/login" || path === "/signup")) {
    const home = request.nextUrl.clone();
    home.pathname = "/dashboard";
    home.search = "";
    return redirectWithCookies(home, response);
  }

  return response;
}

function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
