import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;
export const metadata = {title:"理財 Blog",description:"Nayo 娜攸生活理財 Blog：信用卡回饋、小資理財、旅行生活與水晶內容。"};

const categoryLabels: Record<string, string> = {
  "credit-card": "信用卡回饋",
  finance: "小資理財",
  lifestyle: "旅行 × 生活",
  crystal: "生命靈數 × 水晶",
};

export default async function Blog({ searchParams }: { searchParams?: Promise<{ category?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const selectedCategory = params.category || "";
  const supabase = await createClient();
  let posts: any[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("posts")
      .select("id,title,slug,excerpt,cover_image,published_at,categories(name)")
      .eq("status", "published")
      .order("published_at", { ascending: false });
    posts = data || [];
  }

  if (!posts.length) {
    posts = [{id:"demo",title:"開始整理 Nayo Blog",slug:"",excerpt:"登入管理後台新增文章後，文章會自動出現在這裡。",categories:{name:"理財"}}];
  }

  if (selectedCategory && categoryLabels[selectedCategory]) {
    const label = categoryLabels[selectedCategory];
    posts = posts.filter((p) => {
      const name = typeof p.categories?.name === "string" ? p.categories.name : "";
      if (!name) return false;
      return name === label || name.includes(label.replace(" × ", "")) || (selectedCategory === "credit-card" && name.includes("信用卡")) || (selectedCategory === "finance" && name.includes("理財")) || (selectedCategory === "lifestyle" && (name.includes("旅行") || name.includes("生活"))) || (selectedCategory === "crystal" && (name.includes("水晶") || name.includes("生命靈數")));
    });
  }

  return <main className="container page">
    <div className="eyebrow">NAYO BLOG</div>
    <h1>生活理財 Blog</h1>
    <p className="page-intro">信用卡回饋、小資理財、旅行生活，也可以寫生命靈數與水晶。</p>

    <div className="blog-filters">
      <Link className={!selectedCategory ? "active" : ""} href="/blog">全部</Link>
      {Object.entries(categoryLabels).map(([key, label]) => <Link key={key} className={selectedCategory === key ? "active" : ""} href={`/blog?category=${key}`}>{label}</Link>)}
    </div>

    {posts.length ? <div className="post-list">{posts.map(p => <article className="post-row" key={p.id}>
      {p.cover_image && <img src={p.cover_image} alt="" style={{width:"100%",maxHeight:260,objectFit:"cover",borderRadius:14}}/>}
      <small className="section-kicker">{p.categories?.name || "生活"}</small>
      <h2>{p.title}</h2>
      <p>{p.excerpt || ""}</p>
      {p.slug && <Link className="more" href={`/blog/${p.slug}`}>閱讀全文 →</Link>}
    </article>)}</div> : <div className="empty-state">這個分類目前還沒有公開文章。</div>}
  </main>
}
