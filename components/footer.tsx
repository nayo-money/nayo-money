import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <strong>Nayo 娜攸</strong>
          <p>聰明消費・理性理財・自由生活</p>
        </div>
        <div>
          <strong>網站導覽</strong>
          <Link href="/">首頁</Link>
          <Link href="/blog">理財 Blog</Link>
          <Link href="/crystal">Nayo Crystal</Link>
        </div>
        <div>
          <strong>Crystal</strong>
          <Link href="/crystal">生命靈數</Link>
          <Link href="/crystal/buy">購買須知</Link>
        </div>
        <div>
          <strong>關於</strong>
          <Link href="/about">關於 Nayo</Link>
          <Link href="/admin">管理後台</Link>
        </div>
      </div>
      <div className="container" style={{marginTop:30}}>© {new Date().getFullYear()} Nayo 娜攸. All rights reserved.</div>
    </footer>
  );
}