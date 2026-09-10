"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_CSS, RichTextEditor } from "@/app/admin/page";

const supabase = createClient();
const adminSupabase = supabase!;

type Row = Record<string, any>;

export default function NumberPageEditor({ number }: { number: number }) {
  const defaults: Row = {
    [`life_${number}_title`]: `生命靈數 ${number}`,
    [`life_${number}_subtitle`]: "查看對應水晶",
    [`life_${number}_crystal_kicker`]: `生命靈數 ${number}`,
    [`life_${number}_crystal_title`]: "適合你的水晶",
    [`life_${number}_crystal_empty`]: `目前尚未設定生命靈數 ${number} 的對應水晶。你可以到後台「水晶」資料設定生命靈數。`,
    [`life_${number}_content`]: "<h2>生命靈數的特質</h2><p>在這裡整理生命靈數的完整介紹、性格特質、需要補足的能量，以及適合的水晶。</p>",
  };
  const [form, setForm] = useState<Row>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [crystals, setCrystals] = useState<{id:string;name:string;color?:string|null;life_numbers?:string|null;missing_numbers?:string|null}[]>([]);

  useEffect(() => {
    (async () => {
      if (!supabase) { setError("Supabase 尚未設定。"); setLoading(false); return; }
      const [{ data, error }, crystalResult] = await Promise.all([
        adminSupabase.from("site_settings").select("setting_key,setting_value"),
        adminSupabase.from("crystals").select("id,name,color,life_numbers,missing_numbers").eq("is_active", true).order("sort_order").order("created_at", { ascending: false })
      ]);
      if (error) { setError(error.message); setLoading(false); return; }
      if (crystalResult.error) { setError(crystalResult.error.message); setLoading(false); return; }
      setCrystals((crystalResult.data || []) as {id:string;name:string;color?:string|null;life_numbers?:string|null;missing_numbers?:string|null}[]);
      const next = { ...defaults };
      for (const row of data || []) {
        if (row.setting_key in next) next[row.setting_key] = row.setting_value ?? "";
      }
      setForm(next);
      setLoading(false);
    })();
  }, [number]);

  const set = (key: string, value: string) => setForm((x: Row) => ({ ...x, [key]: value }));

  async function save() {
    if (!supabase) return;
    setSaving(true); setError(""); setMessage("");
    try {
      for (const [setting_key, value] of Object.entries(form)) {
        const { error } = await adminSupabase.from("site_settings").upsert(
          { setting_key, setting_value: String(value ?? ""), updated_at: new Date().toISOString() },
          { onConflict: "setting_key" }
        );
        if (error) throw error;
      }
      setMessage(`生命靈數 ${number} 內容頁已儲存。`);
    } catch (e: any) {
      setError(e?.message || "儲存失敗。");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="admin-main standalone-admin-page"><div className="loading">載入生命靈數 {number} 內容頁…</div></main>;

  return (
    <>
      <style>{ADMIN_CSS}</style>
      <main className="admin-main standalone-admin-page">
      <header className="topbar">
        <div><p className="eyebrow">CRYSTAL PAGE CMS</p><h1>生命靈數 {number} 內容頁</h1></div>
        <div className="standalone-actions">
          <Link href="/admin" className="soft-btn">← 回 Crystal 頁面</Link>
          <Link href={`/crystal/number/${number}`} className="soft-btn" target="_blank">查看前台 ↗</Link>
          <button className="primary compact" onClick={save} disabled={saving}>{saving ? "儲存中…" : "儲存內容頁"}</button>
        </div>
      </header>

      {error && <div className="notice error-box">{error}</div>}
      {message && <div className="notice success-box">{message}</div>}

      <section className="editor">
        <div className="form-grid">
          <div className="form-section-title">頁面基本資料</div>
          <label className="field-label">頁面標題<input className="field" value={form[`life_${number}_title`] || ""} onChange={e => set(`life_${number}_title`, e.target.value)} /></label>
          <label className="field-label">頁面小字<input className="field" value={form[`life_${number}_subtitle`] || ""} onChange={e => set(`life_${number}_subtitle`, e.target.value)} /></label>
          <div className="field-help full">這裡編輯的是點進「生命靈數 {number}」後看到的獨立內容頁，不會改變其他生命靈數頁面。</div>
          <div className="form-section-title">適合你的水晶區塊</div>
          <label className="field-label">區塊小標<input className="field" value={form[`life_${number}_crystal_kicker`] || ""} onChange={e => set(`life_${number}_crystal_kicker`, e.target.value)} /></label>
          <label className="field-label">區塊標題<input className="field" value={form[`life_${number}_crystal_title`] || ""} onChange={e => set(`life_${number}_crystal_title`, e.target.value)} /></label>
          <label className="field-label full">沒有對應水晶時顯示文字<textarea className="field" rows={3} value={form[`life_${number}_crystal_empty`] || ""} onChange={e => set(`life_${number}_crystal_empty`, e.target.value)} /></label>
          <div className="field-help full">你可以直接指定這個生命靈數頁要顯示哪些水晶；未指定時，前台會沿用水晶資料中的「生命靈數／缺數」自動配對。</div>
          <div className="crystal-number-picker full">
            <strong>對應水晶（可複選）</strong>
            <div className="crystal-number-picker-list">
              {crystals.length ? crystals.map(c => {
                let selected:string[]=[];
                try { const parsed=JSON.parse(form[`life_${number}_crystal_ids`] || "[]"); if(Array.isArray(parsed)) selected=parsed.map(String); } catch {}
                const checked=selected.includes(c.id);
                return <label className="crystal-number-option" key={c.id}><input type="checkbox" checked={checked} onChange={e => { const next=checked ? selected.filter(id=>id!==c.id) : [...selected,c.id]; set(`life_${number}_crystal_ids`, JSON.stringify(next)); }} /><span><b>{c.name}</b>{c.color ? `｜${c.color}` : ""}{(c.life_numbers||c.missing_numbers) ? <small>（現有標記：{[c.life_numbers,c.missing_numbers].filter(Boolean).join("／")}）</small> : null}</span></label>;
              }) : <p className="muted">目前沒有啟用中的水晶資料，請先到「水晶」新增。</p>}
            </div>
          </div>
          <div className="form-section-title">內容頁正文</div>
          <div className="rich-editor-wrap full">
            <div className="rich-editor-label">生命靈數 {number} 內容</div>
            <div className="rich-editor-help">直接編輯正文，不需要自己寫 HTML。可使用 H1～H4、字型、字級、顏色、表格、圖片、連結、條列與引用樣式。</div>
            <RichTextEditor folder="crystal-life" value={form[`life_${number}_content`] || ""} onChange={v => set(`life_${number}_content`, v)} />
          </div>
        </div>
      </section>
      </main>
    </>
  );
}
