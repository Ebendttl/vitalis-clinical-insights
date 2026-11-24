import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { Providers } from "./_providers/providers";
import "./globals.css";

// Variable font, self-hosted by next/font: no layout shift, no third-party request at runtime.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Vitalis", template: "%s · Vitalis" },
  description: "Clinical insights for clinicians. Synthetic data, for demonstration only.",
  applicationName: "Vitalis",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfd" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1015" },
  ],
};

// Applied before first paint so the collapsed sidebar never causes layout shift.
const sidebarScript = `try{document.documentElement.dataset.sidebar=localStorage.getItem("vitalis:sidebar")||"expanded"}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: sidebarScript }} />
      </head>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
