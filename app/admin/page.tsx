"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const supabase = createClient();
const adminSupabase = supabase!;

type Tab = "overview" | "home" | "menu" | "footer" | "posts" | "categories" | "crystalPage" | "products" | "promotions" | "about";
const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "總覽", icon: "⌂" },
  { id: "home", label: "首頁設定", icon: "✦" },
  { id: "menu", label: "網站選單", icon: "☰" },
  { id: "footer", label: "頁尾連結", icon: "⌄" },
  { id: "posts", label: "Blog 文章", icon: "✎" },
  { id: "categories", label: "文章分類", icon: "▦" },
  { id: "crystalPage", label: "Crystal 頁面", icon: "◇" },
  { id: "products", label: "手環作品", icon: "♢" },
  { id: "about", label: "關於 Nayo", icon: "◎" },
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
  const [stats, setStats] = useState({ posts: 0, categories: 0, products: 0, promotions: 0 });

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
    const [posts, categories, products, promotions] = await Promise.all([
      adminSupabase.from("posts").select("id", { count: "exact", head: true }),
      adminSupabase.from("categories").select("id", { count: "exact", head: true }),
      adminSupabase.from("products").select("id", { count: "exact", head: true }),
      adminSupabase.from("promotions").select("id", { count: "exact", head: true }),
    ]);
    setStats({ posts: posts.count ?? 0, categories: categories.count ?? 0, products: products.count ?? 0, promotions: promotions.count ?? 0 });
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
        {tab === "crystalPage" && <CrystalPageEditor notify={setMessage} fail={setError} />}
        {tab === "products" && <ProductsEditor notify={setMessage} fail={setError} />}
        {tab === "about" && <AboutEditor notify={setMessage} fail={setError} />}
        {tab === "promotions" && <PromotionsEditor notify={setMessage} fail={setError} />}
      </main>
    </div>
  </Shell>;
}

function Overview({ stats, setTab }: { stats: { posts:number; categories:number; products:number; promotions:number }, setTab:(tab:Tab)=>void }) {
  const cards: [Tab,string,number,string][] = [["posts","Blog 文章",stats.posts,"✎"],["categories","文章分類",stats.categories,"▦"],["products","手環作品",stats.products,"♢"],["promotions","信用卡優惠",stats.promotions,"▣"]];
  return <>
    <section className="welcome"><div><span className="pill">Nayo CMS</span><h2>今天也好好整理你的網站。</h2><p>首頁內容與商品資料不用再改程式，登入後直接在這裡編輯。</p></div><div className="welcome-mark">N</div></section>
    <div className="stats-grid">{cards.map(([id,label,count,icon]) => <button key={id} className="stat-card" onClick={() => setTab(id)}><span className="stat-icon">{icon}</span><span className="stat-label">{label}</span><strong>{count}</strong><small>管理 →</small></button>)}</div>
    <section className="next-card"><p className="eyebrow">CMS</p><h2>你現在可以直接管理網站內容</h2><p>首頁設定可換大頭貼、主圖、標題與按鈕；Blog、分類與手環作品都可以新增、修改、刪除。</p></section>
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


type MenuItem = { id:string; label:string; url:string; pageDescription?: string; children?: MenuItem[]; pageLinks?: MenuItem[] };

const DEFAULT_MENU: MenuItem[] = [
  { id:"home", label:"首頁", url:"/", pageDescription:"", children:[] },
  { id:"blog", label:"理財 Blog", url:"/blog", pageDescription:"信用卡回饋、小資理財、旅行生活，也可以寫生命靈數與水晶。", children:[
    { id:"blog-all", label:"全部文章", url:"/blog" },
    { id:"blog-credit", label:"信用卡回饋", url:"/blog?category=credit-card" },
    { id:"blog-finance", label:"小資理財", url:"/blog?category=finance" },
    { id:"blog-life", label:"旅行 × 生活", url:"/blog?category=lifestyle" },
    { id:"blog-crystal", label:"生命靈數 × 水晶", url:"/blog?category=crystal" },
  ]},
  { id:"crystal", label:"Nayo Crystal", url:"/crystal", pageDescription:"從缺數認識自己，再挑選適合自己的水晶。", children:[
    { id:"crystal-life", label:"生命靈數", url:"/crystal" },
    { id:"crystal-missing", label:"缺數水晶", url:"/crystal" },
    { id:"crystal-work", label:"缺數手環作品", url:"/crystal#bracelets" },
    { id:"crystal-buy", label:"購買須知", url:"/crystal/buy" },
  ], pageLinks:Array.from({length:9},(_,i)=>({id:`life-${i+1}`,label:`生命靈數 ${i+1}`,url:`/crystal/number/${i+1}`}))},
  { id:"about", label:"關於 Nayo", url:"/about", pageDescription:"", children:[] },
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
        if(Array.isArray(parsed)){
          const merged=DEFAULT_MENU.map(def=>{
            const saved=parsed.find((x:MenuItem)=>x.id===def.id || x.url===def.url);
            if(!saved)return def;
            return {
              ...def,
              ...saved,
              children:Array.isArray(saved.children)?saved.children:def.children,
              pageLinks:Array.isArray(saved.pageLinks)?saved.pageLinks.map((y:any,i:number)=>({ ...y, url: (!y.url || String(y.url).startsWith("#number-")) ? `/crystal/number/${i+1}` : y.url })):def.pageLinks,
            };
          });
          for(const saved of parsed){if(!merged.some(x=>x.id===saved.id))merged.push(saved);}
          setItems(merged);
        }
      }catch{}
    }
    setCategories(c||[]);
    setLoading(false);
  })()},[fail]);

  const updateItem=(id:string,key:"label"|"url"|"pageDescription",value:string)=>{
    setItems(prev=>prev.map(x=>x.id===id?{...x,[key]:value}:{
      ...x,children:(x.children||[]).map(y=>y.id===id?{...y,[key]:value}:y),
      pageLinks:(x.pageLinks||[]).map(y=>y.id===id?{...y,[key]:value}:y)
    }));
  };
  const removeItem=(id:string)=>{
    setItems(prev=>prev.filter(x=>x.id!==id).map(x=>({...x,children:(x.children||[]).filter(y=>y.id!==id),pageLinks:(x.pageLinks||[]).filter(y=>y.id!==id)})));
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
      <div><p className="eyebrow">MENU CMS</p><h2>網站選單</h2><p>主選單與下拉項目可自行新增、修改、刪除；每個下拉頁面也能設定自己的頁面說明。</p></div>
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
          <TextArea label="頁面標題下方說明" value={item.pageDescription||""} onChange={v=>updateItem(item.id,"pageDescription",v)}/>
          <button className="danger-outline" onClick={()=>removeItem(item.id)}>刪除</button>
        </div>
        <div className="menu-children">
          <div className="menu-children-head"><strong>下拉選項</strong><button className="secondary" onClick={()=>addChild(item.id)}>＋新增下拉項目</button></div>
          {(item.children||[]).map(child=><div className="menu-child-row" key={child.id}>
            <Field label="名稱／頁面標題" value={child.label} onChange={v=>updateItem(child.id,"label",v)}/>
            <Field label="連結網址" value={child.url} onChange={v=>updateItem(child.id,"url",v)}/>
            <TextArea label="頁面說明" value={child.pageDescription||""} onChange={v=>updateItem(child.id,"pageDescription",v)}/>
            <button className="danger-outline" onClick={()=>removeItem(child.id)}>刪除</button>
          </div>)}
          {!(item.children||[]).length&&<p className="muted">這個主選單目前沒有下拉選項。</p>}
        </div>
      </div>)}
    </div>
    <div className="menu-category-box" style={{marginTop:24}}>
      <strong>頁面內分類／導覽按鈕</strong>
      <p>Blog 會直接使用上方下拉選單的項目；Crystal 可在這裡另外管理生命靈數 1～9 的頁面按鈕。</p>
      {(items.filter(x=>x.id==="crystal")).map(item=><div key={item.id} className="menu-children" style={{marginTop:14}}>
        {(item.pageLinks||[]).map(link=><div className="menu-child-row" key={link.id}>
          <Field label="按鈕名稱" value={link.label} onChange={v=>setItems(prev=>prev.map(x=>x.id===item.id?{...x,pageLinks:(x.pageLinks||[]).map(y=>y.id===link.id?{...y,label:v}:y)}:x))}/>
          <Field label="頁面位置" value={link.url} onChange={v=>setItems(prev=>prev.map(x=>x.id===item.id?{...x,pageLinks:(x.pageLinks||[]).map(y=>y.id===link.id?{...y,url:v}:y)}:x))}/>
        </div>)}
      </div>)}
    </div>
    <button className="secondary add-menu-top" onClick={addTop}>＋新增主選單項目</button>
  </section>;
}


function CrystalPageEditor({notify,fail}:{notify:(s:string)=>void;fail:(s:string)=>void}){
  const defaults:Row={
    crystal_page_eyebrow:"NAYO CRYSTAL",
    crystal_page_title:"生命靈數 × 水晶",
    crystal_page_description:"從缺數認識自己，再挑選適合自己的水晶。水晶內容與手環作品都可以從管理後台更新。",
    life_1_title:"生命靈數 1", life_1_subtitle:"查看對應水晶",
    life_2_title:"生命靈數 2", life_2_subtitle:"查看對應水晶",
    life_3_title:"生命靈數 3", life_3_subtitle:"查看對應水晶",
    life_4_title:"生命靈數 4", life_4_subtitle:"查看對應水晶",
    life_5_title:"生命靈數 5", life_5_subtitle:"查看對應水晶",
    life_6_title:"生命靈數 6", life_6_subtitle:"查看對應水晶",
    life_7_title:"生命靈數 7", life_7_subtitle:"查看對應水晶",
    life_8_title:"生命靈數 8", life_8_subtitle:"查看對應水晶",
    life_9_title:"生命靈數 9", life_9_subtitle:"查看對應水晶",
    bracelet_kicker:"CUSTOM BRACELETS", bracelet_title:"缺數手環作品", bracelet_button:"購買須知 →", bracelet_url:"/crystal/buy",
    bracelet_categories_json:"[\"全部\"]",
    crystal_article_categories_json:"[\"credit-card\",\"finance\",\"lifestyle\",\"crystal\"]",
    buy_page_eyebrow:"NAYO CRYSTAL", buy_page_title:"購買須知", buy_page_description:"從 Nayo Crystal IG 點進來的人，可以先看完整購買流程與天然水晶注意事項。",
    buy_process_title:"① 客製流程", buy_process_text:"提供需求 → 確認手圍與搭配 → 確認價格 → 製作 → 付款出貨。",
    buy_natural_title:"② 天然水晶", buy_natural_text:"冰裂、棉絮、礦缺與色差都可能是天然特徵，每顆水晶都不完全相同。",
    buy_care_title:"③ 佩戴與保養", buy_care_text:"避免長時間碰水、香水、清潔劑與高溫；收納時保持乾燥。",
    buy_where_title:"WHERE TO BUY", buy_where_description:"購買入口可以直接從後台更新。",
    buy_primary_label:"前往生活理財Blog →", buy_primary_url:"/blog",
    buy_secondary_label:"逛娜攸水晶補能量Nayo Crystal →", buy_secondary_url:"/crystal"
  };
  const [form,setForm]=useState<Row>(defaults); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false);
  const [blogCategories,setBlogCategories]=useState<{id:string;name:string;slug:string}[]>([]);
  useEffect(()=>{(async()=>{if(!supabase){setLoading(false);return;} const [settingsResult,categoriesResult]=await Promise.all([adminSupabase.from("site_settings").select("setting_key,setting_value"),adminSupabase.from("categories").select("id,name,slug,type,is_active,sort_order").eq("type","blog").eq("is_active",true).order("sort_order")]); if(settingsResult.error){fail(settingsResult.error.message);setLoading(false);return;} if(categoriesResult.error){fail(categoriesResult.error.message);setLoading(false);return;} const next={...defaults}; for(const r of settingsResult.data||[]){if(r.setting_key)next[r.setting_key]=r.setting_value??"";} setForm(next); setBlogCategories((categoriesResult.data||[]) as {id:string;name:string;slug:string}[]); setLoading(false);})()},[fail]);
  const set=(k:string,v:string)=>setForm((x:Row)=>({...x,[k]:v}));
  const selectedArticleCategories=()=>{try{const v=JSON.parse(form.crystal_article_categories_json||"[]"); return Array.isArray(v)?v.map(String):[];}catch{return []}};
  const setSelectedArticleCategories=(values:string[])=>set("crystal_article_categories_json",JSON.stringify(values));
  const addArticleCategory=()=>{const selected=selectedArticleCategories(); const next=blogCategories.find(c=>!selected.includes(c.slug)); if(next)setSelectedArticleCategories([...selected,next.slug]);};
  const removeArticleCategory=(slug:string)=>setSelectedArticleCategories(selectedArticleCategories().filter(x=>x!==slug));
  async function save(){if(!supabase)return;setSaving(true);try{for(const [setting_key,value] of Object.entries(form)){const {error}=await adminSupabase.from("site_settings").upsert({setting_key,setting_value:value==null?"":String(value),updated_at:new Date().toISOString()},{onConflict:"setting_key"});if(error)throw error;}notify("Crystal 頁面設定已儲存。");}catch(e:any){fail(e.message||"Crystal 頁面設定儲存失敗")}finally{setSaving(false)}}
  if(loading)return <section className="empty-card"><p>載入 Crystal 頁面設定…</p></section>;
  return <section className="editor">
    <div className="editor-head"><div><p className="eyebrow">CRYSTAL PAGE CMS</p><h2>Crystal 頁面</h2><p>這裡管理 Crystal 頁面的文字、生命靈數按鈕與購買須知內容；文章分類直接使用網站的「文章分類」。</p></div><button className="primary compact" onClick={save} disabled={saving}>{saving?"儲存中…":"儲存 Crystal 頁面"}</button></div>
    <div className="form-grid">
      <div className="form-section-title">生命靈數 × 水晶首頁</div>
      <Field label="頁面小標" value={form.crystal_page_eyebrow} onChange={v=>set("crystal_page_eyebrow",v)}/>
      <Field label="頁面標題" value={form.crystal_page_title} onChange={v=>set("crystal_page_title",v)}/>
      <TextArea label="頁面說明" value={form.crystal_page_description} onChange={v=>set("crystal_page_description",v)} full/>
      <div className="form-section-title">生命靈數 1～9</div>
      {Array.from({length:9},(_,i)=>i+1).map(n=><div key={n} className="settings-number-card"><strong>生命靈數 {n}</strong><Field label="卡片標題" value={form[`life_${n}_title`]} onChange={v=>set(`life_${n}_title`,v)}/><Field label="卡片小字" value={form[`life_${n}_subtitle`]} onChange={v=>set(`life_${n}_subtitle`,v)}/><a className="number-content-edit" href={`/admin/crystal/number/${n}`}>編輯生命靈數 {n} 內容頁 →</a></div>)}
      <div className="form-section-title">Crystal 中間文章區塊</div>
      <div className="crystal-section-picker">
        <div className="crystal-section-picker-head"><strong>選擇要顯示的文章分類</strong><button type="button" className="secondary" onClick={addArticleCategory} disabled={!blogCategories.some(c=>!selectedArticleCategories().includes(c.slug))}>＋新增分類區塊</button></div>
        <p className="muted">這裡選的分類會直接變成 Crystal 頁面的區塊標題，下面顯示該分類文章；前台不會顯示分類按鈕。</p>
        {selectedArticleCategories().map((slug,index)=>{const category=blogCategories.find(c=>c.slug===slug); return <div className="crystal-section-row" key={`${slug}-${index}`}>
          <select className="field" value={slug} onChange={e=>{const values=selectedArticleCategories(); const next=values.map((x,i)=>i===index?e.target.value:x).filter((x,i,a)=>a.indexOf(x)===i); setSelectedArticleCategories(next);}}>
            {blogCategories.map(c=><option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
          <button type="button" className="danger-outline" onClick={()=>removeArticleCategory(slug)}>刪除</button>
        </div>})}
        {!selectedArticleCategories().length&&<p className="muted">目前沒有設定分類區塊。</p>}
      </div>

      <div className="form-section-title">手環作品區</div>
      <Field label="區塊小標" value={form.bracelet_kicker} onChange={v=>set("bracelet_kicker",v)}/><Field label="區塊標題" value={form.bracelet_title} onChange={v=>set("bracelet_title",v)}/><Field label="右側按鈕文字" value={form.bracelet_button} onChange={v=>set("bracelet_button",v)}/><Field label="右側按鈕連結" value={form.bracelet_url} onChange={v=>set("bracelet_url",v)}/><TextArea label="手環作品分類條（每行一個）" value={(() => { try { const v=JSON.parse(form.bracelet_categories_json||"[\"全部\"]"); return Array.isArray(v)?v.join("\n"):"全部"; } catch { return "全部"; } })()} onChange={v=>set("bracelet_categories_json",JSON.stringify(v.split(/\n+/).map(x=>x.trim()).filter(Boolean)))} full/>
      <div className="form-section-title">購買須知頁</div>
      <Field label="頁面小標" value={form.buy_page_eyebrow} onChange={v=>set("buy_page_eyebrow",v)}/><Field label="頁面標題" value={form.buy_page_title} onChange={v=>set("buy_page_title",v)}/><TextArea label="頁面說明" value={form.buy_page_description} onChange={v=>set("buy_page_description",v)} full/>
      <Field label="① 標題" value={form.buy_process_title} onChange={v=>set("buy_process_title",v)}/><TextArea label="① 內容" value={form.buy_process_text} onChange={v=>set("buy_process_text",v)} />
      <Field label="② 標題" value={form.buy_natural_title} onChange={v=>set("buy_natural_title",v)}/><TextArea label="② 內容" value={form.buy_natural_text} onChange={v=>set("buy_natural_text",v)} />
      <Field label="③ 標題" value={form.buy_care_title} onChange={v=>set("buy_care_title",v)}/><TextArea label="③ 內容" value={form.buy_care_text} onChange={v=>set("buy_care_text",v)} />
      <Field label="購買區標題" value={form.buy_where_title} onChange={v=>set("buy_where_title",v)}/><TextArea label="購買區說明" value={form.buy_where_description} onChange={v=>set("buy_where_description",v)} full/>
      <Field label="第一顆按鈕文字" value={form.buy_primary_label} onChange={v=>set("buy_primary_label",v)}/><Field label="第一顆按鈕連結" value={form.buy_primary_url} onChange={v=>set("buy_primary_url",v)}/>
      <Field label="第二顆按鈕文字" value={form.buy_secondary_label} onChange={v=>set("buy_secondary_label",v)}/><Field label="第二顆按鈕連結" value={form.buy_secondary_url} onChange={v=>set("buy_secondary_url",v)}/>
    </div>
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


function AboutEditor({notify,fail}:{notify:(s:string)=>void;fail:(s:string)=>void}){
  const defaults:Row={
    about_page_eyebrow:"ABOUT NAYO",
    about_page_title:"嗨，我是娜攸。",
    about_page_description:"這裡是我的個人品牌空間。理財讓生活有更多選擇，而生命靈數與水晶，則是我探索生活與自己的另一種方式。",
    about_life_title:"生活理財",
    about_life_description:"分享信用卡回饋、小資理財、旅行與生活提案，把複雜資訊整理成可以真正執行的方法。",
    about_crystal_title:"Nayo Crystal",
    about_crystal_description:"從生命靈數、缺數與水晶出發，製作屬於每個人的客製水晶手環。"
  };
  const [form,setForm]=useState<Row>(defaults);const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);
  useEffect(()=>{(async()=>{if(!supabase){setLoading(false);return;}const {data,error}=await adminSupabase.from("site_settings").select("setting_key,setting_value");if(error)fail(error.message);const next={...defaults};for(const r of data||[]){if(r.setting_key)next[r.setting_key]=r.setting_value??"";}setForm(next);setLoading(false);})()},[fail]);
  const set=(k:string,v:string)=>setForm(x=>({...x,[k]:v}));
  const save=async()=>{if(!supabase)return;setSaving(true);try{for(const [setting_key,value] of Object.entries(form)){const {error}=await adminSupabase.from("site_settings").upsert({setting_key,setting_value:String(value??""),updated_at:new Date().toISOString()},{onConflict:"setting_key"});if(error)throw error;}notify("關於 Nayo 頁面已儲存。");}catch(e:any){fail(e.message||"關於 Nayo 儲存失敗")}finally{setSaving(false)}};
  if(loading)return <section className="empty-card"><p>載入關於 Nayo 設定…</p></section>;
  return <section className="editor">
    <div className="editor-head"><div><p className="eyebrow">ABOUT PAGE CMS</p><h2>關於 Nayo</h2><p>直接修改前台「關於 Nayo」頁面的標題、介紹與兩個內容區塊。</p></div><button className="primary compact" onClick={save} disabled={saving}>{saving?"儲存中…":"儲存關於 Nayo"}</button></div>
    <div className="form-grid">
      <div className="form-section-title">頁面標題</div>
      <Field label="頁面小標" value={form.about_page_eyebrow} onChange={v=>set("about_page_eyebrow",v)}/>
      <Field label="頁面標題" value={form.about_page_title} onChange={v=>set("about_page_title",v)}/>
      <TextArea label="頁面介紹" value={form.about_page_description} onChange={v=>set("about_page_description",v)} full/>
      <div className="form-section-title">內容區塊</div>
      <Field label="第一區塊標題" value={form.about_life_title} onChange={v=>set("about_life_title",v)}/>
      <TextArea label="第一區塊內容" value={form.about_life_description} onChange={v=>set("about_life_description",v)}/>
      <Field label="第二區塊標題" value={form.about_crystal_title} onChange={v=>set("about_crystal_title",v)}/>
      <TextArea label="第二區塊內容" value={form.about_crystal_description} onChange={v=>set("about_crystal_description",v)}/>
    </div>
  </section>;
}

function PromotionsEditor({notify,fail}:{notify:(s:string)=>void;fail:(s:string)=>void}){
  const empty: Row = {
    category:"",
    bank:"",
    badge:"",
    title:"",
    subtitle:"",
    gift_title:"首刷禮",
    gifts:[""],
    tags:[""],
    reward_display_mode:"text",
    reward_value:"",
    reward_label:"價值",
    reward_image:"",
    image:"",
    url:"",
    button_text:"立即申辦",
    eligibility:"",
    conditions:[""],
    deadline:"",
    display_mode:"text",
    detail_content:"",
    detail_image:"",
    sort_order:0,
  };
  const [rows,setRows]=useState<Row[]>([]);const [editing,setEditing]=useState<Row|null>(null);const [loading,setLoading]=useState(true);
  async function load(){if(!supabase)return;setLoading(true);const {data,error}=await adminSupabase.from("promotions").select("*").order("sort_order").order("created_at",{ascending:false});if(error)fail(error.message);setRows((data||[]).map((r:any)=>({...r,gifts:Array.isArray(r.gifts)?r.gifts:(Array.isArray(r.bullets)?r.bullets:[]),tags:Array.isArray(r.tags)?r.tags:(r.badge?[r.badge]:[]),conditions:Array.isArray(r.conditions)?r.conditions:(Array.isArray(r.meta)?r.meta:[])})));setLoading(false)}
  useEffect(()=>{load()},[]);
  const set=(k:string,v:any)=>setEditing(x=>x?({...x,[k]:v}):x);
  const listSet=(k:string,index:number,v:string)=>setEditing(x=>x?({...x,[k]:(x[k]||[]).map((item:string,i:number)=>i===index?v:item)}):x);
  const addItem=(k:string)=>setEditing(x=>x?({...x,[k]:[...(x[k]||[]),""]}):x);
  const removeItem=(k:string,index:number)=>setEditing(x=>x?({...x,[k]:(x[k]||[]).filter((_:any,i:number)=>i!==index)}):x);
  async function save(row:Row){
    if(!supabase)return;
    const clean=(v:any)=>Array.isArray(v)?v.map(x=>String(x||"").trim()).filter(Boolean):[];
    const gifts=clean(row.gifts),tags=clean(row.tags),conditions=clean(row.conditions);
    const payload:any={
      category:String(row.category||""), bank:String(row.bank||""), badge:tags[0]||"", title:String(row.title||""), subtitle:String(row.subtitle||""),
      gift_title:String(row.gift_title||"首刷禮"), gifts, tags, reward_display_mode:String(row.reward_display_mode||"text"), reward_value:String(row.reward_value??""), reward_label:String(row.reward_label||"價值"),
      reward_image:String(row.reward_image||""), image:String(row.image||""), url:String(row.url||""), button_text:String(row.button_text||"立即申辦"), eligibility:String(row.eligibility||""),
      conditions, deadline:String(row.deadline||""), display_mode:String(row.display_mode||"text"), detail_content:String(row.detail_content||""), detail_image:String(row.detail_image||""),
      bullets:gifts, meta:conditions, sort_order:Number(row.sort_order||0)
    };
    const result=row.id?await adminSupabase.from("promotions").update(payload).eq("id",row.id):await adminSupabase.from("promotions").insert(payload);
    if(result.error)return fail(result.error.message);
    notify(row.id?"信用卡優惠已更新。":"信用卡優惠已新增。");setEditing(null);load();
  }
  async function remove(id:string){if(!supabase||!confirm("確定刪除這筆信用卡優惠？"))return;const {error}=await adminSupabase.from("promotions").delete().eq("id",id);if(error)fail(error.message);else{notify("信用卡優惠已刪除。");load()}}
  if(editing){
    const x=editing;
    return <section className="promo-editor">
      <EditorHead title={x.id?"編輯信用卡優惠":"新增信用卡優惠"} onSave={()=>save(x)} onCancel={()=>setEditing(null)}/>
      <div className="promo-editor-grid">
        <div className="promo-form-column">
          <div className="promo-panel"><h3>基本資訊</h3><div className="form-grid">
            <Field label="分類" value={x.category||""} onChange={v=>set("category",v)} />
            <Field label="銀行／機構" value={x.bank||""} onChange={v=>set("bank",v)} />
            <Field label="卡片／帳戶名稱（大標題）" value={x.title||""} onChange={v=>set("title",v)} full />
            <Field label="副標題／特色（顯示於標題下方）" value={x.subtitle||""} onChange={v=>set("subtitle",v)} full />
          </div></div>

          <div className="promo-panel"><h3>優惠重點區塊</h3><p className="promo-help">區塊標題可以自行輸入，例如「首刷禮」、「新戶禮」、「優惠重點」；下方可新增多筆內容。</p><Field label="區塊標題" value={x.gift_title||""} onChange={v=>set("gift_title",v)} full/>{(x.gifts||[]).map((v:string,i:number)=><div className="promo-list-row" key={`gift-${i}`}><span className="promo-index">{i+1}</span><input value={v} onChange={e=>listSet("gifts",i,e.target.value)} placeholder="例如：玉山Wallet電子支付最高20%回饋"/><button className="icon-delete" onClick={()=>removeItem("gifts",i)}>×</button></div>)}<button className="secondary" onClick={()=>addItem("gifts")}>＋ 新增優惠重點</button></div>

          <div className="promo-panel"><h3>左上標籤</h3><p className="promo-help">例如：玉山銀行、新戶高回饋；可新增多個。</p>{(x.tags||[]).map((v:string,i:number)=><div className="promo-list-row" key={`tag-${i}`}><input value={v} onChange={e=>listSet("tags",i,e.target.value)} placeholder="例如：新戶高回饋"/><button className="icon-delete" onClick={()=>removeItem("tags",i)}>×</button></div>)}<button className="secondary" onClick={()=>addItem("tags")}>＋ 新增標籤</button></div>

          <div className="promo-panel"><h3>右上角顯示／價值</h3><p className="promo-help">只需要選擇「文字」或「圖片」。選文字就輸入要顯示的內容；選圖片就直接上傳右上角圖片。</p><div className="reward-types reward-types-two"><button type="button" className={x.reward_display_mode==="text"?"reward-type active":"reward-type"} onClick={()=>set("reward_display_mode","text")}>文字</button><button type="button" className={x.reward_display_mode==="image"?"reward-type active":"reward-type"} onClick={()=>set("reward_display_mode","image")}>圖片</button></div>{x.reward_display_mode==="text"?<><div className="form-grid"><Field label="顯示文字" value={x.reward_value||""} onChange={v=>set("reward_value",v)}/><Field label="顯示標籤" value={x.reward_label||"價值"} onChange={v=>set("reward_label",v)}/></div><p className="promo-help">例如輸入「$1,000」與「價值」，前台就會直接顯示這兩段文字。</p></>:<ImageField label="上傳右上角顯示圖片" value={x.reward_image||""} onChange={async f=>{try{const u=await uploadImage(f,"promotions-reward");set("reward_image",u);notify("右上角圖片已上傳，儲存後生效。")}catch(e:any){fail(e.message)}}} setUrl={v=>set("reward_image",v)}/>}</div>

          <div className="promo-panel"><h3>卡片主圖</h3><ImageField label="上傳信用卡／優惠圖片" value={x.image||""} onChange={async f=>{try{const u=await uploadImage(f,"promotions");set("image",u);notify("圖片已上傳，儲存後生效。")}catch(e:any){fail(e.message)}}} setUrl={v=>set("image",v)}/></div>

          <div className="promo-panel"><h3>申辦連結</h3><div className="form-grid"><Field label="推薦連結 URL" value={x.url||""} onChange={v=>set("url",v)} full/><Field label="按鈕顯示文字" value={x.button_text||"立即申辦"} onChange={v=>set("button_text",v)}/><Field label="適用對象／條件" value={x.eligibility||""} onChange={v=>set("eligibility",v)}/><Field label="截止期限" value={x.deadline||""} onChange={v=>set("deadline",v)}/><Field label="排序" value={x.sort_order??0} type="number" onChange={v=>set("sort_order",v===""?0:Number(v))}/></div></div>

          <div className="promo-panel"><h3>條件限制</h3><p className="promo-help">需要在卡片下方補充的條件，一行一項。</p>{(x.conditions||[]).map((v:string,i:number)=><div className="promo-list-row" key={`cond-${i}`}><span className="promo-bullet">•</span><input value={v} onChange={e=>listSet("conditions",i,e.target.value)} placeholder="例如：限新戶、需登錄活動"/><button className="icon-delete" onClick={()=>removeItem("conditions",i)}>×</button></div>)}<button className="secondary" onClick={()=>addItem("conditions")}>＋ 新增條件</button></div>

          <div className="promo-panel"><h3>內容顯示模式</h3><div className="display-mode-tabs"><button className={x.display_mode==="text"?"mode-btn active":"mode-btn"} onClick={()=>set("display_mode","text")}>▤ 優惠詳情（文字）</button><button className={x.display_mode==="image"?"mode-btn active":"mode-btn"} onClick={()=>set("display_mode","image")}>▧ 圖片展示（行程／DM）</button></div>{x.display_mode==="text"?<TextArea label="詳細內容（可選）" value={x.detail_content||""} onChange={v=>set("detail_content",v)} full/>:<ImageField label="上傳完整內容圖片（行程表／DM）" value={x.detail_image||""} onChange={async f=>{try{const u=await uploadImage(f,"promotions-detail");set("detail_image",u);notify("完整內容圖片已上傳，儲存後生效。")}catch(e:any){fail(e.message)}}} setUrl={v=>set("detail_image",v)}/>}</div>
        </div>

        <div className="promo-preview-column"><div className="promo-preview-sticky"><h3>後台預覽</h3><PromoBackendPreview row={x}/><div className="promo-preview-note">這只是後台編輯預覽，不會修改前台版型。</div></div></div>
      </div>
    </section>
  }
  return <CrudList title="信用卡優惠" loading={loading} rows={rows} onAdd={()=>setEditing({...empty,gift_title:"首刷禮",gifts:[""],tags:[""],conditions:[""]})} onEdit={setEditing} onDelete={remove} columns={["category","bank","title","deadline"]}/>;
}

function PromoBackendPreview({row}:{row:Row}){
  const tags=(row.tags||[]).filter(Boolean);const gifts=(row.gifts||[]).filter(Boolean);const conditions=(row.conditions||[]).filter(Boolean);
  const reward=String(row.reward_value||"");
  const rewardBox=row.reward_display_mode==="image"&&row.reward_image?<div className="promo-preview-reward promo-preview-reward-image"><img src={row.reward_image} alt="右上角顯示"/></div>:reward?<div className="promo-preview-reward"><strong>{reward}</strong><small>{row.reward_label||"價值"}</small></div>:null;
  return <div className="promo-preview-card"><div className="promo-preview-top"><div><div className="promo-preview-tags">{tags.map((t:string)=><span key={t}>{t}</span>)}</div><div className="promo-preview-title">{row.title||"卡片名稱"}</div><div className="promo-preview-sub">{row.subtitle||"副標題／特色"}</div></div>{rewardBox}</div>{gifts.length>0&&<div className="promo-preview-gifts"><b>🎁 {row.gift_title||"首刷禮"}</b>{gifts.map((g:string)=><div key={g}>• {g}</div>)}</div>}{row.image&&<div className="promo-preview-image"><img src={row.image} alt="優惠圖片"/></div>}<div className="promo-preview-meta"><span>{row.eligibility||"適用對象／條件"}</span><span>{row.deadline?`期限：${row.deadline}`:"期限：—"}</span></div><button className="promo-preview-button">{row.button_text||"立即申辦"} ↗</button>{conditions.length>0&&<div className="promo-preview-conditions">{conditions.map((c:string)=><div key={c}>◷ {c}</div>)}</div>}</div>
}

function PostsEditor({notify,fail}:{notify:(s:string)=>void;fail:(s:string)=>void}){
  const [rows,setRows]=useState<Row[]>([]); const [editing,setEditing]=useState<Row|null>(null); const [cats,setCats]=useState<Row[]>([]); const [loading,setLoading]=useState(true);
  async function load(){if(!supabase)return;setLoading(true);const [{data:p,error:pe},{data:c,error:ce}]=await Promise.all([adminSupabase.from("posts").select("*, categories(name)").order("created_at",{ascending:false}),adminSupabase.from("categories").select("id,name").order("sort_order")]);if(pe)fail(pe.message);if(ce)fail(ce.message);setRows(p||[]);setCats(c||[]);setLoading(false)}
  useEffect(()=>{load()},[]);
  async function save(row:Row){if(!supabase)return;const payload: Row={...row,category_id:row.category_id||null,published_at:row.status==="published"?(row.published_at||new Date().toISOString()):null};delete payload["categories"];const {error}=row.id?await adminSupabase.from("posts").update(payload).eq("id",row.id):await adminSupabase.from("posts").insert(payload);if(error)fail(error.message);else{notify(row.id?"文章已更新。":"文章已新增。");setEditing(null);load()}}
  async function remove(id:string){if(!supabase||!confirm("確定刪除這篇文章？"))return;const {error}=await adminSupabase.from("posts").delete().eq("id",id);if(error)fail(error.message);else{notify("文章已刪除。");load()}}
  if(editing)return <PostForm row={editing} cats={cats} onSave={save} onCancel={()=>setEditing(null)} onUpload={async f=>uploadImage(f,"posts")}/>;
  return <CrudList title="Blog 文章" loading={loading} rows={rows} onAdd={()=>setEditing({title:"",slug:"",excerpt:"",content:"",cover_image:"",status:"draft",category_id:"",seo_title:"",seo_description:""})} onEdit={setEditing} onDelete={remove} columns={["title","status","created_at"]}/>
}
function PostForm({row,cats,onSave,onCancel,onUpload}:{row:Row;cats:Row[];onSave:(r:Row)=>void;onCancel:()=>void;onUpload:(f:File)=>Promise<string>}){
  const [x,setX]=useState(row);
  const set=(k:string,v:any)=>setX({...x,[k]:v});
  function autoSlug(title:string){
    return String(title||"").trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-+|-+$/g,"").slice(0,120);
  }
  function plainText(html:string){
    if(typeof document!=="undefined"){const el=document.createElement("div");el.innerHTML=html||"";return (el.textContent||"").replace(/\s+/g," ").trim();}
    return String(html||"").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim();
  }
  function autoDescription(title:string,excerpt:string,content:string){
    const text=plainText(content);
    const base=String(excerpt||"").trim() || text;
    return `${title||""}${base?"｜":""}${base}`.replace(/\s+/g," ").slice(0,155);
  }
  function autoKeywords(title:string,content:string,category:string){
    const text=plainText(content);
    const source=`${title} ${category} ${text}`;
    const candidates=new Set<string>();
    const cjk=source.match(/[\p{Script=Han}]{2,12}/gu)||[];
    cjk.forEach(v=>{if(v.length>=2)candidates.add(v)});
    const latin=source.match(/[A-Za-z][A-Za-z0-9+.#-]{1,30}/g)||[];
    latin.forEach(v=>candidates.add(v));
    [title,category,"信用卡","回饋","理財","優惠","推薦","申辦條件","完整整理","2026"].forEach(v=>{if(String(v||"").trim())candidates.add(String(v).trim())});
    return Array.from(candidates).slice(0,15).join(", ");
  }
  function save(){
    const next={...x};
    const title=String(next.title||"").trim();
    const content=String(next.content||"");
    if(!String(next.slug||"").trim()) next.slug=autoSlug(title) || `post-${Date.now()}`;
    if(!String(next.seo_title||"").trim()) next.seo_title=title.slice(0,70);
    if(!String(next.seo_description||"").trim()) next.seo_description=autoDescription(title,String(next.excerpt||""),content);
    if(!String(next.seo_keywords||"").trim()) next.seo_keywords=autoKeywords(title,content,String(cats.find(c=>c.id===next.category_id)?.name||""));
    onSave(next);
  }
  const seoTitle=String(x.seo_title||x.title||"").trim();
  const seoDescription=String(x.seo_description||x.excerpt||"").trim();
  const headingCount=(String(x.content||"").match(/<h[2-4]\b/gi)||[]).length;
  const seoChecks=[
    ["文章標題",!!String(x.title||"").trim()],
    ["SEO 標題",seoTitle.length>=20&&seoTitle.length<=70],
    ["SEO 描述",seoDescription.length>=50&&seoDescription.length<=160],
    ["SEO 關鍵字",!!String(x.seo_keywords||"").trim()],
    ["文章網址 Slug",!!String(x.slug||"").trim()],
    ["文章摘要",!!String(x.excerpt||"").trim()],
    ["H2～H4 文章結構",headingCount>=2],
    ["封面圖片",!!String(x.cover_image||"").trim()],
  ];
  const seoScore=Math.round(seoChecks.filter(v=>v[1]).length/seoChecks.length*100);
  return <section className="editor">
    <EditorHead title={x.id?"編輯文章":"新增文章"} onSave={save} onCancel={onCancel}/>
    <div className="seo-panel full">
      <div><span className="eyebrow">SEO CHECK</span><strong className="seo-score">{seoScore}/100</strong><p>發布時會自動補齊空白的 SEO 標題、描述、關鍵字與 Slug；文章內的 H2～H4 會自動生成可點擊的文章目錄，並輸出 Article Schema 與 Sitemap。</p></div>
      <div className="seo-checks">{seoChecks.map(([label,ok])=><span key={String(label)} className={ok?"seo-ok":"seo-warn"}>{ok?"✓":"○"} {label}</span>)}</div>
    </div>
    <div className="form-grid">
      <Field label="標題（文章主標題）" value={x.title} onChange={v=>set("title",v)} full/>
      <Field label="Slug（網址名稱）" value={x.slug} onChange={v=>set("slug",v)}/>
      <select className="field" value={x.category_id||""} onChange={e=>set("category_id",e.target.value)}><option value="">未分類</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <select className="field" value={x.status} onChange={e=>set("status",e.target.value)}><option value="draft">草稿</option><option value="published">發布</option></select>
      <Field label="SEO 標題（搜尋結果／瀏覽器標題）" value={x.seo_title||""} onChange={v=>set("seo_title",v)} full/>
      <div className="field-help full">不知道怎麼寫可以留白，儲存時會自動使用「文章標題」。如果要做 SEO，可以在這裡加入主要搜尋詞，例如「2026 台新 Richart 卡回饋｜最高 10% 回饋與申辦條件」。</div>
      <Field label="SEO 描述（搜尋結果摘要）" value={x.seo_description||""} onChange={v=>set("seo_description",v)} full/>
      <Field label="SEO 關鍵字／標籤（用逗號分隔）" value={x.seo_keywords||""} onChange={v=>set("seo_keywords",v)} full/>
      <div className="field-help full">例如：台新 Richart 卡, Richart 卡回饋, 信用卡推薦, 信用卡 10% 回饋。這是網站的關鍵字資料欄位，不需要在文章內文重複貼上。</div>
      <TextArea label="摘要（文章列表顯示）" value={x.excerpt||""} onChange={v=>set("excerpt",v)} full/>
      <div className="rich-editor-wrap full">
        <div className="rich-editor-label">文章內容</div>
        <div className="rich-editor-help">直接像一般文章編輯器一樣輸入，不需要自己寫 HTML。可使用粗體、標題、條列、連結、引用等格式。</div>
        <RichTextEditor value={x.content||""} onChange={v=>set("content",v)}/>
      </div>
      <ImageField label="封面圖片（會顯示在文章最上方）" value={x.cover_image||""} onChange={async f=>{const u=await onUpload(f);set("cover_image",u);}} setUrl={v=>set("cover_image",v)}/>
    </div>
  </section>
}

export function RichTextEditor({value,onChange,folder="posts"}:{value:string;onChange:(v:string)=>void;folder?:string}){
  const editorRef=useRef<HTMLDivElement>(null);
  const fileRef=useRef<HTMLInputElement>(null);
  const savedRangeRef=useRef<Range|null>(null);
  const [sourceMode,setSourceMode]=useState(false);
  const [source,setSource]=useState(value||"");
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    if(!editorRef.current) return;
    if(!sourceMode && editorRef.current.innerHTML !== (value||"")) editorRef.current.innerHTML=value||"";
    if(!sourceMode) setSource(value||"");
  },[value,sourceMode]);

  useEffect(()=>{
    if(editorRef.current && !sourceMode && !editorRef.current.innerHTML) editorRef.current.innerHTML=value||"";
  },[]);

  function saveSelection(){
    const sel=window.getSelection();
    if(sel && sel.rangeCount) savedRangeRef.current=sel.getRangeAt(0).cloneRange();
  }
  function restoreSelection(){
    const range=savedRangeRef.current;
    if(!range) return;
    const sel=window.getSelection();
    if(sel){sel.removeAllRanges();sel.addRange(range);}
  }
  function emit(){
    const html=editorRef.current?.innerHTML||"";
    setSource(html);
    onChange(html);
  }
  function command(cmd:string,value?:string){
    if(sourceMode) return;
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(cmd,false,value);
    saveSelection();
    emit();
  }
  function block(tag:string){
    command("formatBlock",tag);
  }
  function applyClass(cls:string,tag:"p"|"blockquote"="p"){
    if(sourceMode) return;
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand("formatBlock",false,tag);
    const sel=window.getSelection();
    let node:any=sel?.anchorNode;
    while(node && node!==editorRef.current && node.nodeType===3) node=node.parentElement;
    if(node && node.nodeType===1 && !editorRef.current?.contains(node)) node=null;
    if(node && node.tagName?.toLowerCase()!==tag) node=node.closest?.(tag);
    if(node){
      node.classList.remove("quote-elegant","quote-highlight","quote-note","article-lead","article-info");
      if(cls) node.classList.add(cls);
    }
    saveSelection();
    emit();
  }
  function addLink(){
    saveSelection();
    const url=window.prompt("請輸入連結網址", "https://");
    if(!url || url==="https://") return;
    command("createLink",url);
  }
  function insertTable(){
    const html='<table><tbody><tr><td>欄位 1</td><td>欄位 2</td><td>欄位 3</td></tr><tr><td>內容</td><td>內容</td><td>內容</td></tr><tr><td>內容</td><td>內容</td><td>內容</td></tr></tbody></table><p></p>';
    command("insertHTML",html);
  }
  async function handleImage(file:File){
    try{
      setBusy(true);
      const url=await uploadImage(file,folder);
      command("insertImage",url);
    }catch(e:any){
      window.alert(e?.message||"圖片上傳失敗，請稍後再試。");
    }finally{setBusy(false);}
  }
  function toggleSource(){
    if(sourceMode){
      if(editorRef.current) editorRef.current.innerHTML=source;
      setSourceMode(false);
      onChange(source);
      requestAnimationFrame(()=>editorRef.current?.focus());
    }else{
      const html=editorRef.current?.innerHTML||"";
      setSource(html);
      setSourceMode(true);
    }
  }
  const btn=(label:string,fn:()=>void,title?:string)=><button type="button" className="rt-btn" title={title||label} onMouseDown={e=>e.preventDefault()} onClick={fn}>{label}</button>;
  const select=(value:string,onChangeFn:(v:string)=>void,children:ReactNode,title:string)=><select className="rt-select" title={title} value={value} onFocus={saveSelection} onChange={e=>onChangeFn(e.target.value)}>{children}</select>;

  return <div className="rich-editor-wrap full">
    <div className="rt-toolbar">
      {btn("↶",()=>command("undo"),"復原")}
      {btn("↷",()=>command("redo"),"重做")}
      <span className="rt-divider"/>
      {select("p",v=>block(v),<><option value="p">段落</option><option value="h1">H1 標題</option><option value="h2">H2 標題</option><option value="h3">H3 標題</option><option value="h4">H4 標題</option></>,"段落／標題")}
      {select("default",v=>command("fontName",v==="default"?"Arial":v),<><option value="default">預設字型</option><option value="Noto Sans TC">Noto Sans TC</option><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="Verdana">Verdana</option><option value="Times New Roman">Times New Roman</option></>,"字型")}
      {select("3",v=>command("fontSize",v),<><option value="1">9 px</option><option value="2">11 px</option><option value="3">14 px</option><option value="4">16 px</option><option value="5">20 px</option><option value="6">28 px</option><option value="7">36 px</option></>,"字級")}
      <label className="rt-color" title="文字顏色"><span>A</span><input type="color" defaultValue="#3b332f" onMouseDown={saveSelection} onChange={e=>command("foreColor",e.target.value)}/></label>
      <label className="rt-color" title="背景顏色"><span>▰</span><input type="color" defaultValue="#fff1a8" onMouseDown={saveSelection} onChange={e=>command("hiliteColor",e.target.value)}/></label>
      <span className="rt-divider"/>
      {btn("B",()=>command("bold"),"粗體")}
      {btn("I",()=>command("italic"),"斜體")}
      {btn("U",()=>command("underline"),"底線")}
      {btn("S",()=>command("strikeThrough"),"刪除線")}
      {btn("清除",()=>command("removeFormat"),"清除格式")}
      <span className="rt-divider"/>
      {btn("左",()=>command("justifyLeft"),"靠左")}
      {btn("中",()=>command("justifyCenter"),"置中")}
      {btn("右",()=>command("justifyRight"),"靠右")}
      {btn("• 清單",()=>command("insertUnorderedList"),"項目清單")}
      {btn("1. 清單",()=>command("insertOrderedList"),"編號清單")}
      {btn("↔",()=>command("indent"),"增加縮排")}
      {btn("↢",()=>command("outdent"),"減少縮排")}
      <span className="rt-divider"/>
      {btn("連結",addLink,"插入連結")}
      {btn("表格",insertTable,"插入 3×3 表格")}
      <button type="button" className="rt-btn" disabled={busy} onMouseDown={e=>e.preventDefault()} onClick={()=>{saveSelection();fileRef.current?.click()}}>{busy?"上傳中…":"圖片"}</button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={e=>{const f=e.target.files?.[0];e.currentTarget.value="";if(f)handleImage(f)}}/>
      <span className="rt-divider"/>
      {select("",v=>{if(v==="elegant")applyClass("quote-elegant","blockquote");if(v==="highlight")applyClass("quote-highlight","blockquote");if(v==="note")applyClass("quote-note","blockquote");if(v==="lead")applyClass("article-lead","p");if(v==="info")applyClass("article-info","p");},<><option value="">引用／段落樣式</option><option value="elegant">引言｜典雅</option><option value="highlight">引言｜重點</option><option value="note">引言｜提醒</option><option value="lead">重點段落</option><option value="info">資訊提示框</option></>,"引用與特殊段落")}
      <button type="button" className={`rt-btn source-btn${sourceMode?" active":""}`} onClick={toggleSource}>{sourceMode?"返回編輯":"HTML 原始碼"}</button>
    </div>
    {sourceMode ? <textarea className="rt-source" value={source} onChange={e=>{setSource(e.target.value);onChange(e.target.value)}} spellCheck={false}/> : <div ref={editorRef} className="rt-content" contentEditable suppressContentEditableWarning onInput={emit} onKeyUp={saveSelection} onMouseUp={saveSelection} onFocus={saveSelection} data-placeholder="開始撰寫文章…"/>}
    <div className="ckeditor-note">像 WordPress 一樣直接編輯；文章標題本身是 H1，正文可使用 H2～H4。支援字型、字級、顏色、表格、圖片上傳、連結、條列與「引言｜典雅／重點／提醒」、「重點段落」、「資訊提示框」。</div>
  </div>
}

function CategoriesEditor({notify,fail}:{notify:(s:string)=>void;fail:(s:string)=>void}){return <SimpleCrud table="categories" title="文章分類" fields={[{k:"name",l:"分類名稱"},{k:"slug",l:"Slug"},{k:"description",l:"說明",area:true},{k:"sort_order",l:"排序",number:true}]} notify={notify} fail={fail}/>} 
function ProductsEditor({notify,fail}:{notify:(s:string)=>void;fail:(s:string)=>void}){return <SimpleCrud table="products" title="手環作品" fields={[{k:"name",l:"作品名稱"},{k:"slug",l:"Slug"},{k:"missing_numbers",l:"缺數"},{k:"description",l:"作品介紹",area:true},{k:"price",l:"價格"},{k:"image_url",l:"圖片網址"},{k:"purchase_url",l:"購買連結"},{k:"instagram_url",l:"Instagram 連結"},{k:"sort_order",l:"排序",number:true}]} imageFolder="products" notify={notify} fail={fail}/>} 

function SimpleCrud({table,title,fields,notify,fail,imageFolder}:{table:string;title:string;fields:{k:string;l:string;area?:boolean;number?:boolean}[];notify:(s:string)=>void;fail:(s:string)=>void;imageFolder?:string}){
  const [rows,setRows]=useState<Row[]>([]);const [editing,setEditing]=useState<Row|null>(null);const [loading,setLoading]=useState(true);
  async function load(){if(!supabase)return;setLoading(true);const {data,error}=await adminSupabase.from(table).select("*").order("sort_order",{ascending:true}).order("created_at",{ascending:false});if(error)fail(error.message);setRows(data||[]);setLoading(false)}useEffect(()=>{load()},[table]);
  async function save(row:Row){if(!supabase)return;const payload={...row};if(table==="categories"){payload.type=payload.type||"blog";if(payload.is_active==null)payload.is_active=true;}if(table==="products" && payload.missing_numbers==null)payload.missing_numbers="";if(payload.id){const {error}=await adminSupabase.from(table).update(payload).eq("id",payload.id);if(error)return fail(error.message)}else{delete payload.id;const {error}=await adminSupabase.from(table).insert(payload);if(error)return fail(error.message)}notify(`${title}已儲存。`);setEditing(null);load()}
  async function remove(id:string){if(!supabase||!confirm(`確定刪除這筆${title}？`))return;const {error}=await adminSupabase.from(table).delete().eq("id",id);if(error)fail(error.message);else{notify(`${title}已刪除。`);load()}}
  if(editing){return <section className="editor"><EditorHead title={editing.id?`編輯${title}`:`新增${title}`} onSave={()=>save(editing)} onCancel={()=>setEditing(null)}/><div className="form-grid">{fields.map(f=>f.area?<TextArea key={f.k} label={f.l} value={editing[f.k]??""} onChange={v=>setEditing({...editing,[f.k]:v})} full/>:<Field key={f.k} label={f.l} value={editing[f.k]??""} type={f.number?"number":"text"} onChange={v=>setEditing({...editing,[f.k]:f.number?(v===""?null:Number(v)):v})} full={f.k==="description"}/>)}</div>{imageFolder&&<ImageField label="直接上傳圖片" value={editing.image_url||""} onChange={async f=>{try{const u=await uploadImage(f,imageFolder);setEditing({...editing,image_url:u});notify("圖片已上傳，儲存後生效。")}catch(e:any){fail(e.message)}}} setUrl={v=>setEditing({...editing,image_url:v})}/>}</section>}
  return <CrudList title={title} loading={loading} rows={rows} onAdd={()=>setEditing(Object.fromEntries(fields.map(f=>[f.k,f.number?0:""])))} onEdit={setEditing} onDelete={remove} columns={fields.slice(0,4).map(f=>f.k)}/>
}

function CrudList({title,rows,loading,onAdd,onEdit,onDelete,columns}:{title:string;rows:Row[];loading:boolean;onAdd:()=>void;onEdit:(r:Row)=>void;onDelete:(id:string)=>void;columns:string[]}){return <section className="editor"><div className="editor-head"><div><p className="eyebrow">NAYO CMS</p><h2>{title}</h2><p>共 {rows.length} 筆</p></div><button className="primary compact" onClick={onAdd}>＋ 新增</button></div>{loading?<div className="loading-box">載入中…</div>:rows.length===0?<div className="empty-row">目前沒有資料，按右上角「新增」開始建立。</div>:<div className="table-wrap"><table><thead><tr>{columns.map(c=><th key={c}>{labelFor(c)}</th>)}<th>操作</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}>{columns.map(c=><td key={c}>{formatCell(c,r[c])}</td>)}<td><button className="table-btn" onClick={()=>onEdit(r)}>編輯</button><button className="table-btn danger" onClick={()=>onDelete(r.id)}>刪除</button></td></tr>)}</tbody></table></div>}</section>}
function labelFor(k:string){return ({title:"標題",name:"名稱",status:"狀態",created_at:"建立時間",slug:"Slug",life_numbers:"生命靈數",color:"代表色",missing_numbers:"缺數",category:"分類",bank:"銀行／機構",deadline:"截止期限"} as Row)[k]||k}
function formatCell(k:string,v:any){if(v==null)return "—";if(k==="created_at")return new Date(v).toLocaleDateString("zh-TW");if(typeof v==="object")return v.name||"—";return String(v).slice(0,80)}
function EditorHead({title,onSave,onCancel}:{title:string;onSave:()=>void;onCancel:()=>void}){return <div className="editor-head"><div><p className="eyebrow">NAYO CMS</p><h2>{title}</h2></div><div className="head-actions"><button className="soft-btn" onClick={onCancel}>取消</button><button className="primary compact" onClick={onSave}>儲存</button></div></div>}
function Field({label,value,onChange,type="text",full=false}:{label:string;value:any;onChange:(v:string)=>void;type?:string;full?:boolean}){return <label className={full?"field-label full":"field-label"}>{label}<input type={type} value={value??""} onChange={e=>onChange(e.target.value)}/></label>}
function TextArea({label,value,onChange,full=false}:{label:string;value:any;onChange:(v:string)=>void;full?:boolean}){return <label className={full?"field-label full":"field-label"}>{label}<textarea value={value??""} onChange={e=>onChange(e.target.value)} rows={5}/></label>}
function ImageField({label,value,onChange,setUrl}:{label:string;value:string;onChange:(f:File)=>void;setUrl:(v:string)=>void}){return <div className="image-field"><div className="image-label">{label}</div>{value&&<img src={value} alt="預覽"/>}<input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f)onChange(f)}}/><input value={value||""} onChange={e=>setUrl(e.target.value)} placeholder="或貼上圖片網址"/></div>}
function Shell({children}:{children:ReactNode}){return <><style>{CSS}{PROMO_CSS}</style>{children}</>}


const PROMO_CSS=`
.promo-editor{margin-top:18px}.promo-editor-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(340px,.8fr);gap:18px}.promo-form-column{display:grid;gap:16px}.promo-panel{border:1px solid var(--line);background:#fffdfb;border-radius:18px;padding:20px}.promo-panel h3{font-family:Georgia,"Noto Serif TC",serif;font-size:20px;margin:0 0 13px}.promo-help{font-size:12px;color:var(--muted);margin:-4px 0 12px;line-height:1.7}.promo-list-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center;margin-bottom:9px}.promo-list-row input{width:100%;border:1px solid var(--line);background:#fff;border-radius:10px;padding:11px 12px;outline:none}.promo-list-row input:focus{border-color:var(--rose);box-shadow:0 0 0 3px #b9968a1a}.promo-index,.promo-bullet{width:30px;height:30px;border-radius:9px;background:#f1e7e2;display:grid;place-items:center;color:#7c655c;font-size:12px}.icon-delete{width:34px;height:34px;border:1px solid var(--line);background:#fff;border-radius:9px;color:#9d6e63;font-size:20px;cursor:pointer}.secondary{border:1px solid var(--line);background:#fff;border-radius:10px;padding:9px 12px;color:#80675d;cursor:pointer;font-size:12px}.reward-types{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}.reward-type{border:1px solid var(--line);background:#fff;border-radius:10px;padding:10px 6px;color:#80675d;cursor:pointer;font-size:12px}.reward-type.active{border-color:var(--rose);background:#f5e9e4;color:#634c43;font-weight:800}.display-mode-tabs{display:grid;grid-template-columns:1fr 1fr;background:#f2efed;border-radius:10px;padding:4px;margin-bottom:14px}.mode-btn{border:0;background:transparent;border-radius:8px;padding:10px;color:#8a7a73;cursor:pointer}.mode-btn.active{background:#fff;color:#89685d;box-shadow:0 1px 4px #00000010}.promo-preview-column{min-width:0}.promo-preview-sticky{position:sticky;top:18px}.promo-preview-sticky h3{font-family:Georgia,"Noto Serif TC",serif;font-size:20px;margin:0 0 12px}.promo-preview-card{background:#fff;border:1px solid var(--line);border-radius:22px;padding:20px;box-shadow:0 12px 30px #5d46330f}.promo-preview-top{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:start}.promo-preview-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}.promo-preview-tags span{background:#f0e8e3;color:#765d54;border-radius:7px;padding:5px 8px;font-size:11px}.promo-preview-title{font-size:23px;font-weight:800}.promo-preview-sub{font-size:13px;color:var(--muted);line-height:1.6;margin-top:4px}.promo-preview-reward{min-width:110px;padding:13px 10px;background:#f7f2ee;border-radius:14px;text-align:center;box-shadow:0 4px 12px #00000010}.promo-preview-reward strong{display:block;font-size:22px;color:#b18678}.promo-preview-reward small{display:inline-block;margin-top:5px;padding:3px 9px;background:#3b332f;color:#fff;border-radius:999px;font-size:10px}.promo-preview-gifts{margin-top:16px;border:1px solid #eee2dc;background:#fffaf7;border-radius:14px;padding:13px;font-size:13px;line-height:1.8}.promo-preview-gifts b{display:block;color:#8d6a5e;margin-bottom:3px}.promo-preview-image{margin-top:14px;border-radius:12px;overflow:hidden;background:#f7f2ee;aspect-ratio:1.5}.promo-preview-image img{width:100%;height:100%;object-fit:contain;display:block}.promo-preview-meta{display:flex;justify-content:space-between;gap:8px;color:#8c8078;font-size:11px;margin:13px 0}.promo-preview-button{width:100%;border:0;border-radius:11px;background:#b9968a;color:#fff;padding:13px;font-weight:800;font-size:15px}.promo-preview-conditions{margin-top:12px;border-top:1px solid var(--line);padding-top:10px;color:#8c8078;font-size:11px;line-height:1.7}.promo-preview-note{font-size:11px;color:#a08d84;line-height:1.6;margin-top:10px}.promo-editor .image-field{grid-column:1/-1}
@media(max-width:980px){.promo-editor-grid{grid-template-columns:1fr}.promo-preview-sticky{position:static}}
@media(max-width:620px){.reward-types{grid-template-columns:repeat(2,1fr)}.promo-preview-top{grid-template-columns:1fr}.promo-preview-reward{justify-self:start}.promo-panel{padding:16px}}
`;

const CSS=`
:root{--bg:#f8f4f0;--card:#fffdfb;--ink:#2e2926;--muted:#8c8078;--rose:#b9968a;--rose2:#eadbd5;--line:#e8ddd7}*{box-sizing:border-box}html,body{margin:0;padding:0;background:var(--bg);color:var(--ink)}body{font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC",sans-serif}button,input,textarea,select{font:inherit}.loading{min-height:100dvh;display:grid;place-items:center;color:var(--muted)}.login-wrap{min-height:100dvh;display:grid;place-items:center;padding:24px}.login-card{width:min(100%,480px);background:var(--card);border:1px solid var(--line);border-radius:28px;padding:42px;box-shadow:0 20px 70px #5d46331a}.brand-mark{width:54px;height:54px;border:1px solid var(--rose2);border-radius:50%;display:grid;place-items:center;font:27px Georgia,serif;color:var(--rose);background:#fff}.brand-mark.small{width:40px;height:40px;font-size:21px}.eyebrow{font-size:12px;letter-spacing:.18em;color:#b67e70;font-weight:800;margin:0 0 9px}.login-card h1,.topbar h1,.welcome h2,.next-card h2,.empty-card h2,.editor h2{font-family:Georgia,"Noto Serif TC",serif}.login-card h1{font-size:40px;margin:0 0 10px}.lead{color:var(--muted);line-height:1.8;margin-bottom:28px}.login-form{display:grid;gap:18px}.login-form label,.field-label{display:grid;gap:8px;font-size:13px;font-weight:700}.login-form input,.field-label input,.field-label textarea,.field{width:100%;border:1px solid var(--line);background:#fff;border-radius:12px;padding:13px 14px;outline:none}.settings-number-card{border:1px solid var(--line);background:#fffaf7;border-radius:14px;padding:14px;display:grid;gap:12px}.settings-number-card>strong{font-size:14px;color:#72584d}.form-section-title{grid-column:1/-1;font-family:Georgia,"Noto Serif TC",serif;font-size:20px;font-weight:700;margin-top:18px;padding-top:18px;border-top:1px solid var(--line)}.field-label textarea{resize:vertical;line-height:1.7}.login-form input:focus,.field-label input:focus,.field-label textarea:focus,.field:focus{border-color:var(--rose);box-shadow:0 0 0 3px #b9968a1a}.primary{border:0;border-radius:12px;padding:14px 18px;background:#3b332f;color:#fff;cursor:pointer;font-weight:700}.primary:disabled{opacity:.6}.compact{padding:11px 16px}.soft-btn{border:1px solid var(--line);background:#fff;border-radius:11px;padding:10px 15px;cursor:pointer}.head-actions{display:flex;gap:9px}.error-box{padding:12px 14px;background:#fff0ee;border:1px solid #efd0ca;color:#a34d42;border-radius:10px;font-size:13px;line-height:1.65;white-space:pre-line}.success-box{padding:12px 14px;background:#eef8f1;border:1px solid #cfe6d6;color:#477254;border-radius:10px;font-size:13px;line-height:1.65;white-space:pre-line}back-link{display:block;margin-top:22px;color:var(--muted);font-size:13px;text-decoration:none}.admin-layout{min-height:100dvh;display:flex}.sidebar{width:260px;background:#302b28;color:#fff;padding:24px 18px;display:flex;flex-direction:column}.side-brand{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none;padding:5px 8px 28px}.side-brand span:last-child{display:grid}.side-brand b{font-size:16px}.side-brand small{font-size:11px;color:#c8b9b1}.side-label{font-size:10px;letter-spacing:.18em;color:#a99991;padding:0 12px 10px}.sidebar nav{display:grid;gap:4px}.nav-item{border:0;background:transparent;color:#d7ccc6;text-align:left;padding:12px;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:11px;font-size:14px}.nav-item:hover,.nav-item.active{background:#4a403b;color:#fff}.nav-item.active{box-shadow:inset 3px 0 var(--rose)}.side-bottom{margin-top:auto;border-top:1px solid #ffffff16;padding:18px 8px 4px}.admin-user{display:flex;align-items:center;gap:9px}.avatar{width:34px;height:34px;border-radius:50%;background:#efe1da;color:#72584d;display:grid;place-items:center;font-weight:800}.admin-user b,.admin-user small{display:block}.admin-user b{font-size:12px}.admin-user small{font-size:10px;color:#a99b94;max-width:160px;overflow:hidden;text-overflow:ellipsis}.logout{width:100%;margin-top:14px;border:1px solid #ffffff20;background:transparent;color:#cfc3bd;border-radius:9px;padding:9px;cursor:pointer;font-size:12px}.admin-main{flex:1;min-width:0;padding:34px clamp(20px,4vw,56px);max-width:1500px}.topbar{display:flex;justify-content:space-between;align-items:end;margin-bottom:26px}.topbar h1{font-size:34px;margin:0}.view-site{color:#7f665c;text-decoration:none;font-size:13px;border:1px solid var(--line);padding:9px 13px;border-radius:10px;background:#fff}.notice{margin-bottom:18px}.welcome{display:flex;justify-content:space-between;align-items:center;background:linear-gradient(120deg,#fffdfb,#f4e8e2);border:1px solid var(--line);border-radius:22px;padding:28px;margin-bottom:18px}.welcome h2{font-size:25px;margin:7px 0}.welcome p{color:var(--muted);line-height:1.8;margin:0}.pill{display:inline-block;border-radius:999px;background:#fff;color:#967568;border:1px solid var(--rose2);font-size:11px;padding:5px 9px}.welcome-mark{width:80px;height:80px;border-radius:50%;background:#fff;border:1px solid var(--rose2);display:grid;place-items:center;color:var(--rose);font:42px Georgia,serif}
.editor-help{grid-column:1/-1;margin:-7px 0 4px;color:var(--muted);font-size:12px;line-height:1.7}.crystal-category-bar{display:flex;gap:10px;flex-wrap:wrap;margin:28px 0 8px}.crystal-category-bar button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:9px 17px;color:var(--muted);cursor:pointer}.crystal-category-bar button.active{background:#302b28;color:#fff;border-color:#302b28}.crystal-life-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:28px}.crystal-life-card{min-height:112px;padding:18px}.crystal-life-card .icon{font-size:16px}.crystal-life-card strong{font-size:14px}.crystal-life-card span{font-size:10px}.bracelet-empty{display:none}
.stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.stat-card{border:1px solid var(--line);background:var(--card);border-radius:18px;padding:20px;text-align:left;cursor:pointer;display:grid;gap:7px}.stat-icon{font-size:18px;color:var(--rose)}.stat-label{font-size:13px;color:var(--muted)}.stat-card strong{font-size:30px}.stat-card small{font-size:11px;color:#a9897d}.next-card,.empty-card,.editor{margin-top:18px;border:1px solid var(--line);background:var(--card);border-radius:22px;padding:28px}.next-card h2{font-size:24px}.next-card p:last-child,.editor-head p{color:var(--muted);line-height:1.8}.editor-head{display:flex;justify-content:space-between;gap:20px;align-items:center;margin-bottom:24px}.editor h2{font-size:27px;margin:3px 0}.editor-head p{margin:0}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:17px}.field-label.full{grid-column:1/-1}.image-field{grid-column:1/-1;border:1px dashed #d9c8c0;border-radius:16px;padding:16px;display:grid;gap:10px;background:#fffaf7}.image-label{font-size:13px;font-weight:800}.image-field img{width:180px;height:120px;object-fit:cover;border-radius:12px;border:1px solid var(--line)}.image-field input{width:100%;border:1px solid var(--line);background:#fff;border-radius:10px;padding:10px}.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:14px;background:#fff}.table-wrap table{border-collapse:collapse;width:100%;min-width:680px}.table-wrap th,.table-wrap td{padding:12px 13px;border-bottom:1px solid #eee5df;text-align:left;font-size:12px;vertical-align:top}.table-wrap th{background:#fbf6f2;color:#7d6f68;font-size:11px}.table-wrap tr:last-child td{border-bottom:0}.table-btn{border:1px solid var(--line);background:#fff;border-radius:8px;padding:6px 9px;font-size:11px;cursor:pointer;margin-right:6px}.table-btn.danger{color:#a34d42}.empty-row,.loading-box{padding:50px 20px;text-align:center;color:var(--muted);border:1px dashed #dfd1c9;border-radius:14px;background:#fffaf7}@media(max-width:900px){.sidebar{width:82px;padding:18px 10px}.side-brand span:last-child,.side-label{display:none}.side-brand{justify-content:center}.nav-item{justify-content:center;font-size:0}.nav-item span{display:none}.nav-item::first-letter{font-size:18px}.admin-user>div:last-child,.logout{display:none}.stats-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:620px){.admin-layout{display:block}.sidebar{position:sticky;top:0;z-index:20;width:100%;height:auto;display:flex;flex-direction:row;padding:8px 10px;overflow:auto}.side-brand{padding:0 8px}.sidebar nav{display:flex}.nav-item{min-width:56px}.side-bottom{display:none}.admin-main{padding:22px 14px}.topbar h1{font-size:28px}.welcome{padding:20px}.welcome-mark{display:none}.form-grid{grid-template-columns:1fr}.field-label.full,.image-field{grid-column:auto}.editor-head{align-items:flex-start;flex-direction:column}.head-actions{width:100%}.head-actions button{flex:1}.stats-grid{gap:9px}.stat-card{padding:15px}.login-card{padding:30px 22px}}
.rich-editor-wrap{grid-column:1/-1;border:1px solid var(--line);border-radius:16px;background:#fff;overflow:hidden;box-shadow:0 8px 30px #5d46330b}.rt-toolbar{display:flex;align-items:center;gap:5px;flex-wrap:wrap;padding:9px 10px;border-bottom:1px solid var(--line);background:#fffdfb}.rt-btn,.rt-select{height:34px;border:1px solid #e1d5ce;background:#fff;border-radius:8px;color:#4b403b;font-size:12px;cursor:pointer;padding:0 9px}.rt-btn:hover,.rt-select:hover{border-color:#c6aaa0;background:#fffaf7}.rt-btn.active{background:#3b332f;color:#fff;border-color:#3b332f}.rt-btn:disabled{opacity:.55;cursor:wait}.rt-select{min-width:84px}.rt-divider{width:1px;height:24px;background:#e5dcd7;margin:0 2px}.rt-color{height:34px;min-width:34px;border:1px solid #e1d5ce;background:#fff;border-radius:8px;display:flex;align-items:center;justify-content:center;gap:3px;cursor:pointer;font-weight:800;font-size:13px}.rt-color input{width:18px;height:20px;border:0;padding:0;background:transparent;cursor:pointer}.rt-content{min-height:520px;padding:24px 28px;outline:none;font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC",sans-serif;font-size:16px;line-height:1.9;color:var(--ink)}.rt-content:empty:before{content:attr(data-placeholder);color:#b7aaa3}.rt-content h1,.rt-content h2,.rt-content h3,.rt-content h4{font-family:Georgia,"Noto Serif TC",serif;color:var(--ink);line-height:1.35;margin:1.2em 0 .55em}.rt-content h1{font-size:32px}.rt-content h2{font-size:27px}.rt-content h3{font-size:22px}.rt-content h4{font-size:18px}.rt-content p{margin:.65em 0}.rt-content ul,.rt-content ol{padding-left:2em}.rt-content blockquote{margin:18px 0;padding:14px 18px;border-left:4px solid #cda99d;background:#fbf6f2;border-radius:8px}.rt-content blockquote.quote-elegant{font-family:Georgia,"Noto Serif TC",serif;color:#6d5950;font-style:italic;background:#faf6f3}.rt-content blockquote.quote-highlight{border-left-color:#b47d6f;background:#fff1ed;font-weight:700}.rt-content blockquote.quote-note{border-left-color:#d5ad5e;background:#fff9e9}.rt-content p.article-lead{font-size:19px;font-weight:700;color:#5c4b44;background:#fbf6f2;padding:14px 16px;border-radius:10px}.rt-content p.article-info{padding:13px 16px;border:1px solid #eadbd3;background:#fffaf7;border-radius:10px}.rt-content a{color:#9b6c5f;text-decoration:underline}.rt-content img{display:block;max-width:100%;height:auto;margin:16px auto;border-radius:10px}.rt-content table{border-collapse:collapse;width:100%;margin:18px 0}.rt-content th,.rt-content td{border:1px solid #dcd1cb;padding:10px 12px;min-width:70px;text-align:left}.rt-content th{background:#fbf6f2;font-weight:700}.rt-source{display:block;width:100%;min-height:520px;border:0;outline:none;resize:vertical;padding:24px 28px;font:14px/1.8 ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace;color:#4b403b;background:#fff}.ckeditor-note{padding:10px 14px;color:var(--muted);font-size:11px;line-height:1.6;background:#fbf6f2;border-top:1px solid var(--line)}@media(max-width:700px){.rt-toolbar{padding:7px;max-height:190px;overflow:auto}.rt-btn,.rt-select,.rt-color{height:32px;font-size:11px}.rt-content,.rt-source{min-height:420px;padding:18px}.rt-content h1{font-size:27px}.rt-content h2{font-size:24px}.rt-content h3{font-size:20px}.ckeditor-note{font-size:10px}}
`;
export const ADMIN_CSS = CSS + PROMO_CSS;
