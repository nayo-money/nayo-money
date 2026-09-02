export function PromoCard({title, subtitle, chips, bullets}: {title:string; subtitle:string; chips:string[]; bullets:string[]}) {
  return <article className="promo-card">
    <div className="promo-top">
      <div>
        <div className="chips">{chips.map(c=><span className="chip" key={c}>{c}</span>)}</div>
        <div className="promo-title">{title}</div>
        <div className="promo-sub">{subtitle}</div>
      </div>
      <div className="promo-img">優惠<br/>圖卡</div>
    </div>
    <div className="promo-body">🎁 新戶首刷好禮四選一<ul>{bullets.map(b=><li key={b}>{b}</li>)}</ul></div>
    <div className="promo-meta">◷ 即日起　｜　活動條件請依官方公告<br/>◷ 回饋與門檻以活動頁為準</div>
    <a className="promo-button" href="#">立即申辦 ↗</a>
  </article>
}

export function CrystalWork({num, name, desc}: {num:string; name:string; desc:string}) {
  return <article className="crystal-card">
    <div className="crystal-art">✦</div>
    <div className="crystal-num">缺數 {num}</div>
    <div className="crystal-name">{name}</div>
    <div className="crystal-desc">{desc}</div>
    <a className="more" href="/crystal">查看作品 →</a>
  </article>
}