import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://nayomoney.com";
  return [
    {url:base,lastModified:new Date(),changeFrequency:"weekly",priority:1},
    {url:`${base}/blog`,lastModified:new Date(),changeFrequency:"daily",priority:.9},
    {url:`${base}/crystal`,lastModified:new Date(),changeFrequency:"weekly",priority:.9},
    {url:`${base}/crystal/buy`,lastModified:new Date(),changeFrequency:"monthly",priority:.7},
    {url:`${base}/about`,lastModified:new Date(),changeFrequency:"monthly",priority:.6}
  ];
}
