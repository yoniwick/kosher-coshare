import type { Metadata, Viewport } from "next";
import { DM_Sans, Noto_Serif_JP } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { AppShell } from "@/components/layout/app-shell";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import { publicAppUrl } from "@/lib/public-app-url";

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-serif",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#b8583e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(publicAppUrl()),
  applicationName: "Kosher CoShare",
  title: {
    default: "KOSHER-COSHARE · Kosher recipes",
    template: "%s · KOSHER-COSHARE",
  },
  description: "A calm, fast community for kosher recipes — post quickly, discover beautifully.",
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Kosher CoShare",
    title: "Kosher CoShare — kosher recipes",
    description: "A calm, fast community for kosher recipes — post quickly, discover beautifully.",
    images: [{ url: "/brand/logo-app-icon.png", alt: "Kosher CoShare" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kosher CoShare — kosher recipes",
    description: "A calm, fast community for kosher recipes — post quickly, discover beautifully.",
    images: ["/brand/logo-app-icon.png"],
  },
  icons: {
    icon: [
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/brand/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kosher CoShare",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Browser extensions (e.g. Grammarly) inject data-* attrs on <body> before hydrate.
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sans.variable} ${serif.variable} font-sans`}
        suppressHydrationWarning
      >
        <RegisterServiceWorker />
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
