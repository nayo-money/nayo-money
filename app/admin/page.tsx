"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const supabase = createClient();
const adminSupabase = supabase!;

type Tab = "overview" | "home" | "posts" | "categories" | "crystals" | "products";
const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "總覽", icon: "⌂" },
  { id: "home", label: "首頁設定", icon: "✦" },
  { id: "posts", label: "Blog 文章", icon: "✎" },
  { id: "categories", label: "文章分類", icon: "▦" },
  { id: "crystals", label: "水晶", icon: "◇" },
  { id: "products", label: "手環作品", icon: "♢" },
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
  const [stats, setStats] = useState({ posts: 0, categories: 0, crystals: 0, products: 0 });

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
    const [posts, categories, crystals, products] = await Promise.all([
      adminSupabase.from("posts").select("id", { count: "exact", head: true }),
      adminSupabase.from("categories").select("id", { count: "exact", head: true }),
      adminSupabase.from("crystals").select("id", { count: "exact", head: true }),
      adminSupabase.from("products").select("id", { count: "exact", head: true }),
    ]);
    setStats({ posts: posts.count ?? 0, categories: categories.count ?? 0, crystals: crystals.count ?? 0, products: products.count ?? 0 });
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
        {tab === "posts" && <PostsEditor notify={setMessage} fail={setError} />}
        {tab === "categories" && <CategoriesEditor notify={setMessage} fail={setError} />}
        {tab === "crystals" && <CrystalsEditor notify={setMessage} fail={setError} />}
        {tab === "products" && <ProductsEditor notify={setMessage} fail={setError} />}
      </main>
    </div>
  </Shell>;
}

function Overview({ stats, setTab }: { stats: { posts:number; categories:number; crystals:number; products:number }, setTab:(tab:Tab)=>void }) {
  const cards: [Tab,string,number,string][] = [["posts","Blog 文章",stats.posts,"✎"],["categories","文章分類",stats.categories,"▦"],["crystals","水晶",stats.crystals,"◇"],["products","手環作品",stats.products,"♢"]];
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
    about_text:"理財讓生活有更多選擇，而生命靈數與水晶，是我探索生活與自己的另一種方式。"
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

      <ImageField label="大頭貼" value={form.profile_image} onChange={file=>image("profile_image",file)} setUrl={v=>set("profile_image",v)}/>
      <ImageField label="首頁主圖" value={form.hero_image} onChange={file=>image("hero_image",file)} setUrl={v=>set("hero_image",v)}/>
      <ImageField label="網站 Logo" value={form.site_logo_url} onChange={file=>image("site_logo_url",file)} setUrl={v=>set("site_logo_url",v)}/>
      <ImageField label="瀏覽器 Logo（Favicon）" value={form.favicon_url} onChange={file=>image("favicon_url",file)} setUrl={v=>set("favicon_url",v)}/>
    </div>
  </section>;
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
function CrystalsEditor({notify,fail}:{notify:(s:string)=>void;fail:(s:string)=>void}){return <SimpleCrud table="crystals" title="水晶" fields={[{k:"name",l:"水晶名稱"},{k:"slug",l:"Slug"},{k:"life_numbers",l:"生命靈數"},{k:"color",l:"代表色"},{k:"meaning",l:"寓意",area:true},{k:"image",l:"圖片網址"},{k:"sort_order",l:"排序",number:true}]} imageFolder="crystals" notify={notify} fail={fail}/>} 
function ProductsEditor({notify,fail}:{notify:(s:string)=>void;fail:(s:string)=>void}){return <SimpleCrud table="products" title="手環作品" fields={[{k:"name",l:"作品名稱"},{k:"slug",l:"Slug"},{k:"missing_numbers",l:"缺數"},{k:"description",l:"作品介紹",area:true},{k:"price",l:"價格",number:true},{k:"image",l:"圖片網址"},{k:"purchase_url",l:"購買連結"},{k:"instagram_url",l:"Instagram 連結"},{k:"sort_order",l:"排序",number:true}]} imageFolder="products" notify={notify} fail={fail}/>} 

function SimpleCrud({table,title,fields,notify,fail,imageFolder}:{table:string;title:string;fields:{k:string;l:string;area?:boolean;number?:boolean}[];notify:(s:string)=>void;fail:(s:string)=>void;imageFolder?:string}){
  const [rows,setRows]=useState<Row[]>([]);const [editing,setEditing]=useState<Row|null>(null);const [loading,setLoading]=useState(true);
  async function load(){if(!supabase)return;setLoading(true);const {data,error}=await adminSupabase.from(table).select("*").order("sort_order",{ascending:true}).order("created_at",{ascending:false});if(error)fail(error.message);setRows(data||[]);setLoading(false)}useEffect(()=>{load()},[table]);
  async function save(row:Row){if(!supabase)return;const payload={...row};if(payload.id){const {error}=await adminSupabase.from(table).update(payload).eq("id",payload.id);if(error)return fail(error.message)}else{delete payload.id;const {error}=await adminSupabase.from(table).insert(payload);if(error)return fail(error.message)}notify(`${title}已儲存。`);setEditing(null);load()}
  async function remove(id:string){if(!supabase||!confirm(`確定刪除這筆${title}？`))return;const {error}=await adminSupabase.from(table).delete().eq("id",id);if(error)fail(error.message);else{notify(`${title}已刪除。`);load()}}
  if(editing){return <section className="editor"><EditorHead title={editing.id?`編輯${title}`:`新增${title}`} onSave={()=>save(editing)} onCancel={()=>setEditing(null)}/><div className="form-grid">{fields.map(f=>f.area?<TextArea key={f.k} label={f.l} value={editing[f.k]??""} onChange={v=>setEditing({...editing,[f.k]:v})} full/>:<Field key={f.k} label={f.l} value={editing[f.k]??""} type={f.number?"number":"text"} onChange={v=>setEditing({...editing,[f.k]:f.number?(v===""?null:Number(v)):v})} full={f.k==="description"}/>)}</div>{imageFolder&&<ImageField label="直接上傳圖片" value={editing.image||""} onChange={async f=>{try{const u=await uploadImage(f,imageFolder);setEditing({...editing,image:u});notify("圖片已上傳，儲存後生效。")}catch(e:any){fail(e.message)}}} setUrl={v=>setEditing({...editing,image:v})}/>}</section>}
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
:root{--bg:#f8f4f0;--card:#fffdfb;--ink:#2e2926;--muted:#8c8078;--rose:#b9968a;--rose2:#eadbd5;--line:#e8ddd7}*{box-sizing:border-box}html,body{margin:0;padding:0;background:var(--bg);color:var(--ink)}body{font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC",sans-serif}button,input,textarea,select{font:inherit}.loading{min-height:100dvh;display:grid;place-items:center;color:var(--muted)}.login-wrap{min-height:100dvh;display:grid;place-items:center;padding:24px}.login-card{width:min(100%,480px);background:var(--card);border:1px solid var(--line);border-radius:28px;padding:42px;box-shadow:0 20px 70px #5d46331a}.brand-mark{width:54px;height:54px;border:1px solid var(--rose2);border-radius:50%;display:grid;place-items:center;font:27px Georgia,serif;color:var(--rose);background:#fff}.brand-mark.small{width:40px;height:40px;font-size:21px}.eyebrow{font-size:12px;letter-spacing:.18em;color:#b67e70;font-weight:800;margin:0 0 9px}.login-card h1,.topbar h1,.welcome h2,.next-card h2,.empty-card h2,.editor h2{font-family:Georgia,"Noto Serif TC",serif}.login-card h1{font-size:40px;margin:0 0 10px}.lead{color:var(--muted);line-height:1.8;margin-bottom:28px}.login-form{display:grid;gap:18px}.login-form label,.field-label{display:grid;gap:8px;font-size:13px;font-weight:700}.login-form input,.field-label input,.field-label textarea,.field{width:100%;border:1px solid var(--line);background:#fff;border-radius:12px;padding:13px 14px;outline:none}.field-label textarea{resize:vertical;line-height:1.7}.login-form input:focus,.field-label input:focus,.field-label textarea:focus,.field:focus{border-color:var(--rose);box-shadow:0 0 0 3px #b9968a1a}.primary{border:0;border-radius:12px;padding:14px 18px;background:#3b332f;color:#fff;cursor:pointer;font-weight:700}.primary:disabled{opacity:.6}.compact{padding:11px 16px}.soft-btn{border:1px solid var(--line);background:#fff;border-radius:11px;padding:10px 15px;cursor:pointer}.head-actions{display:flex;gap:9px}.error-box{padding:12px 14px;background:#fff0ee;border:1px solid #efd0ca;color:#a34d42;border-radius:10px;font-size:13px;line-height:1.65;white-space:pre-line}.success-box{padding:12px 14px;background:#eef8f1;border:1px solid #cfe6d6;color:#477254;border-radius:10px;font-size:13px;line-height:1.65;white-space:pre-line}back-link{display:block;margin-top:22px;color:var(--muted);font-size:13px;text-decoration:none}.admin-layout{min-height:100dvh;display:flex}.sidebar{width:260px;background:#302b28;color:#fff;padding:24px 18px;display:flex;flex-direction:column}.side-brand{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none;padding:5px 8px 28px}.side-brand span:last-child{display:grid}.side-brand b{font-size:16px}.side-brand small{font-size:11px;color:#c8b9b1}.side-label{font-size:10px;letter-spacing:.18em;color:#a99991;padding:0 12px 10px}.sidebar nav{display:grid;gap:4px}.nav-item{border:0;background:transparent;color:#d7ccc6;text-align:left;padding:12px;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:11px;font-size:14px}.nav-item:hover,.nav-item.active{background:#4a403b;color:#fff}.nav-item.active{box-shadow:inset 3px 0 var(--rose)}.side-bottom{margin-top:auto;border-top:1px solid #ffffff16;padding:18px 8px 4px}.admin-user{display:flex;align-items:center;gap:9px}.avatar{width:34px;height:34px;border-radius:50%;background:#efe1da;color:#72584d;display:grid;place-items:center;font-weight:800}.admin-user b,.admin-user small{display:block}.admin-user b{font-size:12px}.admin-user small{font-size:10px;color:#a99b94;max-width:160px;overflow:hidden;text-overflow:ellipsis}.logout{width:100%;margin-top:14px;border:1px solid #ffffff20;background:transparent;color:#cfc3bd;border-radius:9px;padding:9px;cursor:pointer;font-size:12px}.admin-main{flex:1;min-width:0;padding:34px clamp(20px,4vw,56px);max-width:1500px}.topbar{display:flex;justify-content:space-between;align-items:end;margin-bottom:26px}.topbar h1{font-size:34px;margin:0}.view-site{color:#7f665c;text-decoration:none;font-size:13px;border:1px solid var(--line);padding:9px 13px;border-radius:10px;background:#fff}.notice{margin-bottom:18px}.welcome{display:flex;justify-content:space-between;align-items:center;background:linear-gradient(120deg,#fffdfb,#f4e8e2);border:1px solid var(--line);border-radius:22px;padding:28px;margin-bottom:18px}.welcome h2{font-size:25px;margin:7px 0}.welcome p{color:var(--muted);line-height:1.8;margin:0}.pill{display:inline-block;border-radius:999px;background:#fff;color:#967568;border:1px solid var(--rose2);font-size:11px;padding:5px 9px}.welcome-mark{width:80px;height:80px;border-radius:50%;background:#fff;border:1px solid var(--rose2);display:grid;place-items:center;color:var(--rose);font:42px Georgia,serif}.stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.stat-card{border:1px solid var(--line);background:var(--card);border-radius:18px;padding:20px;text-align:left;cursor:pointer;display:grid;gap:7px}.stat-icon{font-size:18px;color:var(--rose)}.stat-label{font-size:13px;color:var(--muted)}.stat-card strong{font-size:30px}.stat-card small{font-size:11px;color:#a9897d}.next-card,.empty-card,.editor{margin-top:18px;border:1px solid var(--line);background:var(--card);border-radius:22px;padding:28px}.next-card h2{font-size:24px}.next-card p:last-child,.editor-head p{color:var(--muted);line-height:1.8}.editor-head{display:flex;justify-content:space-between;gap:20px;align-items:center;margin-bottom:24px}.editor h2{font-size:27px;margin:3px 0}.editor-head p{margin:0}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:17px}.field-label.full{grid-column:1/-1}.image-field{grid-column:1/-1;border:1px dashed #d9c8c0;border-radius:16px;padding:16px;display:grid;gap:10px;background:#fffaf7}.image-label{font-size:13px;font-weight:800}.image-field img{width:180px;height:120px;object-fit:cover;border-radius:12px;border:1px solid var(--line)}.image-field input{width:100%;border:1px solid var(--line);background:#fff;border-radius:10px;padding:10px}.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:14px;background:#fff}.table-wrap table{border-collapse:collapse;width:100%;min-width:680px}.table-wrap th,.table-wrap td{padding:12px 13px;border-bottom:1px solid #eee5df;text-align:left;font-size:12px;vertical-align:top}.table-wrap th{background:#fbf6f2;color:#7d6f68;font-size:11px}.table-wrap tr:last-child td{border-bottom:0}.table-btn{border:1px solid var(--line);background:#fff;border-radius:8px;padding:6px 9px;font-size:11px;cursor:pointer;margin-right:6px}.table-btn.danger{color:#a34d42}.empty-row,.loading-box{padding:50px 20px;text-align:center;color:var(--muted);border:1px dashed #dfd1c9;border-radius:14px;background:#fffaf7}@media(max-width:900px){.sidebar{width:82px;padding:18px 10px}.side-brand span:last-child,.side-label{display:none}.side-brand{justify-content:center}.nav-item{justify-content:center;font-size:0}.nav-item span{display:none}.nav-item::first-letter{font-size:18px}.admin-user>div:last-child,.logout{display:none}.stats-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:620px){.admin-layout{display:block}.sidebar{position:sticky;top:0;z-index:20;width:100%;height:auto;display:flex;flex-direction:row;padding:8px 10px;overflow:auto}.side-brand{padding:0 8px}.sidebar nav{display:flex}.nav-item{min-width:56px}.side-bottom{display:none}.admin-main{padding:22px 14px}.topbar h1{font-size:28px}.welcome{padding:20px}.welcome-mark{display:none}.form-grid{grid-template-columns:1fr}.field-label.full,.image-field{grid-column:auto}.editor-head{align-items:flex-start;flex-direction:column}.head-actions{width:100%}.head-actions button{flex:1}.stats-grid{gap:9px}.stat-card{padding:15px}.login-card{padding:30px 22px}}
`;