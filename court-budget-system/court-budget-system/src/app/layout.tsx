import type { Metadata } from "next";
import { Noto_Sans_Thai, Noto_Serif_Thai, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import SidebarNav from "@/components/SidebarNav";

const body = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const display = Noto_Serif_Thai({
  subsets: ["thai", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ระบบจัดการงบประมาณศาล",
  description: "ระบบจัดการผังบัญชีและงบประมาณของสำนักงานศาล",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${body.variable} ${display.variable} ${mono.variable} font-body antialiased`}>
        <div className="flex min-h-screen">
          <SidebarNav />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
