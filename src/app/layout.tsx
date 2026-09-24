import type { Metadata } from "next";
import { Newsreader, Public_Sans } from "next/font/google";
import { t } from "@/i18n/fr";
import "./globals.css";

const publicSans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin"] });
const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: t.app.title,
  description: t.app.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${publicSans.variable} ${newsreader.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-[15px]">{children}</body>
    </html>
  );
}
