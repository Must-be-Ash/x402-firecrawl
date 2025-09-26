import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "News App - Stay Updated with Latest News",
  description: "Proof of concept of using 402 to make a dormant site that only activates when visited. It demonstrates how builders can only spend on APIs when needed.",
  keywords: ["news", "updates", "current events", "breaking news", "news aggregator", "402", "pay-per-use", "dormant site", "proof of concept"],
  authors: [{ name: "@must_be_ash" }],
  creator: "@must_be_ash",
  publisher: "@must_be_ash",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://x402-firecrawl.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "News App - Stay Updated with Latest News",
    description: "Proof of concept of using 402 to make a dormant site that only activates when visited. It demonstrates how builders can only spend on APIs when needed.",
    url: "https://x402-firecrawl.vercel.app",
    siteName: "News App",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "News App - Stay Updated with Latest News",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "News App - Stay Updated with Latest News",
    description: "Proof of concept of using 402 to make a dormant site that only activates when visited. It demonstrates how builders can only spend on APIs when needed.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "android-chrome-192x192",
        url: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        rel: "android-chrome-512x512",
        url: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
  manifest: "/site.webmanifest",
  other: {
    "msapplication-TileColor": "#ffffff",
    "theme-color": "#ffffff",
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
        <Analytics />
      </body>
    </html>
  );
}
