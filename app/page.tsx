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
  let settings: any = fallback;
  let posts: any[] = [];
  let products: any[] = [];
  let crystals: any[] = [];
  let promotions: any[] = [];

  if (supabase) {
    const [s, p, pr, c, promo] = await Promise.all([
      supabase.from("site_settings").select("setting_key, setting_value"),
      supabase.from("posts").select("id,title,slug,excerpt,cover_image,published_at,status,categories(name)").eq("status", "published").order("published_at", { ascending: false }).limit(4),
      supabase.from("products").select("id,name,image_url,missing_numbers,description,price,purchase_url,status").order("sort_order").limit(8),
      supabase.from("crystals").select("id,name,image_url,life_numbers,meaning,color").order("sort_order").limit(6),
      supabase.from("promotions").select("id,bank,badge,title,subtitle,image,bullets,meta,gifts,tags,reward_type,reward_value,reward_label,button_text,eligibility,conditions,deadline,url,sort_order").order("sort_order").order("created_at",{ascending:false}),
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
    promotions = promo.data || [];
  }

  const titleParts = String(settings.hero_title || fallback.hero_title).split(settings.hero_highlight || fallback.hero_highlight);
  const displayPosts = posts;
  const displayProducts = products;
  const displayPromotions = promotions;
  const displayCrystals = crystals;

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
      </div>
    </section>

    {/* 信用卡優惠：卡片式橫向滑動 */}
    <section className="container section" id="card-promotions">
      <div className="section-head">
        <div><div className="section-kicker">CREDIT CARD OFFERS</div><div className="section-title">信用卡優惠</div></div>
        <Link className="more" href="/blog">看全部優惠 →</Link>
      </div>
      <div className="promo-carousel">
        {!displayPromotions.length && <p className="carousel-hint">目前還沒有信用卡優惠，請到後台「信用卡優惠」新增。</p>}
        {displayPromotions.map((card) => <article className="promo-card" key={card.id}>
          <div className="promo-top">
            <div>
              <div className="chips"><span className="chip">{card.bank}</span><span className="chip">{card.badge}</span></div>
              <div className="promo-title">{card.title}</div>
              <div className="promo-sub">{card.subtitle}</div>
            </div>
            <div className="promo-img">{card.image ? <img src={card.image} alt={card.title} /> : <span>優惠<br/>圖卡</span>}</div>
          </div>
          <div className="promo-body">
            <span>🎁 首刷禮</span>
            <ul>{(Array.isArray(card.gifts) ? card.gifts : (Array.isArray(card.bullets) ? card.bullets : [])).filter(Boolean).map((b: string) => <li key={b}>{b}</li>)}</ul>
          </div>
          <div className="promo-meta">
            <div className="promo-meta-left">
              {card.eligibility && <div>◷ {card.eligibility}</div>}
              {(Array.isArray(card.conditions) ? card.conditions : (Array.isArray(card.meta) ? card.meta : [])).filter(Boolean).map((m: string) => <div key={m}>◷ {m}</div>)}
            </div>
            <span className="promo-deadline">▣ {card.deadline || ""}</span>
          </div>
          <a className="promo-button" href={card.url}>{card.button_text || "立即申辦"} ↗</a>
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
        {!displayPosts.length && <p className="carousel-hint">目前還沒有已發布文章，請到後台「Blog 文章」新增。</p>}
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
        {!displayProducts.length && <p className="carousel-hint">目前還沒有手環作品，請到後台「手環作品」新增。</p>}
        {displayProducts.map((p: any) => <article className="crystal-card" key={p.id}>
          <div className="crystal-art">{p.image_url ? <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 18 }} /> : "✦"}</div>
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
          <h3>{settings.blog_feature_title || "生活理財 Blog"}</h3>
          <p>{settings.blog_feature_description || "信用卡回饋、小資理財、ETF／投資、旅行 × 生活，把實用資訊整理成容易閱讀的筆記。"}</p>
          <Link className="more" href={settings.blog_feature_url || "/blog"}>{settings.blog_feature_button || "進入理財 Blog →"}</Link>
        </div>
        <div className="feature-box crystal">
          <div className="section-kicker">NAYO CRYSTAL</div>
          <h3>{settings.crystal_feature_title || "生命靈數 × 水晶"}</h3>
          <p>{settings.crystal_feature_description || "缺數解析、天然水晶、客製手環與作品展示。從生命靈數認識自己，再找到適合自己的水晶。"}</p>
          <Link className="more" href={settings.crystal_feature_url || "/crystal"}>{settings.crystal_feature_button || "探索 Crystal →"}</Link>
          <Link className="more" href={settings.crystal_feature_buy_url || "/crystal/buy"}>{settings.crystal_feature_buy_button || "購買須知 →"}</Link>
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
        {!displayCrystals.length && <p className="carousel-hint">目前還沒有水晶資料，請到後台「水晶」新增。</p>}
        {displayCrystals.map((c: any) => <article className="crystal-card" key={c.id}>
          <div className="crystal-art">{c.image_url ? <img src={c.image_url} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 18 }} /> : `✦ ${c.life_numbers || ""}`}</div>
          <div className="crystal-num">生命靈數 {c.life_numbers || ""}</div>
          <div className="crystal-name">{c.name}</div>
          <div className="crystal-desc">{c.meaning || ""}</div>
        </article>)}
      </div>
    </section>

    <section className="container newsletter">
      <div className="newsletter-content">
        <div className="section-kicker">{settings.about_kicker || "ABOUT NAYO"}</div>
        <h2 style={{ margin: "8px 0", fontSize: 28 }}>{settings.about_title || "讓理財成為喜歡的生活。"}</h2>
        <p style={{ maxWidth: 650 }}>{settings.about_description || settings.about_text || ""}</p>
        <Link className="btn primary" href={settings.about_button_url || "/about"}>{settings.about_button_label || "認識 Nayo →"}</Link>
      </div>
    </section>
  </main>;
}
