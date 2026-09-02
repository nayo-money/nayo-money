import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function Header() {
  const supabase = await createClient();
  const fallback = { site_name: "Nayo 娜攸", site_tagline: "生活理財 × 水晶" };
  let siteName = fallback.site_name;
  let siteTagline = fallback.site_tagline;

  if (supabase) {
    const { data } = await supabase.from("site_settings").select("setting_key, setting_value");
    for (const row of data || []) {
      if (row.setting_key === "site_name") siteName = row.setting_value || fallback.site_name;
      if (row.setting_key === "site_tagline") siteTagline = row.setting_value || fallback.site_tagline;
    }
  }

  return (
    <header className="site-header">
      <nav className="nav">
        <Link href="/" className="brand" aria-label={`${siteName}首頁`}>
          <span className="brand-mark">N</span>
          <span className="brand-copy">
            <span className="brand-title">{siteName}</span>
            <span className="brand-sub">{siteTagline}</span>
          </span>
        </Link>

        <div className="nav-links">
          <Link className="nav-link" href="/">首頁</Link>
          <div className="menu-group">
            <Link className="nav-link" href="/blog" aria-haspopup="menu">理財 Blog ＋</Link>
            <div className="dropdown" role="menu">
              <Link href="/blog" role="menuitem">全部文章</Link>
              <Link href="/blog?category=credit-card" role="menuitem">信用卡回饋</Link>
              <Link href="/blog?category=finance" role="menuitem">小資理財</Link>
              <Link href="/blog?category=lifestyle" role="menuitem">旅行 × 生活</Link>
              <Link href="/blog?category=crystal" role="menuitem">生命靈數 × 水晶</Link>
            </div>
          </div>
          <div className="menu-group">
            <Link className="nav-link" href="/crystal" aria-haspopup="menu">Nayo Crystal ＋</Link>
            <div className="dropdown" role="menu">
              <Link href="/crystal" role="menuitem">生命靈數</Link>
              <Link href="/crystal" role="menuitem">缺數水晶</Link>
              <Link href="/crystal#bracelets" role="menuitem">缺數手環作品</Link>
              <Link href="/crystal/buy" role="menuitem">購買須知</Link>
            </div>
          </div>
          <Link className="nav-link" href="/about">關於 Nayo</Link>
        </div>

        <details className="mobile-menu">
          <summary aria-label="開啟選單">☰</summary>
          <div className="mobile-panel">
            <Link href="/">首頁</Link>
            <details>
              <summary>理財 Blog</summary>
              <div className="mobile-submenu">
                <Link href="/blog">全部文章</Link>
                <Link href="/blog?category=credit-card">信用卡回饋</Link>
                <Link href="/blog?category=finance">小資理財</Link>
                <Link href="/blog?category=lifestyle">旅行 × 生活</Link>
                <Link href="/blog?category=crystal">生命靈數 × 水晶</Link>
              </div>
            </details>
            <details>
              <summary>Nayo Crystal</summary>
              <div className="mobile-submenu">
                <Link href="/crystal">生命靈數</Link>
                <Link href="/crystal">缺數水晶</Link>
                <Link href="/crystal#bracelets">缺數手環作品</Link>
                <Link href="/crystal/buy">購買須知</Link>
              </div>
            </details>
            <Link href="/about">關於 Nayo</Link>
          </div>
        </details>
      </nav>
    </header>
  );
}
