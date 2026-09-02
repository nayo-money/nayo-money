import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export const revalidate=60;
export default async function Post({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params; const supabase=await createClient(); if(!supabase) notFound();
 const {data}=await supabase.from("posts").select("*, categories(name)").eq("slug",slug).eq("status","published").maybeSingle(); if(!data)notFound();
 return <main className="container page"><div className="eyebrow">{data.categories?.name||"NAYO BLOG"}</div><h1>{data.title}</h1><p style={{color:"#948984",fontSize:12}}>{data.published_at?new Date(data.published_at).toLocaleDateString("zh-TW"):""}</p>{data.cover_image&&<img src={data.cover_image} alt="" style={{width:"100%",maxHeight:500,objectFit:"cover",borderRadius:24,margin:"20px 0"}}/>}<article style={{maxWidth:820,lineHeight:2,fontSize:16}} dangerouslySetInnerHTML={{__html:data.content||`<p>${data.excerpt||""}</p>`}}/></main>
}
