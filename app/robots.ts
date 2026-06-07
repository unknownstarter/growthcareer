import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/llms.txt"],
        disallow: ["/admin", "/admin/"],
      },
    ],
    sitemap: "https://growthcareer.xyz/sitemap.xml",
    host: "https://growthcareer.xyz",
  };
}
