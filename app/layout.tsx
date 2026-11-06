import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { MockBanner } from "@/components/layout/mock-banner";
import { TopBar } from "@/components/layout/top-bar";
import { Providers } from "@/components/providers";
import { az } from "@/lib/i18n/messages/az";
import "./globals.css";

// latin-ext carries the Azerbaijani letters (ə, ş, ğ, ı).
const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: az.app.name,
  description: az.app.description,
  // An internal HR tool has no reason to appear in search results.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="az" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>
          <TopBar />
          <MockBanner />
          <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
