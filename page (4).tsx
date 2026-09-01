import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
export const revalidate = 60;
export const metadata = {title:"理財 Blog",description:"Nayo 娜攸生活理財 Blog：信用卡回饋、小資理財、旅行生活與水晶內容。"};
export default async function Blog(){
 const supabase=await createClient(); let posts:any[]=[];
 if(supabase){const {data}=await supabase.from("posts").select("id,title,slug,excerpt,cover_image,published_at,categories(name)").eq("status","published").order("published_at",{ascending:false});posts=data||[]}
 if(!posts.length) posts=[{id:"demo",title:"開始整理 Nayo Blog",slug:"",excerpt:"登入管理後台新增文章後，文章會自動出現在這裡。",categories:{name:"理財"}}];
 return <main className="container page"><div className="eyebrow">NAYO BLOG</div><h1>生活理財 Blog</h1><p className="page-intro">信用卡回饋、小資理財、旅行生活，也可以寫生命靈數與水晶。登入後台即可直接新增、修改與發布。</p><div className="post-list">{posts.map(p=><article className="post-row" key={p.id}>{p.cover_image&&<img src={p.cover_image} alt="" style={{width:"100%",maxHeight:260,objectFit:"cover",borderRadius:14}}/>}<small className="section-kicker">{p.categories?.name||"生活"}</small><h2>{p.title}</h2><p>{p.excerpt||""}</p>{p.slug&&<Link className="more" href={`/blog/${p.slug}`}>閱讀全文 →</Link>}</article>)}</div></main>
}
