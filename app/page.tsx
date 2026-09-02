import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

const fallback = {
  site_name: "Nayo 娜攸", site_tagline: "生活理財 × 水晶", profile_name: "娜攸", profile_image: "", hero_image: "",
  hero_title: "把理財變成，喜歡的生活。", hero_highlight: "喜歡的生活",
  hero_description: "分享信用卡回饋、小資理財、旅行生活，也記錄生命靈數與水晶。",
  primary_label: "逛理財 Blog", primary_url: "/blog", secondary_label: "探索 Nayo Crystal", secondary_url: "/crystal",
};

const fallbackPosts = [
  { id: "post-1", title: "信用卡回饋與小資理財", excerpt: "整理日常消費、信用卡回饋與理財筆記。", slug: "", cover_image: "", categories: { name: "理財" } },
  { id: "post-2", title: "讓每一筆錢都有目的", excerpt: "從生活支出開始，建立自己的理財節奏。", slug: "", cover_image: "", categories: { name: "理財" } },
  { id: "post-3", title: "旅行怎麼花得更聰明？", excerpt: "把信用卡回饋與旅行生活放進同一套規劃。", slug: "", cover_image: "", categories: { name: "生活" } },
  { id: "post-4", title: "生命靈數與水晶入門", excerpt: "從缺數開始認識自己，再挑選適合的水晶。", slug: "", cover_image: "", categories: { name: "Crystal" } },
];


const fallbackPromotions = [
  { id: "promo-1", bank: "台新銀行", badge: "新方案升級", title: "Richart卡", subtitle: "Chill刷最高10%回饋", image: "", bullets: ["宜睿 NT$1,700 多選多即享券", "SNOOPY 20 吋輕量旅行李箱", "SNOOPY 藍牙耳機款", "Disegno 20+28 吋城市漫步旅行箱"], meta: ["即日起至2026/08/31", "使用下方連結申辦", "核卡30天內，刷滿NT$3,000元", "2026/9/10(含)前完成核卡", "謹慎理財 信用至上"], deadline: "期限：2026/08/31", url: "#" },
  { id: "promo-2", bank: "國泰世華", badge: "新戶優惠", title: "CUBE卡", subtitle: "指定通路最高3.3%回饋", image: "", bullets: ["指定消費享小樹點回饋", "海外消費享加碼優惠", "新戶首刷禮依活動公告", "指定通路加碼回饋"], meta: ["活動期間依官方公告", "新戶需符合申辦資格", "回饋上限依方案而定", "實際條件以銀行公告為準", "謹慎理財 信用至上"], deadline: "活動期限依公告", url: "#" },
  { id: "promo-3", bank: "中國信託", badge: "熱門卡", title: "LINE Pay卡", subtitle: "日常消費回饋一次看", image: "", bullets: ["LINE Pay 指定消費享回饋", "新戶禮依活動公告", "指定通路有加碼", "回饋規則依當期方案"], meta: ["活動期間依官方公告", "需符合新戶／指定資格", "回饋上限依活動規則", "申辦前請確認最新條件", "謹慎理財 信用至上"], deadline: "活動期限依公告", url: "#" },
  { id: "promo-4", bank: "玉山銀行", badge: "熱門回饋", title: "Unicard", subtitle: "百大特店最高回饋", image: "", bullets: ["百大特店依方案享回饋", "行動支付指定通路加碼", "新戶優惠依活動公告", "回饋門檻與上限依方案"], meta: ["活動期間依官方公告", "需符合指定消費條件", "回饋上限依活動公告", "申辦前確認最新活動", "謹慎理財 信用至上"], deadline: "活動期限依公告", url: "#" },
];

const fallbackProducts = [1, 2, 3, 4, 5, 6].map((n) => ({
  id: `product-${n}`, name: `缺數 ${n} 客製手環`, missing_numbers: String(n), description: "作品圖片與介紹可由後台管理。", image: "", purchase_url: ""
}));

export default async function Home() {
  const supabase = await createClient();
  let settings: any = fallback;
  let posts: any[] = [];
  let products: any[] = [];
  let crystals: any[] = [];

  if (supabase) {
    const [s, p, pr, c] = await Promise.all([
      supabase.from("site_settings").select("setting_key, setting_value"),
      supabase.from("posts").select("id,title,slug,excerpt,cover_image,published_at,status,categories(name)").eq("status", "published").order("published_at", { ascending: false }).limit(4),
      supabase.from("products").select("id,name,image,missing_numbers,description,price,purchase_url,status").order("sort_order").limit(8),
      supabase.from("crystals").select("id,name,image,life_numbers,meaning,color").order("sort_order").limit(6),
    ]);
    if (s.data) {
      settings = { ...fallback };
      for (const row of s.data) {
        settings[row.setting_key] = row.setting_value ?? "";
      }
    }
    posts = p.data || [];
    products = pr.data || [];
    crystals = c.data || [];
  }

  const titleParts = String(settings.hero_title || fallback.hero_title).split(settings.hero_highlight || fallback.hero_highlight);
  const displayPosts = posts.length ? posts : fallbackPosts;
  const displayProducts = products.length ? products : fallbackProducts;
  const displayCrystals = crystals.length ? crystals : [1, 2, 3, 4, 5, 6].map(n => ({ id: `crystal-${n}`, name: `生命靈數 ${n}`, life_numbers: String(n), meaning: "水晶內容可由後台管理。", image: "" }));

  return <main>
    <section className="container hero">
      <div>
        <div className="eyebrow">{settings.site_name} · {settings.site_tagline}</div>
        <h1>{titleParts[0]}{settings.hero_highlight && <span>{settings.hero_highlight}</span>}{titleParts[1]}</h1>
        <p>{settings.hero_description}</p>
        <div className="actions">
          <Link className="btn primary" href={settings.primary_url}>{settings.primary_label}</Link>
          <Link className="btn soft" href={settings.secondary_url}>{settings.secondary_label}</Link>
        </div>
      </div>
      <div className="hero-card">
        {settings.hero_image ? <img src={settings.hero_image} alt="Nayo 首頁主圖" style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} /> : <div className="hero-circle">N</div>}
        <div className="hero-label"><strong>{settings.profile_name}</strong><span>生活理財 × 水晶</span></div>
      </div>
    </section>

    {/* 信用卡優惠：卡片式橫向滑動 */}
    <section className="container section" id="card-promotions">
      <div className="section-head">
        <div><div className="section-kicker">CREDIT CARD OFFERS</div><div className="section-title">信用卡優惠</div></div>
        <Link className="more" href="/blog">看全部優惠 →</Link>
      </div>
      <div className="promo-carousel">
        {fallbackPromotions.map((card) => <article className="promo-card" key={card.id}>
          <div className="promo-top">
            <div>
              <div className="chips"><span className="chip">{card.bank}</span><span className="chip">{card.badge}</span></div>
              <div className="promo-title">{card.title}</div>
              <div className="promo-sub">{card.subtitle}</div>
            </div>
            <div className="promo-img">{card.image ? <img src={card.image} alt={card.title} /> : <span>優惠<br/>圖卡</span>}</div>
          </div>
          <div className="promo-body"><span>🎁 新戶首刷好禮四選一</span><ul>{card.bullets.map((b) => <li key={b}>{b}</li>)}</ul></div>
          <div className="promo-meta">{card.meta.map((m) => <div key={m}>◷ {m}</div>)}<span className="promo-deadline">▣ {card.deadline}</span></div>
          <a className="promo-button" href={card.url}>立即申辦 ↗</a>
        </article>)}
      </div>
    </section>

    {/* 最近文章 */}
    <section className="container section">
      <div className="section-head">
        <div><div className="section-kicker">LATEST BLOG</div><div className="section-title">最近的文章</div></div>
        <Link className="more" href="/blog">看全部文章 →</Link>
      </div>
      <div className="article-grid">
        {displayPosts.map((p: any) => <article className="article" key={p.id}>
          <div className="article-cover">{p.cover_image ? <img src={p.cover_image} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "Nayo Blog"}</div>
          <div className="article-body">
            <div className="article-cat">{p.categories?.name || "生活"}</div>
            <h3>{p.title}</h3>
            <p style={{ fontSize: 12, color: "#817570", lineHeight: 1.7 }}>{p.excerpt || ""}</p>
            {p.slug && <Link className="more" href={`/blog/${p.slug}`}>閱讀 →</Link>}
          </div>
        </article>)}
      </div>
    </section>

    {/* 最近文章下面：缺數手環作品橫向卡片 */}
    <section className="container section" id="bracelets">
      <div className="section-head">
        <div>
          <div className="section-kicker">NAYO CRYSTAL WORKS</div>
          <div className="section-title">缺數手環作品</div>
        </div>
        <Link className="more" href="/crystal#bracelets">看全部作品 →</Link>
      </div>
      <div className="carousel-hint">← 左右滑動查看更多作品 →</div>
      <div className="carousel bracelet-carousel">
        {displayProducts.map((p: any) => <article className="crystal-card" key={p.id}>
          <div className="crystal-art">{p.image ? <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 18 }} /> : "✦"}</div>
          <div className="crystal-num">缺數 {p.missing_numbers || ""}</div>
          <div className="crystal-name">{p.name}</div>
          <div className="crystal-desc">{p.description || ""}</div>
          {p.purchase_url && <a className="promo-button" href={p.purchase_url} target="_blank" rel="noreferrer">查看作品 →</a>}
        </article>)}
      </div>
    </section>

    {/* 下方內容保留 */}
    <section className="container section">
      <div className="split">
        <div className="feature-box">
          <div className="section-kicker">NAYO BLOG</div>
          <h3>生活理財 Blog</h3>
          <p>信用卡回饋、小資理財、ETF／投資、旅行 × 生活，把實用資訊整理成容易閱讀的筆記。</p>
          <Link className="more" href="/blog">進入理財 Blog →</Link>
        </div>
        <div className="feature-box crystal">
          <div className="section-kicker">NAYO CRYSTAL</div>
          <h3>生命靈數 × 水晶</h3>
          <p>缺數解析、天然水晶、客製手環與作品展示。從生命靈數認識自己，再找到適合自己的水晶。</p>
          <Link className="more" href="/crystal">探索 Crystal →</Link>
          <Link className="more" href="/crystal/buy">購買須知 →</Link>
        </div>
      </div>
    </section>

    {/* 生命靈數／水晶入口 */}
    <section className="container section">
      <div className="section-head">
        <div><div className="section-kicker">LIFE NUMBER × CRYSTAL</div><div className="section-title">生命靈數水晶</div></div>
        <Link className="more" href="/crystal">看全部 →</Link>
      </div>
      <div className="carousel">
        {displayCrystals.map((c: any) => <article className="crystal-card" key={c.id}>
          <div className="crystal-art">{c.image ? <img src={c.image} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 18 }} /> : `✦ ${c.life_numbers || ""}`}</div>
          <div className="crystal-num">生命靈數 {c.life_numbers || ""}</div>
          <div className="crystal-name">{c.name}</div>
          <div className="crystal-desc">{c.meaning || ""}</div>
        </article>)}
      </div>
    </section>

    <section className="container newsletter">
      <div>
        <div className="section-kicker">ABOUT NAYO</div>
        <h2 style={{ margin: "8px 0", fontSize: 28 }}>讓理財成為喜歡的生活。</h2>
        <p style={{ maxWidth: 650 }}>從信用卡回饋、小資理財，到生命靈數與水晶，這裡是 Nayo 整理生活與靈感的地方。</p>
      </div>
      <Link className="btn primary" href="/about">認識 Nayo →</Link>
    </section>
  </main>;
}
