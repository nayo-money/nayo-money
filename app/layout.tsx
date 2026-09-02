import type { Metadata } from "next";

import "./globals.css";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://nayomoney.com"),

  title: {
    default: "Nayo 娜攸｜生活理財 × 水晶",
    template: "%s｜Nayo 娜攸",
  },

  description:
    "信用卡回饋、小資理財、旅行生活、生命靈數與水晶，讓理財成為喜歡的生活。",

  alternates: { canonical: "/" },

  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },

  openGraph: {
    title: "Nayo 娜攸｜生活理財 × 水晶",
    description: "生活理財 × 生命靈數 × 水晶",
    url: "https://nayomoney.com",
    siteName: "Nayo 娜攸",
    locale: "zh_TW",
    type: "website",
  },

  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
