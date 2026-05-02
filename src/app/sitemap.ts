import type { MetadataRoute } from "next";

/**
 * Public-only sitemap. Authenticated routes (/admin, /portal), token-gated
 * routes (/manage, /intake), and mid-flow booking pages (/book/confirm,
 * /book/success) are intentionally excluded - see public/robots.txt for the
 * matching `Disallow` rules.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "";
  const now = new Date();

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/book`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/book/any`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
