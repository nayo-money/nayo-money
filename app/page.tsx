import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

const fallback = {
  site_name: "Nayo 娜攸", site_tagline: "生活理財 × 水晶", profile_name: "娜攸", profile_image: "", hero_image: "",
  hero_title: "把理財變成，喜歡的生活。", hero_highlight: "喜歡的生活",
  hero_description: "分享信用卡回饋、小資理財、旅行生活，也記錄生命靈數與水晶。",
  primary_label: "逛理財 Blog", primary_url: "/blog", secondary_label: "探索 Nayo Crystal", secondary_url: "/crystal",
};

export default async function Home() {
  const supabase = await createClient();
  let settings:any = fallback;
  let posts:any[] = [];
  let products:any[] = [];
  let crystals:any[] = [];

  if (supabase) {
    const [s,p,pr,c] = await Promise.all([
      supabase.from("site_settings").select("*").eq("id",true).maybeSingle(),
      supabase.from("posts").select("id,title,slug,excerpt,cover_image,published_at,status,categories(name)").eq("status","published").order("published_at",{ascending:false}).limit(6),
      supabase.from("products").select("id,name,image,missing_numbers,description,price,purchase_url").order("sort_order").limit(6),
      supabase.from("crystals").select("id,name,image,life_numbers,meaning,color").order("sort_order").limit(6),
    ]);
    if (s.data) settings = {...fallback,...s.data};
    posts = p.data || [];
    products = pr.data || [];
    crystals = c.data || [];
  }

  const titleParts = settings.hero_title.split(settings.hero_highlight || "喜歡的生活");
  return <main>
    <section className="container hero">
      <div>
        <div className="eyebrow">{settings.site_name} · {settings.site_tagline}</div>
        <h1>{titleParts[0]}{settings.hero_highlight && <span>{settings.hero_highlight}</span>}{titleParts[1]}</h1>
        <p>{settings.hero_description}</p>
        <div className="actions"><Link className="btn primary" href={settings.primary_url}>{settings.primary_label}</Link><Link className="btn soft" href={settings.secondary_url}>{settings.secondary_label}</Link></div>
      </div>
      <div className="hero-card">
        {settings.hero_image ? <img src={settings.hero_image} alt="Nayo 首頁主圖" style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0}}/> : <div className="hero-circle">N</div>}
        <div className="hero-label"><strong>{settings.profile_name}</strong><span>生活理財 × 水晶</span></div>
      </div>
    </section>

    <section className="container section">
      <div className="section-head"><div><div className="section-kicker">LATEST BLOG</div><div className="section-title">最近的文章</div></div><Link className="more" href="/blog">看全部 →</Link></div>
      <div className="article-grid">{(posts.length?posts:[{id:"1",title:"信用卡回饋與小資理財",excerpt:"登入後從後台新增文章，就會出現在這裡。",slug:"",categories:{name:"理財"}}]).map((p:any)=><article className="article" key={p.id}><div className="article-cover">{p.cover_image?<img src={p.cover_image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"Nayo Blog"}</div><div className="article-body"><div className="article-cat">{p.categories?.name||"生活"}</div><h3>{p.title}</h3><p style={{fontSize:12,color:"#817570",lineHeight:1.7}}>{p.excerpt||""}</p>{p.slug&&<Link className="more" href={`/blog/${p.slug}`}>閱讀 →</Link>}</div></article>)}</div>
    </section>

    <section className="container section"><div className="section-head"><div><div className="section-kicker">NAYO CRYSTAL</div><div className="section-title">生命靈數 × 水晶</div></div><Link className="more" href="/crystal">探索 Crystal →</Link></div><div className="carousel">{(crystals.length?crystals:[1,2,3,4,5,6].map(n=>({id:String(n),name:`生命靈數 ${n}`,life_numbers:String(n),meaning:"水晶內容可由後台管理",image:""}))).map((c:any)=><article className="crystal-card" key={c.id}><div className="crystal-art">{c.image?<img src={c.image} alt={c.name} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:18}}/>:`✦ ${c.life_numbers||""}`}</div><div className="crystal-num">生命靈數 {c.life_numbers||""}</div><div className="crystal-name">{c.name}</div><div className="crystal-desc">{c.meaning||""}</div></article>)}</div></section>

    <section className="container section"><div className="section-head"><div><div className="section-kicker">CUSTOM BRACELETS</div><div className="section-title">缺數手環作品</div></div><Link className="more" href="/crystal/buy">購買須知 →</Link></div><div className="carousel">{(products.length?products:[1,2,3,4].map(n=>({id:String(n),name:`缺數 ${n} 客製手環`,missing_numbers:String(n),description:"作品圖片與介紹可由後台管理",image:""}))).map((p:any)=><article className="crystal-card" key={p.id}><div className="crystal-art">{p.image?<img src={p.image} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:18}}/>:"✦"}</div><div className="crystal-num">缺數 {p.missing_numbers||""}</div><div className="crystal-name">{p.name}</div><div className="crystal-desc">{p.description||""}</div>{p.purchase_url&&<a className="promo-button" href={p.purchase_url} target="_blank" rel="noreferrer">購買作品 →</a>}</article>)}</div></section>

    <section className="container newsletter"><div><div className="section-kicker">ABOUT NAYO</div><h2 style={{margin:"8px 0",fontSize:28}}>讓理財成為喜歡的生活。</h2><p style={{maxWidth:650}}>從信用卡回饋、小資理財，到生命靈數與水晶，這裡是 Nayo 整理生活與靈感的地方。</p></div><Link className="btn primary" href="/about">認識 Nayo →</Link></section>
  </main>;
}
