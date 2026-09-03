import { createClient } from "@/lib/supabase/server";
export const revalidate=60;
export const metadata={title:"購買須知｜Nayo Crystal",description:"Nayo Crystal 購買須知、客製流程、天然水晶注意事項與購買入口。"};
export default async function Buy(){
 const supabase=await createClient();let setting:any={};if(supabase){const {data}=await supabase.from("site_settings").select("setting_key,setting_value");for(const row of data||[]){setting[row.setting_key]=row.setting_value??""}}
 return <main className="container page"><div className="eyebrow">NAYO CRYSTAL</div><h1>購買須知</h1><p className="page-intro">從 Nayo Crystal IG 點進來的人，可以先看完整購買流程與天然水晶注意事項。</p><div className="buy-grid"><div className="buy-box"><h2>① 客製流程</h2><p>提供需求 → 確認手圍與搭配 → 確認價格 → 製作 → 付款出貨。</p></div><div className="buy-box"><h2>② 天然水晶</h2><p>冰裂、棉絮、礦缺與色差都可能是天然特徵，每顆水晶都不完全相同。</p></div><div className="buy-box"><h2>③ 佩戴與保養</h2><p>避免長時間碰水、香水、清潔劑與高溫；收納時保持乾燥。</p></div></div><div className="buy-cta"><h2>WHERE TO BUY</h2><p>購買入口可以直接從後台更新。</p><a className="btn primary" href={setting?.primary_url||"#"}>{setting?.primary_label||"購物賣場"} →</a><a className="btn soft" href={setting?.secondary_url||"#"}>{setting?.secondary_label||"Instagram 私訊"} →</a></div></main>
}
