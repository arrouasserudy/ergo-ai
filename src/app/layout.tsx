import type { Metadata, Viewport } from "next";
import { Frank_Ruhl_Libre, Heebo, Newsreader, Public_Sans } from "next/font/google";
import { I18nProvider } from "@/i18n/client";
import { getI18n } from "@/i18n/server";
import { APP_TIME_ZONE } from "@/lib/time";
import "./globals.css";

// Latin fonts first; the Hebrew fonts supply the glyphs the Latin ones lack.
const publicSans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin"] });
const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], style: ["normal", "italic"] });
const heebo = Heebo({ variable: "--font-heebo", subsets: ["hebrew"] });
const frankRuhl = Frank_Ruhl_Libre({ variable: "--font-frank-ruhl", subsets: ["hebrew"] });

// Tablet-first: fit the device width, extend under the notch/home bar (padded with safe-area insets),
// and keep pinch-zoom available for accessibility.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1e2624",
};

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.app.title, description: t.app.description };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale, dir, hideNames } = await getI18n();
  const fonts = [publicSans, newsreader, heebo, frankRuhl].map((f) => f.variable).join(" ");

  return (
    <html lang={locale} dir={dir} className={`${fonts} h-full antialiased`}>
      <body className="min-h-full font-sans text-[15px]">
        <I18nProvider locale={locale} timeZone={APP_TIME_ZONE} hideNames={hideNames}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
