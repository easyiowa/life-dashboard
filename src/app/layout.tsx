import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import AuthGate from "@/components/AuthGate";
import PasscodeLock from "@/components/PasscodeLock";
import { DashboardProvider } from "@/context/DashboardContext";
import { ThemeProvider } from "@/context/ThemeContext";

const THEME_FOUC_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('ld_theme_mode');
    var mode = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(mode);
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Life Dashboard",
  description: "Personal life command centre",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_FOUC_SCRIPT }} />
      </head>
      <body className="bg-[#0B0F19] text-slate-200 antialiased min-h-screen" suppressHydrationWarning={true}>
        {/*
          Auth stack (outermost → innermost):
          1. ThemeProvider — light/dark mode context
          2. AuthProvider  — Supabase session context
          3. AuthGate      — blocks render until session confirmed
          4. PasscodeLock  — device-level PIN (existing local lock)
          5. DashboardProvider — app state
        */}
        <ThemeProvider>
          <AuthProvider>
            <AuthGate>
              <PasscodeLock>
                <DashboardProvider>{children}</DashboardProvider>
              </PasscodeLock>
            </AuthGate>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
