import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const revalidate = 60;
export const metadata = { title: "Nayo Crystal", description: "Nayo Crystal｜生命靈數與客製生命靈數水晶手環作品。" };

type MenuItem = { id: string; label: string; url: string; pageDescription?: string; children?: MenuItem[]; pageLinks?: MenuItem[] };
type Post = { id: string; title: string; slug: string; excerpt?: string | null; cover_image?: string | null; published_at?: string | null; categories?: { name?: string | null; slug?: string | null } | null };
type Product = { id: string; name: string; slug: string; description?: string | null; image_url?: string | null; purchase_url?: string | null; status?: string | null; sort_order?: number | null; missing_numbers?: string | null };

const defaultLifeLinks = Array.from({ length: 9 }, (_, i) => ({ id: `life-${i + 1}`, label: `生命靈數 ${i + 1}`, url: `#number-${i + 1}` }));
const defaultBlogCategories = [
  { name: "信用卡回饋", slug: "credit-card" },
  { name: "小資理財", slug: "finance" },
  { name: "旅行 × 生活", slug: "lifestyle" },
  { name: "生命靈數 × 水晶", slug: "crystal" },
];

export default async function Crystal({ searchParams }: { searchParams?: Promise<{ category?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const supabase = await createClient();

  let settings: Record<string, string> = {};
  let menu: MenuItem | null = null;
  let lifeLinks = defaultLifeLinks;
  let posts: Post[] = [];
  let categories: { name: string; slug: string }[] = defaultBlogCategories;
  let articleCategorySlugs: string[] = defaultBlogCategories.map(x => x.slug);
  let products: Product[] = [];

  if (supabase) {
    const [settingResult, postResult, categoryResult, productResult] = await Promise.all([
      supabase.from("site_settings").select("setting_key,setting_value"),
      supabase.from("posts").select("id,title,slug,excerpt,cover_image,published_at,categories(name,slug)").eq("status", "published").order("published_at", { ascending: false }),
      supabase.from("categories").select("name,slug,type,is_active,sort_order").eq("type", "blog").eq("is_active", true).order("sort_order"),
      supabase.from("products").select("id,name,slug,description,image_url,purchase_url,status,sort_order,missing_numbers").eq("status", "published").order("sort_order").order("created_at", { ascending: false }),
    ]);

    for (const row of settingResult.data || []) {
      if (row.setting_key) settings[row.setting_key] = row.setting_value ?? "";
      if (row.setting_key === "menu_json") {
        try {
          const parsed = JSON.parse(row.setting_value || "[]");
          if (Array.isArray(parsed)) {
            menu = parsed.find((x: MenuItem) => x.id === "crystal" || x.url === "/crystal") || null;
          }
        } catch {}
      }
    }
    try {
      const configured = JSON.parse(settings.crystal_article_categories_json || "[]");
      if (Array.isArray(configured) && configured.length) articleCategorySlugs = configured.map(String);
    } catch {}
    posts = (postResult.data || []) as Post[];
    if (categoryResult.data?.length) categories = categoryResult.data.map((x: any) => ({ name: x.name, slug: x.slug }));
    products = (productResult.data || []) as Product[];
  }

  if (menu?.pageLinks?.length) lifeLinks = menu.pageLinks;
  const pageTitle = menu?.label || settings.crystal_page_title || "生命靈數 × 水晶";
  const pageDescription = menu?.pageDescription || settings.crystal_page_description || "從缺數認識自己，再挑選適合自己的水晶。";
  const crystalChildren = menu?.children || [];
  const workMenu = crystalChildren.find(x => x.id === "crystal-work" || x.url.includes("#bracelets"));
  const buyMenu = crystalChildren.find(x => x.id === "crystal-buy" || x.url === "/crystal/buy");
  const braceletTitle = workMenu?.label || "缺數手環作品";
  const braceletButton = buyMenu?.label ? `${buyMenu.label} →` : "購買須知 →";
  const braceletUrl = buyMenu?.url || "/crystal/buy";

  const selectedCategories = articleCategorySlugs
    .map(slug => categories.find(category => category.slug === slug))
    .filter(Boolean) as { name: string; slug: string }[];

  const postsByCategory = (slug: string) => posts.filter(post => post.categories?.slug === slug);

  return (
    <main className="container page">
      <div className="eyebrow">NAYO CRYSTAL</div>
      <h1>{pageTitle}</h1>
      <p className="page-intro">{pageDescription}</p>

      <div className="category-grid crystal-life-grid">
        {lifeLinks.map((link, index) => (
          <a className="category crystal-life-card" href={link.url || `#number-${index + 1}`} key={link.id}>
            <div className="icon">✦</div>
            <strong>{link.label}</strong>
            <span>{link.id ? "查看對應內容" : ""}</span>
          </a>
        ))}
      </div>

      {selectedCategories.length > 0 && (
        <div className="crystal-articles" id="articles">
          {selectedCategories.map(category => {
            const categoryPosts = postsByCategory(category.slug);
            return (
              <section className="section crystal-category-section" key={category.slug}>
                <div className="section-head">
                  <div>
                    <div className="section-kicker">NAYO BLOG</div>
                    <div className="section-title">{category.name}</div>
                  </div>
                  <Link className="more" href={`/blog?category=${encodeURIComponent(category.slug)}`}>看全部文章 →</Link>
                </div>
                {categoryPosts.length > 0 ? (
                  <div className="post-list">
                    {categoryPosts.map(post => (
                      <article className="post-row" key={post.id}>
                        {post.cover_image && <img src={post.cover_image} alt={post.title} style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 14 }} />}
                        <small className="section-kicker">{post.categories?.name || category.name}</small>
                        <h2>{post.title}</h2>
                        {post.excerpt && <p>{post.excerpt}</p>}
                        <Link className="more" href={`/blog/${post.slug}`}>閱讀全文 →</Link>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">目前這個分類還沒有公開文章。</div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <section className="section" id="bracelets">
        <div className="section-head">
          <div>
            <div className="section-kicker">CUSTOM BRACELETS</div>
            <div className="section-title">{braceletTitle}</div>
          </div>
          <Link className="more" href={braceletUrl}>{braceletButton}</Link>
        </div>
        {products.length > 0 && (
          <div className="carousel">
            {products.map(p => (
              <article className="crystal-card" key={p.id}>
                <div className="crystal-art">
                  {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 18 }} /> : "✦"}
                </div>
                {p.missing_numbers && <div className="crystal-num">缺數 {p.missing_numbers}</div>}
                <div className="crystal-name">{p.name}</div>
                {p.description && <div className="crystal-desc">{p.description}</div>}
                {p.purchase_url && <a className="promo-button" href={p.purchase_url} target="_blank" rel="noreferrer">購買作品 →</a>}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
