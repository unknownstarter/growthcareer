import type { MetadataRoute } from "next";

const BASE = "https://growthcareer.xyz";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${BASE}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    {
      url: `${BASE}/fan-to-pro`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
