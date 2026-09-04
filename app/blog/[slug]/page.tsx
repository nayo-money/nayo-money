import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const revalidate=60;

type PostData={
 id:string; title:string; slug:string; excerpt:string|null; content:string|null; cover_image:string|null;
 category_id:string|null; published_at:string|null; updated_at:string|null;
 seo_title:string|null; seo_description:string|null; seo_keywords:string|null; canonical_url:string|null; og_image:string|null;
 categories?:{name:string}|null;
};

async function getPost(slug:string){
 const supabase=await createClient();
 if(!supabase) return null;
 const {data}=await supabase.from("posts").select("*, categories(name)").eq("slug",slug).eq("status","published").maybeSingle();
 return data as PostData|null;
}

function makeDescription(post:PostData){
 const plain=String(post.excerpt||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
 return (post.seo_description||plain||post.title).slice(0,160);
}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 const {slug}=await params; const post=await getPost(slug);
 if(!post) return {};
 const title=post.seo_title||post.title;
 const description=makeDescription(post);
 const canonical=post.canonical_url||`https://nayomoney.com/blog/${encodeURIComponent(post.slug)}`;
 const image=post.og_image||post.cover_image||undefined;
 return {
  title, description,
  keywords:post.seo_keywords||undefined,
  alternates:{canonical},
  openGraph:{title,description,url:canonical,type:"article",locale:"zh_TW",siteName:"Nayo 娜攸",images:image?[{url:image}]:undefined,publishedTime:post.published_at||undefined,modifiedTime:post.updated_at||post.published_at||undefined},
  twitter:{card:"summary_large_image",title,description,images:image?[image]:undefined},
  robots:{index:true,follow:true},
 };
}

function slugifyHeading(text:string,index:number){
 const base=text.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-+|-+$/g,"").slice(0,70);
 return `heading-${base||index}`;
}
function prepareContent(html:string){
 let i=0;
 const toc:{id:string;label:string;level:number}[]=[];
 const content=String(html||"").replace(/<(h[2-4])([^>]*)>([\s\S]*?)<\/\1>/gi,(_m,tag,attrs,inner)=>{
   i++; const label=inner.replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim();
   const existing=(attrs.match(/\bid=["']([^"']+)["']/i)||[])[1];
   const id=existing||slugifyHeading(label,i); toc.push({id,label,level:Number(tag.substring(1))});
   const cleanAttrs=String(attrs).replace(/\s+id=["'][^"']*["']/gi,"");
   return `<${tag}${cleanAttrs} id="${id}">${inner}</${tag}>`;
 });
 return {content,toc};
}

function Toc({items}:{items:{id:string;label:string;level:number}[]}){
 if(items.length<2) return null;
 return <nav className="post-toc" aria-label="文章目錄"><div className="post-toc-title">文章目錄</div><ol>{items.map(item=><li key={item.id} className={`toc-level-${item.level}`}><a href={`#${item.id}`}>{item.label}</a></li>)}</ol></nav>;
}

function ArticleSchema({post}:{post:PostData}){
 const canonical=post.canonical_url||`https://nayomoney.com/blog/${encodeURIComponent(post.slug)}`;
 const image=post.og_image||post.cover_image;
 const json={"@context":"https://schema.org","@type":"Article",headline:post.title,description:makeDescription(post),mainEntityOfPage:{"@type":"WebPage","@id":canonical},datePublished:post.published_at||undefined,dateModified:post.updated_at||post.published_at||undefined,author:{"@type":"Person",name:"Nayo 娜攸",url:"https://nayomoney.com/about"},publisher:{"@type":"Organization",name:"Nayo 娜攸",url:"https://nayomoney.com"},image:image?[image]:undefined};
 return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(json)}}/>;
}

export default async function Post({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params; const data=await getPost(slug); if(!data)notFound();
 const prepared=prepareContent(data.content||`<p>${data.excerpt||""}</p>`);
 return <main className="container page">
  <div className="eyebrow">{data.categories?.name||"NAYO BLOG"}</div>
  <h1>{data.title}</h1>
  <p className="post-updated">更新日期：{(data.updated_at||data.published_at)?new Date(data.updated_at||data.published_at||"").toLocaleDateString("zh-TW"):""}</p>
  {data.cover_image&&<img src={data.cover_image} alt={data.title} style={{width:"100%",maxHeight:500,objectFit:"cover",borderRadius:24,margin:"20px 0"}}/>}
  <Toc items={prepared.toc}/>
  <article className="post-content" dangerouslySetInnerHTML={{__html:prepared.content}}/>
  <ArticleSchema post={data}/>
 </main>
}
