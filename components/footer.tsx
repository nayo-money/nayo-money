import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type MenuItem={id:string;label:string;url:string;children?:MenuItem[]};

const DEFAULT_MENU:MenuItem[]=[
 {id:"home",label:"首頁",url:"/",children:[]},
 {id:"blog",label:"理財 Blog",url:"/blog",children:[]},
 {id:"crystal",label:"Nayo Crystal",url:"/crystal",children:[]},
 {id:"about",label:"關於 Nayo",url:"/about",children:[]},
];

export async function Footer(){
  const supabase=await createClient();
  const s:Record<string,string>={
    site_name:"Nayo 娜攸",footer_tagline:"聰明消費・理性理財・自由生活",
    footer_blog_title:"網站導覽",footer_crystal_title:"Crystal",footer_about_title:"關於",
    footer_copyright:"Nayo 娜攸. All rights reserved."
  };
  let menu=DEFAULT_MENU;
  if(supabase){
    const {data}=await supabase.from("site_settings").select("setting_key,setting_value");
    for(const row of data||[]) if(row.setting_key)s[row.setting_key]=row.setting_value??"";
    if(s.menu_json){try{const parsed=JSON.parse(s.menu_json);if(Array.isArray(parsed))menu=parsed}catch{}}
  }
  const groups=menu.slice(0,3);
  return <footer className="footer">
    <div className="container footer-grid">
      <div><strong>{s.site_name}</strong><p>{s.footer_tagline}</p></div>
      <div><strong>{s.footer_blog_title}</strong>{groups.map(item=><Link key={item.id} href={item.url}>{item.label}</Link>)}</div>
      <div><strong>{s.footer_crystal_title}</strong>{(menu[1]?.children||[]).slice(0,5).map(item=><Link key={item.id} href={item.url}>{item.label}</Link>)}</div>
      <div><strong>{s.footer_about_title}</strong>{(menu[3]?.children||[]).map(item=><Link key={item.id} href={item.url}>{item.label}</Link>)}<Link href={s.footer_admin_url||"/admin"}>{s.footer_admin_label||"管理後台"}</Link></div>
    </div>
    <div className="container" style={{marginTop:30}}>© {new Date().getFullYear()} {s.footer_copyright}</div>
  </footer>;
}
