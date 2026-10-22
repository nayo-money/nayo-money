import { createClient } from "@/lib/supabase/server";
import QuickCardFinder, { type QuickCard } from "./QuickCardFinder";
export const revalidate = 60;
export const metadata = { title: "快速選卡｜NayoMoney", description: "輸入消費關鍵字，快速尋找信用卡優惠與申辦連結。" };
export default async function QuickCardPage() {
  const supabase = await createClient();
  let cards: QuickCard[] = [];
  if (supabase) {
    const { data } = await supabase.from("promotions")
      .select("id,category,bank,badge,title,subtitle,image,bullets,gifts,gift_title,eligibility,conditions,deadline,url,button_text,sort_order")
      .order("sort_order", { ascending: true }).order("created_at", { ascending: false });
    cards = (data || []) as QuickCard[];
  }
  // Officially sourced offers are kept separately from manually managed promotions.
  // Missing migration/table is tolerated so the existing site remains usable.
  if (supabase) {
    const { data: official } = await supabase.from("bank_offers")
      .select("id,bank,card_name,title,summary,channels,keywords,conditions,activity_start,activity_end,source_url,application_url,verified_at")
      .eq("verification_status", "verified")
      .order("verified_at", { ascending: false });
    for (const o of (official || []) as any[]) {
      cards.push({
        id: `official-${o.id}`, bank: o.bank, title: o.card_name || o.title,
        subtitle: o.summary || o.title, category: "銀行官方優惠", badge: "官方資料已核對",
        bullets: Array.isArray(o.channels) ? o.channels : [],
        conditions: Array.isArray(o.conditions) ? o.conditions : [],
        eligibility: `官方來源：${o.source_url || "待確認"}`,
        deadline: o.activity_end || undefined, url: o.application_url || undefined,
        button_text: "前往申辦", keywords: Array.isArray(o.keywords) ? o.keywords : [],
        source_url: o.source_url, verified_at: o.verified_at
      } as any);
    }
  }
  return <QuickCardFinder cards={cards} />;
}
