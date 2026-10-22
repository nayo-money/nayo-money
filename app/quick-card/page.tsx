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
  return <QuickCardFinder cards={cards} />;
}
