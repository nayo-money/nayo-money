import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

const KEYWORDS = ["蝦皮", "Shopee", "momo", "PChome", "全聯", "家樂福", "加油", "中油", "台塑", "LINE Pay", "Apple Pay", "街口支付", "悠遊付", "外送", "foodpanda", "Uber Eats", "海外消費", "日本", "韓國", "7-ELEVEN", "全家"];
const clean = (s: string) => s.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

export async function POST(req: NextRequest) {
  const secret = process.env.BANK_OFFER_SYNC_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Missing Supabase service configuration" }, { status: 500 });
  const db = createSupabaseClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: sources, error } = await db.from("bank_offer_sources").select("id,bank,source_url,source_type").eq("enabled", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const results: Array<Record<string, unknown>> = [];
  for (const source of (sources || [])) {
    try {
      const response = await fetch(source.source_url, { headers: { "user-agent": "NayoMoneyOfficialOfferIndexer/1.0 (contact: site administrator)" }, signal: AbortSignal.timeout(12000), cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const text = clean(html).slice(0, 250000);
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = clean(titleMatch?.[1] || source.bank + " 官方優惠頁").slice(0, 180);
      const channels = KEYWORDS.filter(k => text.toLowerCase().includes(k.toLowerCase()));
      const { error: updateError } = await db.from("bank_offer_sources")
        .update({ last_checked_at: new Date().toISOString(), last_status: updateErrorText(response.status) })
        .eq("id", source.id);
      if (updateError) throw new Error("Failed to update source status");
      // Candidate only: raw text and inferred keywords are NOT published as confirmed card benefits.
      const { error: candidateError } = await db.from("bank_offer_candidates").upsert({
        source_id: source.id, bank: source.bank, title, source_url: source.source_url,
        extracted_text: text.slice(0, 30000), detected_keywords: channels,
        fetched_at: new Date().toISOString(), review_status: "pending", fetch_status: "ok"
      }, { onConflict: "source_id,source_url" });
      if (candidateError) throw new Error(candidateError.message);
      results.push({ bank: source.bank, status: "candidate_saved", detected_keywords: channels.length });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      await db.from("bank_offer_sources").update({ last_checked_at: new Date().toISOString(), last_status: message.slice(0, 250) }).eq("id", source.id);
      results.push({ bank: source.bank, status: "failed", error: message.slice(0, 180) });
    }
  }
  return NextResponse.json({ checked: sources?.length || 0, results, note: "抓取結果只建立待審核候選資料；經人工核對並發布後才會出現在快速選卡。" });
}
function updateErrorText(status: number) { return status >= 200 && status < 300 ? `HTTP ${status}` : `HTTP ${status}`; }

\nexport async function GET() {
  return NextResponse.json(
    { service: "NayoMoney official bank offer collector", method: "POST", authentication: "Bearer token required", note: "This endpoint collects candidate source text only. It does not verify or publish card benefits." },
    { status: 200 }
  );
}
