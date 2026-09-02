import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function Footer() {
  const supabase = await createClient();
  const s: Record<string,string> = {
    site_name:"Nayo 娜攸", footer_tagline:"聰明消費・理性理財・自由生活",
    footer_blog_title:"網站導覽", footer_crystal_title:"Crystal", footer_about_title:"關於",
    footer_admin_label:"管理後台", footer_admin_url:"/admin", footer_copyright:"Nayo 娜攸. All rights reserved."
  };
  if(supabase){
    const {data}=await supabase.from("site_settings").select("setting_key,setting_value");
    for(const row of data||[]) if(row.setting_key) s[row.setting_key]=row.setting_value??"";
  }
  return <footer className="footer"><div className="container footer-grid">
    <div><strong>{s.site_name}</strong><p>{s.footer_tagline}</p></div>
    <div><strong>{s.footer_blog_title}</strong><Link href={s.nav_home_url||"/"}>{s.nav_home_label||"首頁"}</Link><Link href={s.nav_blog_url||"/blog"}>{s.nav_blog_label||"理財 Blog"}</Link><Link href={s.nav_crystal_url||"/crystal"}>{s.nav_crystal_label||"Nayo Crystal"}</Link></div>
    <div><strong>{s.footer_crystal_title}</strong><Link href={s.nav_crystal_life_url||"/crystal"}>{s.nav_crystal_life_label||"生命靈數"}</Link><Link href={s.nav_crystal_buy_url||"/crystal/buy"}>{s.nav_crystal_buy_label||"購買須知"}</Link></div>
    <div><strong>{s.footer_about_title}</strong><Link href={s.nav_about_url||"/about"}>{s.nav_about_label||"關於 Nayo"}</Link><Link href={s.footer_admin_url}>{s.footer_admin_label}</Link></div>
  </div><div className="container" style={{marginTop:30}}>© {new Date().getFullYear()} {s.footer_copyright}</div></footer>;
}
