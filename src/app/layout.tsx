import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers/Providers";
import { AppShell } from "@/components/providers/AppShell";
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
  title: "Stacklume - Organiza tus enlaces de desarrollo",
  description:
    "Almacena y organiza enlaces, repositorios, herramientas y recursos de desarrollo de forma visual con un bento grid personalizable.",
  keywords: [
    "enlaces",
    "desarrollo",
    "herramientas",
    "recursos",
    "organización",
    "bento grid",
  ],
  manifest: "/manifest.json",
  applicationName: "Stacklume",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Stacklume",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased no-scroll`}
      >
        <Providers>
          <AppShell>{children}</AppShell>
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              className: "bg-card border border-border text-foreground",
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
