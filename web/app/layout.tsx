import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { ThemeProvider } from 'next-themes';
import { LaunchBanner } from './components/LaunchBanner';

export const metadata: Metadata = {
  title: "barf. — Deploy open-source apps in 2 minutes",
  description: "Browse 50+ open-source alternatives to expensive SaaS tools and deploy any of them in under 2 minutes. Free until May 12, 2026.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-50 transition-colors">
        <ThemeProvider
          attribute="class"
          defaultTheme="system" enableSystem
        >
          <LaunchBanner />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
