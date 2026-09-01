import Link from "next/link";

export function Header() {
  return (
    <header className="site-header">
      <nav className="nav">
        <Link href="/" className="brand" aria-label="Nayo 娜攸首頁">
          <span className="brand-mark">N</span>
          <span>
            <span className="brand-title">Nayo 娜攸</span>
            <span className="brand-sub">生活理財 × 水晶</span>
          </span>
        </Link>

        <div className="nav-links">
          <Link className="nav-link" href="/">首頁</Link>

          <div className="menu-group">
            <span className="nav-link" tabIndex={0}>理財 Blog ＋</span>
            <div className="dropdown">
              <Link href="/blog">全部文章</Link>
              <Link href="/blog?category=credit-card">信用卡回饋</Link>
              <Link href="/blog?category=finance">小資理財</Link>
              <Link href="/blog?category=lifestyle">旅行 × 生活</Link>
              <Link href="/blog?category=crystal">生命靈數 × 水晶</Link>
            </div>
          </div>

          <div className="menu-group">
            <span className="nav-link" tabIndex={0}>Nayo Crystal ＋</span>
            <div className="dropdown">
              <Link href="/crystal">生命靈數</Link>
              <Link href="/crystal">缺數水晶</Link>
              <Link href="/crystal#bracelets">缺數手環作品</Link>
              <Link href="/crystal/buy">購買須知</Link>
            </div>
          </div>

          <Link className="nav-link" href="/about">關於 Nayo</Link>
        </div>

        <button className="mobile-menu" aria-label="開啟選單">☰</button>
      </nav>
    </header>
  );
}