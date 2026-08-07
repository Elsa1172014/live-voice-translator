import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "المترجم الصوتي اللحظي",
  description: "ترجمة صوتية متدفقة ثنائية الاتجاه بين العربية والإنجليزية.",
  other: { "codex-preview": "development" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
