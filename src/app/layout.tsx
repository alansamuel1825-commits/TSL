import type {
  Metadata,
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

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default:
      "The Study Alumni Connect",
    template:
      "%s | The Study Alumni Connect",
  },
  description:
    "A school-community platform connecting current students with verified alumni of The Study L'école Internationale.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#fbfcff] text-slate-950">
        <Navbar />

        <div className="flex-1">
          <AuthGate>
            {children}
          </AuthGate>
        </div>

        <Footer />
      </body>
    </html>
  );
}
