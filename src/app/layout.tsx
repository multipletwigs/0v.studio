import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "0v - Sketch to UI in Seconds",
  description: "Transform your sketches into polished UI components instantly. Draw your lo-fi mockup and generate production-ready code with AI.",
  keywords: ["UI design", "sketch to code", "AI", "wireframe", "prototype", "v0", "tldraw"],
  authors: [{ name: "Team 0v" }],
  openGraph: {
    title: "0v - Sketch to UI in Seconds",
    description: "Transform your sketches into polished UI components instantly. Draw your lo-fi mockup and generate production-ready code with AI.",
    url: "https://0v.dev",
    siteName: "0v",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "0v - Sketch to UI in Seconds",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "0v - Sketch to UI in Seconds",
    description: "Transform your sketches into polished UI components instantly. Draw your lo-fi mockup and generate production-ready code with AI.",
    images: ["/api/og"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
