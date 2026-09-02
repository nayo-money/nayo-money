import type { Metadata } from "next";

import "./globals.css";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";

const FALLBACK = {
  site_name: "Nayo 娜攸",
  site_tagline: "生活理財 × 水晶",
  favicon_url: "/icon.svg",
  description: "信用卡回饋、小資理財、旅行生活、生命靈數與水晶，讓理財成為喜歡的生活。",
};

async function getSiteSettings() {
  const supabase = await createClient();
  const settings: Record<string, string> = { ...FALLBACK };
  if (!supabase) return settings;

  const { data } = await supabase.from("site_settings").select("setting_key, setting_value");
  for (const row of data || []) {
    if (row.setting_key) settings[row.setting_key] = row.setting_value ?? "";
  }
  return settings;
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const siteName = settings.site_name || FALLBACK.site_name;
  const tagline = settings.site_tagline || FALLBACK.site_tagline;
  const title = `${siteName}｜${tagline}`;
  const favicon = settings.favicon_url || FALLBACK.favicon_url;

  return {
    metadataBase: new URL("https://nayomoney.com"),
    title: {
      default: title,
      template: `%s｜${siteName}`,
    },
    description: settings.hero_description || FALLBACK.description,
    icons: {
      icon: favicon,
      shortcut: favicon,
      apple: favicon,
    },
    alternates: { canonical: "/" },
    openGraph: {
      title,
      description: settings.hero_description || FALLBACK.description,
      url: "https://nayomoney.com",
      siteName,
      locale: "zh_TW",
      type: "website",
    },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant-TW">
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
