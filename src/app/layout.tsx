import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import AuthGate from "@/components/AuthGate";
import PasscodeLock from "@/components/PasscodeLock";
import { DashboardProvider } from "@/context/DashboardContext";

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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-[#0B0F19] text-slate-200 antialiased min-h-screen" suppressHydrationWarning={true}>
        {/*
          Auth stack (outermost → innermost):
          1. AuthProvider  — Supabase session context
          2. AuthGate      — blocks render until session confirmed
          3. PasscodeLock  — device-level PIN (existing local lock)
          4. DashboardProvider — app state
        */}
        <AuthProvider>
          <AuthGate>
            <PasscodeLock>
              <DashboardProvider>{children}</DashboardProvider>
            </PasscodeLock>
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
