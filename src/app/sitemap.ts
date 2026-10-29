import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/signup", "/login", "/privacy", "/terms", "/cookies", "/security"].map((path) => ({
    url: `${site.url}${path}`,
    changeFrequency: path ? "yearly" : "monthly",
    priority: path ? 0.4 : 1,
  }));
}
