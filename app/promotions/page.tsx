import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;
export const metadata = {
  title: "信用卡優惠｜Nayo 娜攸",
  description: "Nayo 娜攸整理信用卡回饋、首刷禮與申辦優惠。",
};

type Promotion = {
  id: string;
  category?: string | null;
  bank?: string | null;
  badge?: string | null;
  title: string;
  subtitle?: string | null;
  image?: string | null;
  bullets?: string[] | null;
  gifts?: string[] | null;
  gift_title?: string | null;
  eligibility?: string | null;
  conditions?: string[] | null;
  deadline?: string | null;
  url?: string | null;
  button_text?: string | null;
  sort_order?: number | null;
};

function arr(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0) : [];
}

export default async function Promotions({ searchParams }: { searchParams?: Promise<{ category?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const selectedCategory = String(params.category || "").trim();
  const supabase = await createClient();
  let promotions: Promotion[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("promotions")
      .select("id,category,bank,badge,title,subtitle,image,bullets,gifts,gift_title,eligibility,conditions,deadline,url,button_text,sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    promotions = (data || []) as Promotion[];
  }

  const categories = Array.from(
    new Set(promotions.map((p) => String(p.category || "").trim()).filter(Boolean))
  );
  const filtered = selectedCategory
    ? promotions.filter((p) => String(p.category || "").trim() === selectedCategory)
    : promotions;

  return (
    <main className="container page promotions-page">
      <div className="eyebrow">CREDIT CARD OFFERS</div>
      <div className="page-title-row">
        <div>
          <h1>信用卡優惠</h1>
          <p className="page-intro">信用卡回饋、首刷禮與申辦優惠，一次整理。</p>
        </div>
        <Link className="more" href="/">回首頁 →</Link>
      </div>

      <div className="blog-filters promo-filters">
        <Link className={!selectedCategory ? "active" : ""} href="/promotions">全部優惠</Link>
        {categories.map((category) => (
          <Link key={category} className={selectedCategory === category ? "active" : ""} href={`/promotions?category=${encodeURIComponent(category)}`}>
            {category}
          </Link>
        ))}
      </div>

      {filtered.length ? (
        <div className="promo-page-grid">
          {filtered.map((card) => {
            const gifts = arr(card.gifts).length ? arr(card.gifts) : arr(card.bullets);
            const conditions = arr(card.conditions);
            return (
              <article className="promo-card promo-page-card" key={card.id}>
                <div className="promo-top">
                  <div>
                    <div className="chips">
                      {card.category && <span className="chip promo-category-chip">{card.category}</span>}
                      {card.bank && <span className="chip">{card.bank}</span>}
                      {card.badge && <span className="chip">{card.badge}</span>}
                    </div>
                    <div className="promo-title">{card.title}</div>
                    <div className="promo-sub">{card.subtitle || ""}</div>
                  </div>
                  <div className="promo-img">
                    {card.image ? <img src={card.image} alt={card.title} /> : <span>優惠<br />圖卡</span>}
                  </div>
                </div>

                {gifts.length > 0 && (
                  <div className="promo-body">
                    <span>🎁 {card.gift_title || "優惠重點"}</span>
                    <ul>{gifts.map((gift) => <li key={gift}>{gift}</li>)}</ul>
                  </div>
                )}

                {(card.eligibility || conditions.length > 0) && (
                  <div className="promo-meta">
                    <div className="promo-meta-left">
                      {card.eligibility && <div>◷ {card.eligibility}</div>}
                      {conditions.map((condition) => <div key={condition}>◷ {condition}</div>)}
                    </div>
                  </div>
                )}

                {card.deadline && (
                  <div className="promo-deadline-row">
                    <span className="promo-deadline">
                      <svg className="promo-calendar-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="3.5" y="5.5" width="17" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                        <path d="M7 3.5v4M17 3.5v4M3.5 9.5h17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                      期限：{card.deadline}
                    </span>
                  </div>
                )}

                {card.url && card.url !== "#" ? (
                  <a className="promo-button" href={card.url} target="_blank" rel="noreferrer">{card.button_text || "立即申辦"} ↗</a>
                ) : (
                  <span className="promo-button promo-button-disabled">優惠連結待更新</span>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">{selectedCategory ? `「${selectedCategory}」目前還沒有優惠。` : "目前還沒有信用卡優惠，登入後台新增後會自動出現在這裡。"}</div>
      )}
    </main>
  );
}
