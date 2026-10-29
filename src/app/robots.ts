import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/privacy", "/terms", "/cookies", "/security", "/login", "/signup"],
        // Signed-in app and API: nothing useful to index, keep crawlers out.
        disallow: ["/dashboard", "/products", "/scan", "/movements", "/locations", "/settings", "/api/", "/auth/"],
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
