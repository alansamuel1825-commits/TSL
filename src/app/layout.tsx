import type {
  Metadata,
  Viewport,
} from "next";

import type {
  ReactNode,
} from "react";

import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import "./globals.css";

import AuthGate from "@/components/auth/AuthGate";
import Footer from "@/components/navigation/Footer";
import Navbar from "@/components/navigation/Navbar";
import {
  PreferencesProvider,
} from "@/components/preferences/PreferencesProvider";
import PWAClient from "@/components/pwa/PWAClient";
import ReminderBootstrap from "@/components/notifications/ReminderBootstrap";

const geistSans = Geist({
  variable:
    "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono =
  Geist_Mono({
    variable:
      "--font-geist-mono",
    subsets: ["latin"],
  });

export const metadata:
  Metadata = {
  title: {
    default:
      "The Study Alumni Connect",
    template:
      "%s | The Study Alumni Connect",
  },

  description:
    "A school-community platform connecting current students with verified alumni of The Study L'école Internationale.",

  applicationName:
    "The Study Alumni Connect",

  manifest:
    "/manifest.webmanifest",

  icons: {
    icon: [
      {
        url:
          "/pwa-192.png",
        sizes:
          "192x192",
        type:
          "image/png",
      },
      {
        url:
          "/pwa-512.png",
        sizes:
          "512x512",
        type:
          "image/png",
      },
    ],

    apple:
      "/apple-touch-icon.png",
  },

  appleWebApp: {
    capable: true,
    title:
      "TSL Alumni",
    statusBarStyle:
      "default",
  },
};

export const viewport:
  Viewport = {
  width:
    "device-width",
  initialScale: 1,
  viewportFit:
    "cover",
  themeColor: [
    {
      media:
        "(prefers-color-scheme: light)",
      color:
        "#fbfcff",
    },
    {
      media:
        "(prefers-color-scheme: dark)",
      color:
        "#08111f",
    },
  ],
};

const preferenceBootScript = `
(() => {
  try {
    const key =
      "tsl-alumni-preferences-v1";

    const raw =
      localStorage.getItem(key);

    const stored =
      raw ? JSON.parse(raw) : {};

    const theme =
      stored.theme === "light" ||
      stored.theme === "dark" ||
      stored.theme === "system"
        ? stored.theme
        : "system";

    const systemDark =
      window.matchMedia &&
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;

    const resolved =
      theme === "system"
        ? (
            systemDark
              ? "dark"
              : "light"
          )
        : theme;

    const textSize =
      stored.textSize === "large"
        ? "large"
        : "default";

    document.documentElement
      .dataset.theme =
        resolved;

    document.documentElement
      .dataset.textSize =
        textSize;

    document.documentElement
      .dataset.contrast =
        stored.highContrast === true
          ? "high"
          : "normal";

    document.documentElement
      .dataset.reduceMotion =
        stored.reduceMotion === true
          ? "true"
          : "false";

    document.documentElement
      .style.colorScheme =
        resolved;
  } catch {
    const systemDark =
      window.matchMedia &&
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;

    const resolved =
      systemDark
        ? "dark"
        : "light";

    document.documentElement
      .dataset.theme =
        resolved;

    document.documentElement
      .dataset.textSize =
        "default";

    document.documentElement
      .dataset.contrast =
        "normal";

    document.documentElement
      .dataset.reduceMotion =
        "false";

    document.documentElement
      .style.colorScheme =
        resolved;
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              preferenceBootScript,
          }}
        />
      </head>

      <body className="flex min-h-full flex-col bg-[#fbfcff] text-slate-950">
        <PreferencesProvider>
          <Navbar />

          <div className="flex-1">
            <AuthGate>
              {children}
            </AuthGate>
          </div>

          <Footer />

          <ReminderBootstrap />
          <PWAClient />
        </PreferencesProvider>
      </body>
    </html>
  );
}
