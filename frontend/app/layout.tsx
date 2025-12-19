import { ThemeProvider } from "@/app/context/ThemeProvider";
import type { Metadata } from "next";


import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Components
import { NavBar } from '@/components/nav-bar/NavBar';
import { Footer } from '@/components/footer/Footer';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Papa Alpha - Procurement Assistant RFP Demo",
  description: "Fullstack ChatGPT Powered Procurement Assistant RFP Analyzer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NavBar />
          {children}
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
