import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function Header() {
  const supabase = await createClient();
  const s: Record<string,string> = {
    site_name:"Nayo 娜攸", site_tagline:"生活理財 × 水晶", site_logo_url:"/icon.svg",
    nav_home_label:"首頁",nav_home_url:"/",
    nav_blog_label:"理財 Blog",nav_blog_url:"/blog",
    nav_blog_all_label:"全部文章",nav_blog_all_url:"/blog",
    nav_blog_credit_label:"信用卡回饋",nav_blog_credit_url:"/blog?category=credit-card",
    nav_blog_finance_label:"小資理財",nav_blog_finance_url:"/blog?category=finance",
    nav_blog_lifestyle_label:"旅行 × 生活",nav_blog_lifestyle_url:"/blog?category=lifestyle",
    nav_blog_crystal_label:"生命靈數 × 水晶",nav_blog_crystal_url:"/blog?category=crystal",
    nav_crystal_label:"Nayo Crystal",nav_crystal_url:"/crystal",
    nav_crystal_life_label:"生命靈數",nav_crystal_life_url:"/crystal",
    nav_crystal_missing_label:"缺數水晶",nav_crystal_missing_url:"/crystal",
    nav_crystal_work_label:"缺數手環作品",nav_crystal_work_url:"/crystal#bracelets",
    nav_crystal_buy_label:"購買須知",nav_crystal_buy_url:"/crystal/buy",
    nav_about_label:"關於 Nayo",nav_about_url:"/about"
  };
  if(supabase){
    const {data}=await supabase.from("site_settings").select("setting_key,setting_value");
    for(const row of data||[]) if(row.setting_key) s[row.setting_key]=row.setting_value??"";
  }
  return <header className="site-header"><nav className="nav">
    <Link href={s.nav_home_url} className="brand" aria-label={`${s.site_name}首頁`}>
      <span className="brand-mark">{s.site_logo_url?<img src={s.site_logo_url} alt=""/>:"N"}</span>
      <span className="brand-copy"><span className="brand-title">{s.site_name}</span><span className="brand-sub">{s.site_tagline}</span></span>
    </Link>
    <div className="nav-links">
      <Link className="nav-link" href={s.nav_home_url}>{s.nav_home_label}</Link>
      <div className="menu-group"><Link className="nav-link" href={s.nav_blog_url}>{s.nav_blog_label} ＋</Link>
        <div className="dropdown" role="menu">
          <Link href={s.nav_blog_all_url}>{s.nav_blog_all_label}</Link><Link href={s.nav_blog_credit_url}>{s.nav_blog_credit_label}</Link><Link href={s.nav_blog_finance_url}>{s.nav_blog_finance_label}</Link><Link href={s.nav_blog_lifestyle_url}>{s.nav_blog_lifestyle_label}</Link><Link href={s.nav_blog_crystal_url}>{s.nav_blog_crystal_label}</Link>
        </div>
      </div>
      <div className="menu-group"><Link className="nav-link" href={s.nav_crystal_url}>{s.nav_crystal_label} ＋</Link>
        <div className="dropdown" role="menu">
          <Link href={s.nav_crystal_life_url}>{s.nav_crystal_life_label}</Link><Link href={s.nav_crystal_missing_url}>{s.nav_crystal_missing_label}</Link><Link href={s.nav_crystal_work_url}>{s.nav_crystal_work_label}</Link><Link href={s.nav_crystal_buy_url}>{s.nav_crystal_buy_label}</Link>
        </div>
      </div>
      <Link className="nav-link" href={s.nav_about_url}>{s.nav_about_label}</Link>
    </div>
    <details className="mobile-menu"><summary aria-label="開啟選單">☰</summary><div className="mobile-panel">
      <Link href={s.nav_home_url}>{s.nav_home_label}</Link>
      <details><summary>{s.nav_blog_label}</summary><div className="mobile-submenu"><Link href={s.nav_blog_all_url}>{s.nav_blog_all_label}</Link><Link href={s.nav_blog_credit_url}>{s.nav_blog_credit_label}</Link><Link href={s.nav_blog_finance_url}>{s.nav_blog_finance_label}</Link><Link href={s.nav_blog_lifestyle_url}>{s.nav_blog_lifestyle_label}</Link><Link href={s.nav_blog_crystal_url}>{s.nav_blog_crystal_label}</Link></div></details>
      <details><summary>{s.nav_crystal_label}</summary><div className="mobile-submenu"><Link href={s.nav_crystal_life_url}>{s.nav_crystal_life_label}</Link><Link href={s.nav_crystal_missing_url}>{s.nav_crystal_missing_label}</Link><Link href={s.nav_crystal_work_url}>{s.nav_crystal_work_label}</Link><Link href={s.nav_crystal_buy_url}>{s.nav_crystal_buy_label}</Link></div></details>
      <Link href={s.nav_about_url}>{s.nav_about_label}</Link>
    </div></details>
  </nav></header>;
}
