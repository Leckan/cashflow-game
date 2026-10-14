import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Figtree, Fraunces } from "next/font/google";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Providers } from "@/components/site/Providers";
import { brand } from "@/config/brand";
import "./globals.css";

const sans = Figtree({ subsets: ["latin"], variable: "--font-figtree", weight: ["400", "600", "700"] });
const display = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", weight: ["500", "700"] });

export const metadata: Metadata = {
  title: brand.product,
  description: brand.tagline,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} h-full`}>
      <body className="min-h-full antialiased">
        <Providers>
          <div className="flex min-h-full flex-col">
            <SiteHeader />
            <div className="flex-1">{children}</div>
            <footer className="px-4 py-6 text-sm leading-6 text-paper/70 sm:px-6">
              <p className="max-w-3xl">{brand.disclaimer} WealthQuest is not affiliated with any commercial board game.</p>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
