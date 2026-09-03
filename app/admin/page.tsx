"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const supabase = createClient();
const adminSupabase = supabase!;

type Tab = "overview" | "home" | "menu" | "footer" | "posts" | "categories" | "crystals" | "products" | "promotions";
const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "總覽", icon: "⌂" },
  { id: "home", label: "首頁設定", icon: "✦" },
  { id: "menu", label: "網站選單", icon: "☰" },
  { id: "footer", label: "頁尾連結", icon: "⌄" },
  { id: "posts", label: "Blog 文章", icon: "✎" },
  { id: "categories", label: "文章分類", icon: "▦" },
  { id: "crystals", label: "水晶", icon: "◇" },
  { id: "products", label: "手環作品", icon: "♢" },
  { id: "promotions", label: "信用卡優惠", icon: "▣" },
];

type Row = Record<string, any>;

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState({ posts: 0, categories: 0, crystals: 0, products: 0, promotions: 0 });

  useEffect(() => {
    if (!supabase) {
      setError("網站尚未設定 Supabase 環境變數。請在 Vercel 加入 NEXT_PUBLIC_SUPABASE_URL 與 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY。\n\n注意：變數加入後要重新部署。 ");
      setChecking(false);
      return;
    }

    let active = true;
    async function init() {
      const { data, error: sessionError } = await adminSupabase.auth.getSession();
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      if (data.session?.user) {
        const ok = await checkAdmin(data.session.user);
        if (active) {
          setUser(data.session.user);
          setAuthorized(ok);
        }
      }
      if (active) setChecking(false);
    }
    init();

    const { data: listener } = adminSupabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      if (!session?.user) {
        setUser(null);
        setAuthorized(false);
        return;
      }
      const ok = await checkAdmin(session.user);
      if (active) {
        setUser(session.user);
        setAuthorized(ok);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authorized) loadStats();
  }, [authorized]);

  async function checkAdmin(currentUser: User) {
    if (!supabase) return false;
    setError("");
    // Preferred path: SECURITY DEFINER function. This avoids exposing the admins table to normal clients.
    const rpc = await adminSupabase.rpc("is_admin");
    if (!rpc.error) {
      if (rpc.data === true) return true;
      setError("登入成功，但這個帳號還不是 Nayo 管理員。請在 Supabase 的 admins 表加入這個 Auth User 的 UUID。\n\n目前登入：" + (currentUser.email || "無 Email"));
      return false;
    }

    // Compatibility fallback for projects that already have an admins table but not is_admin().
    const fallback = await adminSupabase.from("admins").select("user_id").eq("user_id", currentUser.id).maybeSingle();
    if (fallback.data) return true;
    if (fallback.error) {
      setError(`無法確認管理員權限。Supabase 回傳：${fallback.error.message}\n\n請先執行專案內的 supabase-setup.sql。`);
    } else {
      setError("登入成功，但這個帳號還不是 Nayo 管理員。請把 Auth User UUID 加入 public.admins。\n\n目前登入：" + (currentUser.email || "無 Email"));
    }
    return false;
  }

  async function loadStats() {
    if (!supabase) return;
    const [posts, categories, crystals, products, promotions] = await Promise.all([
      adminSupabase.from("posts").select("id", { count: "exact", head: true }),
      adminSupabase.from("categories").select("id", { count: "exact", head: true }),
      adminSupabase.from("crystals").select("id", { count: "exact", head: true }),
      adminSupabase.from("products").select("id", { count: "exact", head: true }),
      adminSupabase.from("promotions").select("id", { count: "exact", head: true }),
    ]);
    setStats({ posts: posts.count ?? 0, categories: categories.count ?? 0, crystals: crystals.count ?? 0, products: products.count ?? 0, promotions: promotions.count ?? 0 });
  }

  async function login(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    setMessage("");
    const { data, error: loginError } = await adminSupabase.auth.signInWithPassword({ email: email.trim(), password });
    if (loginError) {
      setError(loginError.message === "Invalid login credentials" ? "Email 或密碼錯誤。" : loginError.message);
      setBusy(false);
      return;
    }
    if (!data.user) {
      setError("登入失敗，沒有取得使用者資料。");
      setBusy(false);
      return;
    }
    const ok = await checkAdmin(data.user);
    setUser(data.user);
    setAuthorized(ok);
    setBusy(false);
  }

  async function logout() {
    if (supabase) await adminSupabase.auth.signOut();
    setUser(null);
    setAuthorized(false);
    setMessage("已登出。");
  }

  if (checking) return <Shell><div className="loading">載入 Nayo Admin…</div></Shell>;

  if (!authorized) return <Shell>
    <main className="login-wrap">
      <section className="login-card">
        <div className="brand-mark">N</div>

        <p className="eyebrow">NAYO ADMIN</p>

        <h1>管理員登入</h1>

        <p className="lead">
          登入後管理 Nayo 的首頁、理財 Blog、Crystal 與手環作品。
        </p>

        <form onSubmit={login} className="login-form">
          <label>
            帳號
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="帳號"
              required
            />
          </label>

          <label>
            密碼
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="密碼"
              required
            />
          </label>

          {(error || message) && (
            <div className={error ? "error-box" : "success-box"}>
              {error || message}
            </div>
          )}

          <button
            className="primary"
            disabled={busy || !supabase}
          >
            {busy ? "登入中…" : "登入管理後台"}
          </button>
        </form>

        <a className="back-link" href="/">
          ← 回到 Nayo 首頁
        </a>
      </section>
    </main>
  </Shell>;

  return <Shell>
    <div className="admin-layout">
      <aside className="sidebar">
        <a href="/" className="side-brand"><span className="brand-mark small">N</span><span><b>Nayo</b><small>理財 × 水晶 × 生活</small></span></a>
        <div className="side-label">網站管理</div>
        <nav>{tabs.map(item => <button key={item.id} className={tab === item.id ? "nav-item active" : "nav-item"} onClick={() => { setTab(item.id); setError(""); }}>{item.icon}<span>{item.label}</span></button>)}</nav>
        <div className="side-bottom">
          <div className="admin-user"><div className="avatar">{(user?.email?.[0] || "N").toUpperCase()}</div><div><b>管理員</b><small>{user?.email}</small></div></div>
          <button className="logout" onClick={logout}>登出</button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="topbar"><div><p className="eyebrow">NAYO CMS</p><h1>{tabs.find(x => x.id === tab)?.label}</h1></div><a href="/" className="view-site">查看網站 ↗</a></header>
        {error && <div className="notice error-box">{error}</div>}
        {message && <div className="notice success-box">{message}</div>}
        {tab === "overview" && <Overview stats={stats} setTab={setTab} />}
        {tab === "home" && <HomeEditor notify={setMessage} fail={setError} />}
        {tab === "menu" && <MenuEditor notify={setMessage} fail={setError} />}
        {tab === "footer" && <FooterEditor notify={setMessage} fail={setError} />}
        {tab === "posts" && <PostsEditor notify={setMessage} fail={setError} />}
        {tab === "categories" && <CategoriesEditor notify={setMessage} fail={setError} />}
        {tab === "crystals" && <CrystalsEditor notify={setMessage} fail={setError} />}
        {tab === "products" && <ProductsEditor notify={setMessage} fail={setError} />}
        {tab === "promotions" && <PromotionsEditor notify={setMessage} fail={setError} />}
      </main>
    </div>
  </Shell>;
}

function Overview({ stats, setTab }: { stats: { posts:number; categories:number; crystals:number; products:number; promotions:number }, setTab:(tab:Tab)=>void }) {
  const cards: [Tab,string,number,string][] = [["posts","Blog 文章",stats.posts,"✎"],["categories","文章分類",stats.categories,"▦"],["crystals","水晶",stats.crystals,"◇"],["products","手環作品",stats.products,"♢"],["promotions","信用卡優惠",stats.promotions,"▣"]];
  return <>
    <section className="welcome"><div><span className="pill">Nayo CMS</span><h2>今天也好好整理你的網站。</h2><p>首頁內容與商品資料不用再改程式，登入後直接在這裡編輯。</p></div><div className="welcome-mark">N</div></section>
    <div className="stats-grid">{cards.map(([id,label,count,icon]) => <button key={id} className="stat-card" onClick={() => setTab(id)}><span className="stat-icon">{icon}</span><span className="stat-label">{label}</span><strong>{count}</strong><small>管理 →</small></button>)}</div>
    <section className="next-card"><p className="eyebrow">CMS</p><h2>你現在可以直接管理網站內容</h2><p>首頁設定可換大頭貼、主圖、標題與按鈕；Blog、分類、水晶與手環作品都可以新增、修改、刪除。</p></section>
  </>;
}

async function uploadImage(file: File, folder: string) {
  if (!supabase) throw new Error("Supabase 尚未設定");
  if (!file.type.startsWith("image/")) throw new Error("請選擇圖片檔案");
  if (file.size > 5 * 1024 * 1024) throw new Error("圖片不能超過 5 MB");
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await adminSupabase.storage.from("site-images").upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return adminSupabase.storage.from("site-images").getPublicUrl(path).data.publicUrl;
}

function HomeEditor({ notify, fail }: { notify:(s:string)=>void; fail:(s:string)=>void }) {
  const defaults: Row = {
    site_name:"Nayo 娜攸",
    site_tagline:"生活理財 × 水晶",
    site_logo_url:"/icon.svg",
    favicon_url:"/icon.svg",
    profile_name:"娜攸",
    profile_image:"",
    hero_image:"",
    hero_title:"把理財變成，喜歡的生活。",
    hero_highlight:"喜歡的生活",
    hero_description:"分享信用卡回饋、小資理財、旅行生活，也記錄生命靈數與水晶。",
    primary_label:"逛理財 Blog",
    primary_url:"/blog",
    secondary_label:"探索 Nayo Crystal",
    secondary_url:"/crystal",
    about_text:"理財讓生活有更多選擇，而生命靈數與水晶，是我探索生活與自己的另一種方式。",
    about_kicker:"ABOUT NAYO",
    about_title:"讓理財成為喜歡的生活。",
    about_description:"從信用卡回饋、小資理財，到生命靈數與水晶，這裡是 Nayo 整理生活與靈感的地方。",
    about_button_label:"認識 Nayo →",
    about_button_url:"/about",
    blog_feature_title:"生活理財 Blog",
    blog_feature_description:"信用卡回饋、小資理財、ETF／投資、旅行 × 生活，把實用資訊整理成容易閱讀的筆記。",
    blog_feature_button:"進入理財 Blog →",
    blog_feature_url:"/blog",
    crystal_feature_title:"生命靈數 × 水晶",
    crystal_feature_description:"缺數解析、天然水晶、客製手環與作品展示。從生命靈數認識自己，再找到適合自己的水晶。",
    crystal_feature_button:"探索 Crystal →",
    crystal_feature_url:"/crystal",
    crystal_feature_buy_button:"購買須知 →",
    crystal_feature_buy_url:"/crystal/buy",
    footer_tagline:"聰明消費・理性理財・自由生活",
    footer_blog_title:"網站導覽", footer_crystal_title:"Crystal", footer_about_title:"關於",
    footer_admin_label:"管理後台", footer_admin_url:"/admin",
    footer_copyright:"Nayo 娜攸. All rights reserved."
  };

  const [form,setForm]=useState<Row>(defaults);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);

  useEffect(()=>{
    let active=true;
    (async()=>{
      if(!supabase){setLoading(false);return;}

      const {data,error}=await adminSupabase
        .from("site_settings")
        .select("setting_key, setting_value");

      if(!active)return;

      if(error){
        fail(error.message);
        setLoading(false);
        return;
      }

      const settings:Row={...defaults};
      for(const row of data||[]){
        if(row.setting_key) settings[row.setting_key]=row.setting_value??"";
      }

      setForm(settings);
      setLoading(false);
    })();

    return()=>{active=false};
  },[fail]);

  const set=(k:string,v:any)=>setForm((x:Row)=>({...x,[k]:v}));

  async function image(field:string,file?:File){
    if(!file)return;
    try{
      const url=await uploadImage(file,"home");
      set(field,url);
      notify("圖片已上傳，記得按儲存首頁設定。");
    }catch(e:any){
      fail(e.message||"圖片上傳失敗");
    }
  }

  async function save(){
    if(!supabase)return;
    setSaving(true);

    try{
      for(const [setting_key,value] of Object.entries(form)){
        const {error}=await adminSupabase
          .from("site_settings")
          .upsert(
            {
              setting_key,
              setting_value:value==null?"":String(value),
              updated_at:new Date().toISOString()
            },
            {onConflict:"setting_key"}
          );

        if(error)throw error;
      }

      notify("首頁設定已儲存。");
    }catch(e:any){
      fail(e.message||"首頁設定儲存失敗");
    }finally{
      setSaving(false);
    }
  }

  if(loading)return <section className="empty-card"><p>載入首頁設定…</p></section>;

  return <section className="editor">
    <div className="editor-head">
      <div>
        <p className="eyebrow">HOME CMS</p>
        <h2>首頁內容</h2>
        <p>換圖、改標題、改按鈕，不需要再修改程式。</p>
      </div>
      <button className="primary compact" onClick={save} disabled={saving}>
        {saving?"儲存中…":"儲存首頁設定"}
      </button>
    </div>

    <div className="form-grid">
      <Field label="網站名稱" value={form.site_name} onChange={v=>set("site_name",v)}/>
      <Field label="網站副標" value={form.site_tagline} onChange={v=>set("site_tagline",v)}/>
      <Field label="個人名稱" value={form.profile_name} onChange={v=>set("profile_name",v)}/>
      <TextArea label="關於我" value={form.about_text} onChange={v=>set("about_text",v)} full/>

      <Field label="主標題" value={form.hero_title} onChange={v=>set("hero_title",v)} full/>
      <Field label="主標題強調文字" value={form.hero_highlight} onChange={v=>set("hero_highlight",v)}/>
      <Field label="首頁說明" value={form.hero_description} onChange={v=>set("hero_description",v)} full/>

      <Field label="第一顆按鈕文字" value={form.primary_label} onChange={v=>set("primary_label",v)}/>
      <Field label="第一顆按鈕連結" value={form.primary_url} onChange={v=>set("primary_url",v)}/>
      <Field label="第二顆按鈕文字" value={form.secondary_label} onChange={v=>set("secondary_label",v)}/>
      <Field label="第二顆按鈕連結" value={form.secondary_url} onChange={v=>set("secondary_url",v)}/>

      <Field label="首頁最下方小標" value={form.about_kicker} onChange={v=>set("about_kicker",v)}/>
      <Field label="首頁最下方標題" value={form.about_title} onChange={v=>set("about_title",v)}/>
      <TextArea label="首頁最下方說明" value={form.about_description} onChange={v=>set("about_description",v)} full/>
      <Field label="首頁最下方按鈕文字" value={form.about_button_label} onChange={v=>set("about_button_label",v)}/>
      <Field label="首頁最下方按鈕連結" value={form.about_button_url} onChange={v=>set("about_button_url",v)}/>

      <div className="form-section-title">首頁兩個功能區塊</div>
      <Field label="Blog 區塊標題" value={form.blog_feature_title} onChange={v=>set("blog_feature_title",v)}/>
      <Field label="Blog 區塊按鈕文字" value={form.blog_feature_button} onChange={v=>set("blog_feature_button",v)}/>
      <Field label="Blog 區塊連結" value={form.blog_feature_url} onChange={v=>set("blog_feature_url",v)}/>
      <TextArea label="Blog 區塊說明" value={form.blog_feature_description} onChange={v=>set("blog_feature_description",v)} full/>
      <Field label="Crystal 區塊標題" value={form.crystal_feature_title} onChange={v=>set("crystal_feature_title",v)}/>
      <Field label="Crystal 區塊按鈕文字" value={form.crystal_feature_button} onChange={v=>set("crystal_feature_button",v)}/>
      <Field label="Crystal 區塊連結" value={form.crystal_feature_url} onChange={v=>set("crystal_feature_url",v)}/>
      <TextArea label="Crystal 區塊說明" value={form.crystal_feature_description} onChange={v=>set("crystal_feature_description",v)} full/>
      <Field label="Crystal 購買須知按鈕文字" value={form.crystal_feature_buy_button} onChange={v=>set("crystal_feature_buy_button",v)}/>
      <Field label="Crystal 購買須知連結" value={form.crystal_feature_buy_url} onChange={v=>set("crystal_feature_buy_url",v)}/>

      <ImageField label="大頭貼" value={form.profile_image} onChange={file=>image("profile_image",file)} setUrl={v=>set("profile_image",v)}/>
      <ImageField label="首頁主圖" value={form.hero_image} onChange={file=>image("hero_image",file)} setUrl={v=>set("hero_image",v)}/>
      <ImageField label="網站 Logo" value={form.site_logo_url} onChange={file=>image("site_logo_url",file)} setUrl={v=>set("site_logo_url",v)}/>
      <ImageField label="瀏覽器 Logo（Favicon）" value={form.favicon_url} onChange={file=>image("favicon_url",file)} setUrl={v=>set("favicon_url",v)}/>
    </div>
  </section>;
}


type MenuItem = { id:string; label:string; url:string; children?: MenuItem[] };

const DEFAULT_MENU: MenuItem[] = [
  { id:"home", label:"首頁", url:"/", children:[] },
  { id:"blog", label:"理財 Blog", url:"/blog", children:[
    { id:"blog-all", label:"全部文章", url:"/blog" },
    { id:"blog-credit", label:"信用卡回饋", url:"/blog?category=credit-card" },
    { id:"blog-finance", label:"小資理財", url:"/blog?category=finance" },
    { id:"blog-life", label:"旅行 × 生活", url:"/blog?category=lifestyle" },
    { id:"blog-crystal", label:"生命靈數 × 水晶", url:"/blog?category=crystal" },
  ]},
  { id:"crystal", label:"Nayo Crystal", url:"/crystal", children:[
    { id:"crystal-life", label:"生命靈數", url:"/crystal" },
    { id:"crystal-missing", label:"缺數水晶", url:"/crystal" },
    { id:"crystal-work", label:"缺數手環作品", url:"/crystal#bracelets" },
    { id:"crystal-buy", label:"購買須知", url:"/crystal/buy" },
  ]},
  { id:"about", label:"關於 Nayo", url:"/about", children:[] },
];

function MenuEditor({notify,fail}:{notify:(s:string)=>void;fail:(s:string)=>void}){
  const [items,setItems]=useState<MenuItem[]>(DEFAULT_MENU);
  const [categories,setCategories]=useState<Row[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [categoryParent,setCategoryParent]=useState("blog");
  const [categoryId,setCategoryId]=useState("");

  useEffect(()=>{(async()=>{
    if(!supabase)return;
    setLoading(true);
    const [{data:s,error:se},{data:c,error:ce}]=await Promise.all([
      adminSupabase.from("site_settings").select("setting_key,setting_value").eq("setting_key","menu_json").maybeSingle(),
      adminSupabase.from("categories").select("id,name,slug").order("sort_order").order("name")
    ]);
    if(se)fail(se.message);
    if(ce)fail(ce.message);
    if(s?.setting_value){
      try{
        const parsed=JSON.parse(s.setting_value);
        if(Array.isArray(parsed))setItems(parsed);
      }catch{}
    }
    setCategories(c||[]);
    setLoading(false);
  })()},[fail]);

  const updateItem=(id:string,key:"label"|"url",value:string)=>{
    setItems(prev=>prev.map(x=>x.id===id?{...x,[key]:value}:{
      ...x,children:(x.children||[]).map(y=>y.id===id?{...y,[key]:value}:y)
    }));
  };
  const removeItem=(id:string)=>{
    setItems(prev=>prev.filter(x=>x.id!==id).map(x=>({...x,children:(x.children||[]).filter(y=>y.id!==id)})));
  };
  const addTop=()=>setItems(prev=>[...prev,{id:`menu-${crypto.randomUUID()}`,label:"新選單",url:"/",children:[]}]);
  const addChild=(parentId:string)=>setItems(prev=>prev.map(x=>x.id===parentId?{...x,children:[...(x.children||[]),{id:`menu-${crypto.randomUUID()}`,label:"新下拉項目",url:"/"}]}:x));
  const addCategory=()=>{
    const c=categories.find(x=>x.id===categoryId);
    const parent=items.find(x=>x.id===categoryParent);
    if(!c||!parent)return;
    const child={id:`category-${c.id}`,label:c.name,url:`/blog?category=${encodeURIComponent(c.slug)}`};
    setItems(prev=>prev.map(x=>x.id===categoryParent?{...x,children:[...(x.children||[]),child]}:x));
    setCategoryId("");
  };
  const save=async()=>{
    if(!supabase)return;
    setSaving(true);
    try{
      const {error}=await adminSupabase.from("site_settings").upsert({
        setting_key:"menu_json",setting_value:JSON.stringify(items),updated_at:new Date().toISOString()
      },{onConflict:"setting_key"});
      if(error)throw error;
      notify("網站選單已儲存。");
    }catch(e:any){fail(e.message||"網站選單儲存失敗")}finally{setSaving(false)}
  };
  if(loading)return <section className="empty-card"><p>載入網站選單…</p></section>;
  return <section className="editor">
    <div className="editor-head">
      <div><p className="eyebrow">MENU CMS</p><h2>網站選單</h2><p>主選單與下拉項目可自行新增、修改、刪除。</p></div>
      <button className="primary compact" onClick={save} disabled={saving}>{saving?"儲存中…":"儲存網站選單"}</button>
    </div>
    <div className="menu-category-box">
      <strong>把文章分類加入下拉選單</strong>
      <p>先在「文章分類」建立分類，再選擇要放入哪個主選單。</p>
      <div className="form-grid">
        <label>放入主選單<select value={categoryParent} onChange={e=>setCategoryParent(e.target.value)}>
          {items.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}
        </select></label>
        <label>文章分類<select value={categoryId} onChange={e=>setCategoryId(e.target.value)}>
          <option value="">請選擇分類</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select></label>
      </div>
      <button className="secondary" onClick={addCategory} disabled={!categoryId}>＋加入下拉選單</button>
    </div>
    <div className="menu-editor-list">
      {items.map((item,index)=><div className="menu-editor-item" key={item.id}>
        <div className="menu-editor-main">
          <span className="menu-drag">☰</span>
          <Field label={`主選單 ${index+1} 名稱`} value={item.label} onChange={v=>updateItem(item.id,"label",v)}/>
          <Field label="連結網址" value={item.url} onChange={v=>updateItem(item.id,"url",v)}/>
          <button className="danger-outline" onClick={()=>removeItem(item.id)}>刪除</button>
        </div>
        <div className="menu-children">
          <div className="menu-children-head"><strong>下拉選項</strong><button className="secondary" onClick={()=>addChild(item.id)}>＋新增下拉項目</button></div>
          {(item.children||[]).map(child=><div className="menu-child-row" key={child.id}>
            <Field label="名稱" value={child.label} onChange={v=>updateItem(child.id,"label",v)}/>
            <Field label="連結網址" value={child.url} onChange={v=>updateItem(child.id,"url",v)}/>
            <button className="danger-outline" onClick={()=>removeItem(child.id)}>刪除</button>
          </div>)}
          {!(item.children||[]).length&&<p className="muted">這個主選單目前沒有下拉選項。</p>}
        </div>
      </div>)}
    </div>
    <button className="secondary add-menu-top" onClick={addTop}>＋新增主選單項目</button>
  </section>;
}

function FooterEditor({notify,fail}:{notify:(s:string)=>void;fail:(s:string)=>void}){
  type FooterLink={id:string;label:string;url:string};
  type FooterGroup={id:string;title:string;links:FooterLink[]};
  const defaults:{tagline:string;groups:FooterGroup[];copyright:string}={
    tagline:"聰明消費・理性理財・自由生活",
    groups:[
      {id:"footer-nav",title:"網站導覽",links:[{id:"f-home",label:"首頁",url:"/"},{id:"f-blog",label:"理財 Blog",url:"/blog"},{id:"f-crystal",label:"Nayo Crystal",url:"/crystal"}]},
      {id:"footer-crystal",title:"Crystal",links:[{id:"f-life",label:"生命靈數",url:"/crystal"},{id:"f-buy",label:"購買須知",url:"/crystal/buy"}]},
      {id:"footer-about",title:"關於",links:[{id:"f-about",label:"關於 Nayo",url:"/about"},{id:"f-admin",label:"管理後台",url:"/admin"}]}
    ],
    copyright:"Nayo 娜攸. All rights reserved."
  };
  const [form,setForm]=useState(defaults); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false);
  useEffect(()=>{(async()=>{if(!supabase)return;const {data,error}=await adminSupabase.from("site_settings").select("setting_key,setting_value");if(error)fail(error.message);const s:any={};for(const r of data||[])s[r.setting_key]=r.setting_value||"";if(s.footer_json){try{const j=JSON.parse(s.footer_json);setForm({...defaults,...j})}catch{}}else setForm({...defaults,tagline:s.footer_tagline||defaults.tagline,copyright:s.footer_copyright||defaults.copyright});setLoading(false)})()},[fail]);
  const set=(k:string,v:any)=>setForm(x=>({...x,[k]:v}));
  const addGroup=()=>set("groups",[...form.groups,{id:`fg-${crypto.randomUUID()}`,title:"新欄位",links:[]}]);
  const removeGroup=(id:string)=>set("groups",form.groups.filter(g=>g.id!==id));
  const updateGroup=(id:string,k:"title",v:string)=>set("groups",form.groups.map(g=>g.id===id?{...g,[k]:v}:g));
  const addLink=(gid:string)=>set("groups",form.groups.map(g=>g.id===gid?{...g,links:[...g.links,{id:`fl-${crypto.randomUUID()}`,label:"新連結",url:"/"}]}:g));
  const updateLink=(gid:string,lid:string,k:"label"|"url",v:string)=>set("groups",form.groups.map(g=>g.id===gid?{...g,links:g.links.map(l=>l.id===lid?{...l,[k]:v}:l)}:g));
  const removeLink=(gid:string,lid:string)=>set("groups",form.groups.map(g=>g.id===gid?{...g,links:g.links.filter(l=>l.id!==lid)}:g));
  const save=async()=>{if(!supabase)return;setSaving(true);try{
    const rows=[
      ["footer_tagline",form.tagline],["footer_copyright",form.copyright],
      ["footer_json",JSON.stringify({groups:form.groups})]
    ];
    for(const [setting_key,value] of rows){const {error}=await adminSupabase.from("site_settings").upsert({setting_key,setting_value:String(value),updated_at:new Date().toISOString()},{onConflict:"setting_key"});if(error)throw error}
    notify("頁尾設定已儲存。");
  }catch(e:any){fail(e.message||"頁尾設定儲存失敗")}finally{setSaving(false)}};
  if(loading)return <section className="empty-card"><p>載入頁尾設定…</p></section>;
  return <section className="editor">
    <div className="editor-head"><div><p className="eyebrow">FOOTER CMS</p><h2>頁尾連結</h2><p>頁尾欄位、連結名稱與網址都可以自行新增、修改、刪除。</p></div><button className="primary compact" onClick={save} disabled={saving}>{saving?"儲存中…":"儲存頁尾設定"}</button></div>
    <div className="form-grid">
      <Field label="頁尾品牌說明" value={form.tagline} onChange={v=>set("tagline",v)} full/>
      <Field label="版權文字" value={form.copyright} onChange={v=>set("copyright",v)} full/>
    </div>
    <div className="menu-editor-list">
      {form.groups.map(g=><div className="menu-editor-item" key={g.id}>
        <div className="menu-editor-main" style={{gridTemplateColumns:"1fr auto"}}>
          <Field label="欄位標題" value={g.title} onChange={v=>updateGroup(g.id,"title",v)}/>
          <button className="danger-outline" onClick={()=>removeGroup(g.id)}>刪除欄位</button>
        </div>
        <div className="menu-children">
          <div className="menu-children-head"><strong>連結</strong><button className="secondary" onClick={()=>addLink(g.id)}>＋新增連結</button></div>
          {g.links.map(l=><div className="menu-child-row" key={l.id}>
            <Field label="名稱" value={l.label} onChange={v=>updateLink(g.id,l.id,"label",v)}/>
            <Field label="連結網址" value={l.url} onChange={v=>updateLink(g.id,l.id,"url",v)}/>
            <button className="danger-outline" onClick={()=>removeLink(g.id,l.id)}>刪除</button>
          </div>)}
        </div>
      </div>)}
    </div>
    <button className="secondary add-menu-top" onClick={addGroup}>＋新增頁尾欄位</button>
  </section>;
}

function PromotionsEditor({notify,fail}:{notify:(s:string)=>void;fail:(s:string)=>void}){
  const fields=[
    {k:"bank",l:"銀行"},
    {k:"badge",l:"標籤"},
    {k:"title",l:"卡片名稱"},
    {k:"subtitle",l:"副標"},
    {k:"image",l:"圖片網址"},
    {k:"bullets",l:"優惠重點（每行一項）",area:true},
    {k:"meta",l:"活動條件（每行一項）",area:true},
    {k:"deadline",l:"期限"},
    {k:"url",l:"申辦連結"},
    {k:"sort_order",l:"排序",number:true}
  ];
  const [rows,setRows]=useState<Row[]>([]);const [editing,setEditing]=useState<Row|null>(null);const [loading,setLoading]=useState(true);
  async function load(){if(!supabase)return;setLoading(true);const {data,error}=await adminSupabase.from("promotions").select("*").order("sort_order").order("created_at",{ascending:false});if(error)fail(error.message);setRows((data||[]).map((r:any)=>({...r,bullets:Array.isArray(r.bullets)?r.bullets.join("\n"):"",meta:Array.isArray(r.meta)?r.meta.join("\n"):""})));setLoading(false)}
  useEffect(()=>{load()},[]);
  async function save(row:Row){if(!supabase)return;const payload: Row={...row,bullets:String(row.bullets||"").split("\n").map(x=>x.trim()).filter(Boolean),meta:String(row.meta||"").split("\n").map(x=>x.trim()).filter(Boolean),sort_order:Number(row.sort_order||0)};delete payload.id;delete payload.created_at;delete payload.updated_at;const result=row.id?await adminSupabase.from("promotions").update(payload).eq("id",row.id):await adminSupabase.from("promotions").insert(payload);if(result.error)return fail(result.error.message);notify(row.id?"信用卡優惠已更新。":"信用卡優惠已新增。");setEditing(null);load()}
  async function remove(id:string){if(!supabase||!confirm("確定刪除這筆信用卡優惠？"))return;const {error}=await adminSupabase.from("promotions").delete().eq("id",id);if(error)fail(error.message);else{notify("信用卡優惠已刪除。");load()}}
  if(editing)return <section className="editor"><EditorHead title={editing.id?"編輯信用卡優惠":"新增信用卡優惠"} onSave={()=>save(editing)} onCancel={()=>setEditing(null)}/><div className="form-grid">{fields.map((f:any)=>f.area?<TextArea key={f.k} label={f.l} value={editing[f.k]||""} onChange={v=>setEditing({...editing,[f.k]:v})} full/>:<Field key={f.k} label={f.l} value={editing[f.k]??""} type={f.number?"number":"text"} onChange={v=>setEditing({...editing,[f.k]:f.number?Number(v):v})}/>)}</div></section>
  return <CrudList title="信用卡優惠" loading={loading} rows={rows} onAdd={()=>setEditing({bank:"",badge:"",title:"",subtitle:"",image:"",bullets:"",meta:"",deadline:"",url:"",sort_order:0})} onEdit={setEditing} onDelete={remove} columns={["bank","title","deadline","sort_order"]}/>;
}

function PostsEditor({notify,fail}:{notify:(s:string)=>void;fail:(s:string)=>void}){
  const [rows,setRows]=useState<Row[]>([]); const [editing,setEditing]=useState<Row|null>(null); const [cats,setCats]=useState<Row[]>([]); const [loading,setLoading]=useState(true);
  async function load(){if(!supabase)return;setLoading(true);const [{data:p,error:pe},{data:c,error:ce}]=await Promise.all([adminSupabase.from("posts").select("*, categories(name)").order("created_at",{ascending:false}),adminSupabase.from("categories").select("id,name").order("sort_order")]);if(pe)fail(pe.message);if(ce)fail(ce.message);setRows(p||[]);setCats(c||[]);setLoading(false)}
  useEffect(()=>{load()},[]);
  async function save(row:Row){if(!supabase)return;const payload: Row={...row,category_id:row.category_id||null,published_at:row.status==="published"?(row.published_at||new Date().toISOString()):null};delete payload["categories"];const {error}=row.id?await adminSupabase.from("posts").update(payload).eq("id",row.id):await adminSupabase.from("posts").insert(payload);if(error)fail(error.message);else{notify(row.id?"文章已更新。":"文章已新增。");setEditing(null);load()}}
  async function remove(id:string){if(!supabase||!confirm("確定刪除這篇文章？"))return;const {error}=await adminSupabase.from("posts").delete().eq("id",id);if(error)fail(error.message);else{notify("文章已刪除。");load()}}
  if(editing)return <PostForm row={editing} cats={cats} onSave={save} onCancel={()=>setEditing(null)} onUpload={async f=>{const u=await uploadImage(f,"posts");setEditing(x=>({...x,cover_image:u}));}}/>;
  return <CrudList title="Blog 文章" loading={loading} rows={rows} onAdd={()=>setEditing({title:"",slug:"",excerpt:"",content:"",cover_image:"",status:"draft",category_id:"",seo_title:"",seo_description:""})} onEdit={setEditing} onDelete={remove} columns={["title","status","created_at"]}/>
}
function PostForm({row,cats,onSave,onCancel,onUpload}:{row:Row;cats:Row[];onSave:(r:Row)=>void;onCancel:()=>void;onUpload:(f:File)=>Promise<void>}){const [x,setX]=useState(row);const set=(k:string,v:any)=>setX({...x,[k]:v});return <section className="editor"><EditorHead title={x.id?"編輯文章":"新增文章"} onSave={()=>onSave(x)} onCancel={onCancel}/><div className="form-grid"><Field label="標題" value={x.title} onChange={v=>set("title",v)} full/><Field label="Slug" value={x.slug} onChange={v=>set("slug",v)}/><select className="field" value={x.category_id||""} onChange={e=>set("category_id",e.target.value)}><option value="">未分類</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><select className="field" value={x.status} onChange={e=>set("status",e.target.value)}><option value="draft">草稿</option><option value="published">發布</option></select><Field label="SEO 標題" value={x.seo_title||""} onChange={v=>set("seo_title",v)}/><Field label="SEO 描述" value={x.seo_description||""} onChange={v=>set("seo_description",v)} full/><TextArea label="摘要" value={x.excerpt||""} onChange={v=>set("excerpt",v)} full/><TextArea label="文章內容 HTML" value={x.content||""} onChange={v=>set("content",v)} full/><ImageField label="封面圖片" value={x.cover_image||""} onChange={onUpload} setUrl={v=>set("cover_image",v)}/></div></section>}

function CategoriesEditor({notify,fail}:{notify:(s:string)=>void;fail:(s:string)=>void}){return <SimpleCrud table="categories" title="文章分類" fields={[{k:"name",l:"分類名稱"},{k:"slug",l:"Slug"},{k:"description",l:"說明",area:true},{k:"sort_order",l:"排序",number:true}]} notify={notify} fail={fail}/>} 
function CrystalsEditor({notify,fail}:{notify:(s:string)=>void;fail:(s:string)=>void}){return <SimpleCrud table="crystals" title="水晶" fields={[{k:"name",l:"水晶名稱"},{k:"slug",l:"Slug"},{k:"life_numbers",l:"生命靈數"},{k:"color",l:"代表色"},{k:"meaning",l:"寓意",area:true},{k:"image_url",l:"圖片網址"},{k:"sort_order",l:"排序",number:true}]} imageFolder="crystals" notify={notify} fail={fail}/>} 
function ProductsEditor({notify,fail}:{notify:(s:string)=>void;fail:(s:string)=>void}){return <SimpleCrud table="products" title="手環作品" fields={[{k:"name",l:"作品名稱"},{k:"slug",l:"Slug"},{k:"missing_numbers",l:"缺數"},{k:"description",l:"作品介紹",area:true},{k:"price",l:"價格",number:true},{k:"image_url",l:"圖片網址"},{k:"purchase_url",l:"購買連結"},{k:"instagram_url",l:"Instagram 連結"},{k:"sort_order",l:"排序",number:true}]} imageFolder="products" notify={notify} fail={fail}/>} 

function SimpleCrud({table,title,fields,notify,fail,imageFolder}:{table:string;title:string;fields:{k:string;l:string;area?:boolean;number?:boolean}[];notify:(s:string)=>void;fail:(s:string)=>void;imageFolder?:string}){
  const [rows,setRows]=useState<Row[]>([]);const [editing,setEditing]=useState<Row|null>(null);const [loading,setLoading]=useState(true);
  async function load(){if(!supabase)return;setLoading(true);const {data,error}=await adminSupabase.from(table).select("*").order("sort_order",{ascending:true}).order("created_at",{ascending:false});if(error)fail(error.message);setRows(data||[]);setLoading(false)}useEffect(()=>{load()},[table]);
  async function save(row:Row){if(!supabase)return;const payload={...row};if(table==="categories"){payload.type=payload.type||"blog";if(payload.is_active==null)payload.is_active=true;}if(table==="products" && payload.missing_numbers==null)payload.missing_numbers="";if(payload.id){const {error}=await adminSupabase.from(table).update(payload).eq("id",payload.id);if(error)return fail(error.message)}else{delete payload.id;const {error}=await adminSupabase.from(table).insert(payload);if(error)return fail(error.message)}notify(`${title}已儲存。`);setEditing(null);load()}
  async function remove(id:string){if(!supabase||!confirm(`確定刪除這筆${title}？`))return;const {error}=await adminSupabase.from(table).delete().eq("id",id);if(error)fail(error.message);else{notify(`${title}已刪除。`);load()}}
  if(editing){return <section className="editor"><EditorHead title={editing.id?`編輯${title}`:`新增${title}`} onSave={()=>save(editing)} onCancel={()=>setEditing(null)}/><div className="form-grid">{fields.map(f=>f.area?<TextArea key={f.k} label={f.l} value={editing[f.k]??""} onChange={v=>setEditing({...editing,[f.k]:v})} full/>:<Field key={f.k} label={f.l} value={editing[f.k]??""} type={f.number?"number":"text"} onChange={v=>setEditing({...editing,[f.k]:f.number?(v===""?null:Number(v)):v})} full={f.k==="description"}/>)}</div>{imageFolder&&<ImageField label="直接上傳圖片" value={editing.image_url||""} onChange={async f=>{try{const u=await uploadImage(f,imageFolder);setEditing({...editing,image_url:u});notify("圖片已上傳，儲存後生效。")}catch(e:any){fail(e.message)}}} setUrl={v=>setEditing({...editing,image_url:v})}/>}</section>}
  return <CrudList title={title} loading={loading} rows={rows} onAdd={()=>setEditing(Object.fromEntries(fields.map(f=>[f.k,f.number?0:""])))} onEdit={setEditing} onDelete={remove} columns={fields.slice(0,4).map(f=>f.k)}/>
}

function CrudList({title,rows,loading,onAdd,onEdit,onDelete,columns}:{title:string;rows:Row[];loading:boolean;onAdd:()=>void;onEdit:(r:Row)=>void;onDelete:(id:string)=>void;columns:string[]}){return <section className="editor"><div className="editor-head"><div><p className="eyebrow">NAYO CMS</p><h2>{title}</h2><p>共 {rows.length} 筆</p></div><button className="primary compact" onClick={onAdd}>＋ 新增</button></div>{loading?<div className="loading-box">載入中…</div>:rows.length===0?<div className="empty-row">目前沒有資料，按右上角「新增」開始建立。</div>:<div className="table-wrap"><table><thead><tr>{columns.map(c=><th key={c}>{labelFor(c)}</th>)}<th>操作</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}>{columns.map(c=><td key={c}>{formatCell(c,r[c])}</td>)}<td><button className="table-btn" onClick={()=>onEdit(r)}>編輯</button><button className="table-btn danger" onClick={()=>onDelete(r.id)}>刪除</button></td></tr>)}</tbody></table></div>}</section>}
function labelFor(k:string){return ({title:"標題",name:"名稱",status:"狀態",created_at:"建立時間",slug:"Slug",life_numbers:"生命靈數",color:"代表色",missing_numbers:"缺數"} as Row)[k]||k}
function formatCell(k:string,v:any){if(v==null)return "—";if(k==="created_at")return new Date(v).toLocaleDateString("zh-TW");if(typeof v==="object")return v.name||"—";return String(v).slice(0,80)}
function EditorHead({title,onSave,onCancel}:{title:string;onSave:()=>void;onCancel:()=>void}){return <div className="editor-head"><div><p className="eyebrow">NAYO CMS</p><h2>{title}</h2></div><div className="head-actions"><button className="soft-btn" onClick={onCancel}>取消</button><button className="primary compact" onClick={onSave}>儲存</button></div></div>}
function Field({label,value,onChange,type="text",full=false}:{label:string;value:any;onChange:(v:string)=>void;type?:string;full?:boolean}){return <label className={full?"field-label full":"field-label"}>{label}<input type={type} value={value??""} onChange={e=>onChange(e.target.value)}/></label>}
function TextArea({label,value,onChange,full=false}:{label:string;value:any;onChange:(v:string)=>void;full?:boolean}){return <label className={full?"field-label full":"field-label"}>{label}<textarea value={value??""} onChange={e=>onChange(e.target.value)} rows={5}/></label>}
function ImageField({label,value,onChange,setUrl}:{label:string;value:string;onChange:(f:File)=>void;setUrl:(v:string)=>void}){return <div className="image-field"><div className="image-label">{label}</div>{value&&<img src={value} alt="預覽"/>}<input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f)onChange(f)}}/><input value={value||""} onChange={e=>setUrl(e.target.value)} placeholder="或貼上圖片網址"/></div>}
function Shell({children}:{children:React.ReactNode}){return <><style>{CSS}</style>{children}</>}

const CSS=`
:root{--bg:#f8f4f0;--card:#fffdfb;--ink:#2e2926;--muted:#8c8078;--rose:#b9968a;--rose2:#eadbd5;--line:#e8ddd7}*{box-sizing:border-box}html,body{margin:0;padding:0;background:var(--bg);color:var(--ink)}body{font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC",sans-serif}button,input,textarea,select{font:inherit}.loading{min-height:100dvh;display:grid;place-items:center;color:var(--muted)}.login-wrap{min-height:100dvh;display:grid;place-items:center;padding:24px}.login-card{width:min(100%,480px);background:var(--card);border:1px solid var(--line);border-radius:28px;padding:42px;box-shadow:0 20px 70px #5d46331a}.brand-mark{width:54px;height:54px;border:1px solid var(--rose2);border-radius:50%;display:grid;place-items:center;font:27px Georgia,serif;color:var(--rose);background:#fff}.brand-mark.small{width:40px;height:40px;font-size:21px}.eyebrow{font-size:12px;letter-spacing:.18em;color:#b67e70;font-weight:800;margin:0 0 9px}.login-card h1,.topbar h1,.welcome h2,.next-card h2,.empty-card h2,.editor h2{font-family:Georgia,"Noto Serif TC",serif}.login-card h1{font-size:40px;margin:0 0 10px}.lead{color:var(--muted);line-height:1.8;margin-bottom:28px}.login-form{display:grid;gap:18px}.login-form label,.field-label{display:grid;gap:8px;font-size:13px;font-weight:700}.login-form input,.field-label input,.field-label textarea,.field{width:100%;border:1px solid var(--line);background:#fff;border-radius:12px;padding:13px 14px;outline:none}.form-section-title{grid-column:1/-1;font-family:Georgia,"Noto Serif TC",serif;font-size:20px;font-weight:700;margin-top:18px;padding-top:18px;border-top:1px solid var(--line)}.field-label textarea{resize:vertical;line-height:1.7}.login-form input:focus,.field-label input:focus,.field-label textarea:focus,.field:focus{border-color:var(--rose);box-shadow:0 0 0 3px #b9968a1a}.primary{border:0;border-radius:12px;padding:14px 18px;background:#3b332f;color:#fff;cursor:pointer;font-weight:700}.primary:disabled{opacity:.6}.compact{padding:11px 16px}.soft-btn{border:1px solid var(--line);background:#fff;border-radius:11px;padding:10px 15px;cursor:pointer}.head-actions{display:flex;gap:9px}.error-box{padding:12px 14px;background:#fff0ee;border:1px solid #efd0ca;color:#a34d42;border-radius:10px;font-size:13px;line-height:1.65;white-space:pre-line}.success-box{padding:12px 14px;background:#eef8f1;border:1px solid #cfe6d6;color:#477254;border-radius:10px;font-size:13px;line-height:1.65;white-space:pre-line}back-link{display:block;margin-top:22px;color:var(--muted);font-size:13px;text-decoration:none}.admin-layout{min-height:100dvh;display:flex}.sidebar{width:260px;background:#302b28;color:#fff;padding:24px 18px;display:flex;flex-direction:column}.side-brand{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none;padding:5px 8px 28px}.side-brand span:last-child{display:grid}.side-brand b{font-size:16px}.side-brand small{font-size:11px;color:#c8b9b1}.side-label{font-size:10px;letter-spacing:.18em;color:#a99991;padding:0 12px 10px}.sidebar nav{display:grid;gap:4px}.nav-item{border:0;background:transparent;color:#d7ccc6;text-align:left;padding:12px;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:11px;font-size:14px}.nav-item:hover,.nav-item.active{background:#4a403b;color:#fff}.nav-item.active{box-shadow:inset 3px 0 var(--rose)}.side-bottom{margin-top:auto;border-top:1px solid #ffffff16;padding:18px 8px 4px}.admin-user{display:flex;align-items:center;gap:9px}.avatar{width:34px;height:34px;border-radius:50%;background:#efe1da;color:#72584d;display:grid;place-items:center;font-weight:800}.admin-user b,.admin-user small{display:block}.admin-user b{font-size:12px}.admin-user small{font-size:10px;color:#a99b94;max-width:160px;overflow:hidden;text-overflow:ellipsis}.logout{width:100%;margin-top:14px;border:1px solid #ffffff20;background:transparent;color:#cfc3bd;border-radius:9px;padding:9px;cursor:pointer;font-size:12px}.admin-main{flex:1;min-width:0;padding:34px clamp(20px,4vw,56px);max-width:1500px}.topbar{display:flex;justify-content:space-between;align-items:end;margin-bottom:26px}.topbar h1{font-size:34px;margin:0}.view-site{color:#7f665c;text-decoration:none;font-size:13px;border:1px solid var(--line);padding:9px 13px;border-radius:10px;background:#fff}.notice{margin-bottom:18px}.welcome{display:flex;justify-content:space-between;align-items:center;background:linear-gradient(120deg,#fffdfb,#f4e8e2);border:1px solid var(--line);border-radius:22px;padding:28px;margin-bottom:18px}.welcome h2{font-size:25px;margin:7px 0}.welcome p{color:var(--muted);line-height:1.8;margin:0}.pill{display:inline-block;border-radius:999px;background:#fff;color:#967568;border:1px solid var(--rose2);font-size:11px;padding:5px 9px}.welcome-mark{width:80px;height:80px;border-radius:50%;background:#fff;border:1px solid var(--rose2);display:grid;place-items:center;color:var(--rose);font:42px Georgia,serif}.stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.stat-card{border:1px solid var(--line);background:var(--card);border-radius:18px;padding:20px;text-align:left;cursor:pointer;display:grid;gap:7px}.stat-icon{font-size:18px;color:var(--rose)}.stat-label{font-size:13px;color:var(--muted)}.stat-card strong{font-size:30px}.stat-card small{font-size:11px;color:#a9897d}.next-card,.empty-card,.editor{margin-top:18px;border:1px solid var(--line);background:var(--card);border-radius:22px;padding:28px}.next-card h2{font-size:24px}.next-card p:last-child,.editor-head p{color:var(--muted);line-height:1.8}.editor-head{display:flex;justify-content:space-between;gap:20px;align-items:center;margin-bottom:24px}.editor h2{font-size:27px;margin:3px 0}.editor-head p{margin:0}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:17px}.field-label.full{grid-column:1/-1}.image-field{grid-column:1/-1;border:1px dashed #d9c8c0;border-radius:16px;padding:16px;display:grid;gap:10px;background:#fffaf7}.image-label{font-size:13px;font-weight:800}.image-field img{width:180px;height:120px;object-fit:cover;border-radius:12px;border:1px solid var(--line)}.image-field input{width:100%;border:1px solid var(--line);background:#fff;border-radius:10px;padding:10px}.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:14px;background:#fff}.table-wrap table{border-collapse:collapse;width:100%;min-width:680px}.table-wrap th,.table-wrap td{padding:12px 13px;border-bottom:1px solid #eee5df;text-align:left;font-size:12px;vertical-align:top}.table-wrap th{background:#fbf6f2;color:#7d6f68;font-size:11px}.table-wrap tr:last-child td{border-bottom:0}.table-btn{border:1px solid var(--line);background:#fff;border-radius:8px;padding:6px 9px;font-size:11px;cursor:pointer;margin-right:6px}.table-btn.danger{color:#a34d42}.empty-row,.loading-box{padding:50px 20px;text-align:center;color:var(--muted);border:1px dashed #dfd1c9;border-radius:14px;background:#fffaf7}@media(max-width:900px){.sidebar{width:82px;padding:18px 10px}.side-brand span:last-child,.side-label{display:none}.side-brand{justify-content:center}.nav-item{justify-content:center;font-size:0}.nav-item span{display:none}.nav-item::first-letter{font-size:18px}.admin-user>div:last-child,.logout{display:none}.stats-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:620px){.admin-layout{display:block}.sidebar{position:sticky;top:0;z-index:20;width:100%;height:auto;display:flex;flex-direction:row;padding:8px 10px;overflow:auto}.side-brand{padding:0 8px}.sidebar nav{display:flex}.nav-item{min-width:56px}.side-bottom{display:none}.admin-main{padding:22px 14px}.topbar h1{font-size:28px}.welcome{padding:20px}.welcome-mark{display:none}.form-grid{grid-template-columns:1fr}.field-label.full,.image-field{grid-column:auto}.editor-head{align-items:flex-start;flex-direction:column}.head-actions{width:100%}.head-actions button{flex:1}.stats-grid{gap:9px}.stat-card{padding:15px}.login-card{padding:30px 22px}}
`;