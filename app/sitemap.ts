import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export const revalidate=60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
 const base="https://nayomoney.com";
 const fixed:MetadataRoute.Sitemap=[
  {url:base,lastModified:new Date(),changeFrequency:"weekly",priority:1},
  {url:`${base}/blog`,lastModified:new Date(),changeFrequency:"daily",priority:.9},
  {url:`${base}/promotions`,lastModified:new Date(),changeFrequency:"daily",priority:.85},
  {url:`${base}/crystal`,lastModified:new Date(),changeFrequency:"weekly",priority:.9},
  {url:`${base}/crystal/buy`,lastModified:new Date(),changeFrequency:"monthly",priority:.7},
  {url:`${base}/about`,lastModified:new Date(),changeFrequency:"monthly",priority:.6}
 ];
 const supabase=await createClient();
 if(!supabase) return fixed;
 const {data}=await supabase.from("posts").select("slug,updated_at,published_at").eq("status","published");
 const posts=(data||[]).map(p=>({url:`${base}/blog/${encodeURIComponent(p.slug)}`,lastModified:new Date(p.updated_at||p.published_at||Date.now()),changeFrequency:"weekly" as const,priority:.8}));
 return [...fixed,...posts];
}
