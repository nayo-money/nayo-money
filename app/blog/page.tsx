import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;
export const metadata = {title:"理財 Blog",description:"Nayo 娜攸生活理財 Blog。"};
type MenuItem={id:string;label:string;url:string;pageDescription?:string;children?:MenuItem[]};
const defaultBlog:MenuItem={id:"blog",label:"理財 Blog",url:"/blog",pageDescription:"信用卡回饋、小資理財、旅行生活，也可以寫生命靈數與水晶。",children:[{id:"blog-all",label:"全部文章",url:"/blog"},{id:"blog-credit",label:"信用卡回饋",url:"/blog?category=credit-card"},{id:"blog-finance",label:"小資理財",url:"/blog?category=finance"},{id:"blog-life",label:"旅行 × 生活",url:"/blog?category=lifestyle"},{id:"blog-crystal",label:"生命靈數 × 水晶",url:"/blog?category=crystal"}]};

export default async function Blog({ searchParams }: { searchParams?: Promise<{ category?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const selectedCategory = params.category || "";
  const supabase = await createClient();
  let posts:any[]=[];
  let blog=defaultBlog;
  if(supabase){
    const [postResult,settingResult]=await Promise.all([
      supabase.from("posts").select("id,title,slug,excerpt,cover_image,published_at,categories(name,slug)").eq("status","published").order("published_at",{ascending:false}),
      supabase.from("site_settings").select("setting_key,setting_value").eq("setting_key","menu_json").maybeSingle()
    ]);
    posts=postResult.data||[];
    if(settingResult.data?.setting_value){try{const menu=JSON.parse(settingResult.data.setting_value);const found=Array.isArray(menu)?menu.find((x:MenuItem)=>x.id==="blog"||x.url==="/blog"):null;if(found)blog={...defaultBlog,...found,children:Array.isArray(found.children)?found.children:defaultBlog.children};}catch{}}
  }
  if(!posts.length && !selectedCategory) posts=[];
  const children=blog.children||[];
  const selectedChild=children.find(c=>c.url.includes(`category=${selectedCategory}`));
  const selectedLabel=selectedChild?.label||"";
  if(selectedCategory){
    posts=posts.filter(p=>{const cat=p.categories;const slug=cat?.slug||"";return slug===selectedCategory || (!slug && selectedLabel && cat?.name===selectedLabel);});
  }
  return <main className="container page">
    <div className="eyebrow">NAYO BLOG</div>
    <h1>{selectedLabel || blog.label}</h1>
    <p className="page-intro">{selectedCategory ? (selectedChild?.pageDescription || blog.pageDescription || "") : (blog.pageDescription||"")}</p>
    <div className="blog-filters">
      {children.map(child=>{const isAll=!child.url.includes("category=");const href=isAll?child.url:child.url;const active=isAll?!selectedCategory:selectedCategory===new URL(child.url,"https://nayo.local").searchParams.get("category");return <Link key={child.id} className={active?"active":""} href={href}>{child.label}</Link>})}
    </div>
    {posts.length ? <div className="post-list">{posts.map(p=><article className="post-row" key={p.id}>
      {p.cover_image&&<img src={p.cover_image} alt="" style={{width:"100%",maxHeight:260,objectFit:"cover",borderRadius:14}}/>}
      <small className="section-kicker">{p.categories?.name||"生活"}</small><h2>{p.title}</h2><p>{p.excerpt||""}</p>{p.slug&&<Link className="more" href={`/blog/${p.slug}`}>閱讀全文 →</Link>}
    </article>)}</div> : <div className="empty-state">{selectedCategory?"這個分類目前還沒有公開文章。":"目前還沒有公開文章，登入管理後台新增文章後會自動出現在這裡。"}</div>}
  </main>;
}
