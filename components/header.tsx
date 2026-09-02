import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type MenuItem = { id:string; label:string; url:string; children?: MenuItem[] };

const DEFAULT_MENU: MenuItem[] = [
  {id:"home",label:"首頁",url:"/",children:[]},
  {id:"blog",label:"理財 Blog",url:"/blog",children:[
    {id:"blog-all",label:"全部文章",url:"/blog"},
    {id:"blog-credit",label:"信用卡回饋",url:"/blog?category=credit-card"},
    {id:"blog-finance",label:"小資理財",url:"/blog?category=finance"},
    {id:"blog-life",label:"旅行 × 生活",url:"/blog?category=lifestyle"},
    {id:"blog-crystal",label:"生命靈數 × 水晶",url:"/blog?category=crystal"},
  ]},
  {id:"crystal",label:"Nayo Crystal",url:"/crystal",children:[
    {id:"crystal-life",label:"生命靈數",url:"/crystal"},
    {id:"crystal-missing",label:"缺數水晶",url:"/crystal"},
    {id:"crystal-work",label:"缺數手環作品",url:"/crystal#bracelets"},
    {id:"crystal-buy",label:"購買須知",url:"/crystal/buy"},
  ]},
  {id:"about",label:"關於 Nayo",url:"/about",children:[]},
];

export async function Header() {
  const supabase=await createClient();
  const s:Record<string,string>={site_name:"Nayo 娜攸",site_tagline:"生活理財 × 水晶",site_logo_url:"/icon.svg"};
  let menu=DEFAULT_MENU;
  if(supabase){
    const {data}=await supabase.from("site_settings").select("setting_key,setting_value");
    for(const row of data||[]) if(row.setting_key) s[row.setting_key]=row.setting_value??"";
    if(s.menu_json){try{const parsed=JSON.parse(s.menu_json);if(Array.isArray(parsed))menu=parsed}catch{}}
  }
  return <header className="site-header"><nav className="nav">
    <Link href="/" className="brand" aria-label={`${s.site_name}首頁`}>
      <span className="brand-mark">{s.site_logo_url?<img src={s.site_logo_url} alt=""/>:"N"}</span>
      <span className="brand-copy"><span className="brand-title">{s.site_name}</span><span className="brand-sub">{s.site_tagline}</span></span>
    </Link>
    <div className="nav-links">
      {menu.map(item=> item.children?.length ? (
        <div className="menu-group" key={item.id}>
          <Link className="nav-link" href={item.url}>{item.label} ＋</Link>
          <div className="dropdown" role="menu">
            {item.children.map(child=><Link key={child.id} href={child.url} role="menuitem">{child.label}</Link>)}
          </div>
        </div>
      ) : <Link className="nav-link" href={item.url} key={item.id}>{item.label}</Link>)}
    </div>
    <details className="mobile-menu"><summary aria-label="開啟選單">☰</summary><div className="mobile-panel">
      {menu.map(item=> item.children?.length ? (
        <details key={item.id}><summary>{item.label}</summary><div className="mobile-submenu">{item.children.map(child=><Link key={child.id} href={child.url}>{child.label}</Link>)}</div></details>
      ) : <Link key={item.id} href={item.url}>{item.label}</Link>)}
    </div></details>
  </nav></header>;
}
