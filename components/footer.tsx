import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type FooterLink={id:string;label:string;url:string};
type FooterGroup={id:string;title:string;links:FooterLink[]};

const DEFAULT_GROUPS:FooterGroup[]=[
 {id:"footer-nav",title:"網站導覽",links:[{id:"f-home",label:"首頁",url:"/"},{id:"f-blog",label:"理財 Blog",url:"/blog"},{id:"f-crystal",label:"Nayo Crystal",url:"/crystal"}]},
 {id:"footer-crystal",title:"Crystal",links:[{id:"f-life",label:"生命靈數",url:"/crystal"},{id:"f-buy",label:"購買須知",url:"/crystal/buy"}]},
 {id:"footer-about",title:"關於",links:[{id:"f-about",label:"關於 Nayo",url:"/about"},{id:"f-admin",label:"管理後台",url:"/admin"}]}
];

export async function Footer(){
  const supabase=await createClient();
  const s:Record<string,string>={site_name:"Nayo 娜攸",footer_tagline:"聰明消費・理性理財・自由生活",footer_copyright:"Nayo 娜攸. All rights reserved."};
  let groups=DEFAULT_GROUPS;
  if(supabase){
    const {data}=await supabase.from("site_settings").select("setting_key,setting_value");
    for(const row of data||[])if(row.setting_key)s[row.setting_key]=row.setting_value??"";
    if(s.footer_json){try{const parsed=JSON.parse(s.footer_json);if(Array.isArray(parsed.groups))groups=parsed.groups}catch{}}
  }
  return <footer className="footer">
    <div className="footer-inner">
      <div className="footer-brand"><strong>{s.site_name}</strong><p>{s.footer_tagline}</p></div>
      {groups.map(g=><div className="footer-group" key={g.id}><strong>{g.title}</strong>{(g.links||[]).map(l=><Link key={l.id} href={l.url}>{l.label}</Link>)}</div>)}
    </div>
    <div className="footer-copy">© {new Date().getFullYear()} {s.footer_copyright}</div>
  </footer>;
}
