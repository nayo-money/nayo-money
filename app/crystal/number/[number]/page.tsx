import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

type Row = { setting_key?: string | null; setting_value?: string | null };
type Crystal = { id:string; name:string; meaning?:string|null; color?:string|null; life_numbers?:string|null; missing_numbers?:string|null; image_url?:string|null };

export default async function LifeNumberPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const n = Number(number);
  const safeNumber = Number.isInteger(n) && n >= 1 && n <= 9 ? n : 1;
  const supabase = await createClient();
  const settings: Record<string,string> = {};
  let crystals: Crystal[] = [];

  if (supabase) {
    const [{ data: settingsRows }, { data: crystalRows }] = await Promise.all([
      supabase.from("site_settings").select("setting_key,setting_value"),
      supabase.from("crystals").select("id,name,meaning,color,life_numbers,missing_numbers,image_url").eq("is_active", true).order("sort_order").order("created_at", { ascending: false }),
    ]);
    for (const row of (settingsRows || []) as Row[]) {
      if (row.setting_key) settings[row.setting_key] = row.setting_value || "";
    }
    crystals = (crystalRows || []) as Crystal[];
  }

  const title = settings[`life_${safeNumber}_title`] || `生命靈數 ${safeNumber}`;
  const subtitle = settings[`life_${safeNumber}_subtitle`] || "查看對應水晶";
  const matching = crystals.filter(c => {
    const text = `${c.life_numbers || ""} ${c.missing_numbers || ""}`;
    return text.split(/[,，\s、/]+/).map(x => x.trim()).includes(String(safeNumber));
  });

  return (
    <main className="container page life-number-page">
      <div className="eyebrow">LIFE NUMBER × CRYSTAL</div>
      <h1>{title}</h1>
      <p className="page-intro">{subtitle}</p>

      {settings[`life_${safeNumber}_content`] && (
        <section className="life-number-content post-content">
          <div dangerouslySetInnerHTML={{ __html: settings[`life_${safeNumber}_content`] }} />
        </section>
      )}

      <section className="life-number-detail" id="life-detail">
        <div className="section-kicker">生命靈數 {safeNumber}</div>
        <h2>適合你的水晶</h2>
        {matching.length ? (
          <div className="life-crystal-grid">
            {matching.map(c => (
              <article className="crystal-card" key={c.id}>
                <div className="crystal-art">
                  {c.image_url ? <img src={c.image_url} alt={c.name} style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:18 }} /> : "✦"}
                </div>
                <div className="crystal-name">{c.name}</div>
                {c.color && <div className="crystal-num">色系：{c.color}</div>}
                {c.meaning && <div className="crystal-desc">{c.meaning}</div>}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">目前尚未設定生命靈數 {safeNumber} 的對應水晶。你可以到後台「水晶」資料設定生命靈數。</div>
        )}
      </section>

      <div className="life-number-nav">
        {Array.from({length:9}, (_, i) => i + 1).map(i => (
          <Link key={i} href={`/crystal/number/${i}`} className={i === safeNumber ? "active" : ""}>生命靈數 {i}</Link>
        ))}
      </div>
      <Link className="more" href="/crystal">← 回到生命靈數 × 水晶</Link>
    </main>
  );
}
