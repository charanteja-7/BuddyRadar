import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import { ObservabilityRuntime } from "@/features/observability/observability-runtime";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BuddyLocation",
  description: "Real-time friend location sharing with Firebase and Leaflet.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "BuddyLocation",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      {
        url: "/icons/icon-192.svg",
        type: "image/svg+xml",
      },
      {
        url: "/icons/icon-512.svg",
        type: "image/svg+xml",
      },
    ],
    apple: [
      {
        url: "/icons/icon-192.svg",
        type: "image/svg+xml",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#05080f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${spaceMono.variable}`}>
      <body>
        <ObservabilityRuntime />
        {children}
      </body>
    </html>
  );
}
