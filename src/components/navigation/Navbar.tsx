"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/useAuth";
import { logOut } from "@/lib/firebase/auth";

const loggedOutLinks = [{ name: "Explore Alumni", href: "/alumni" }];

const loggedInLinks = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Explore Alumni", href: "/alumni" },
  { name: "Mentorship", href: "/mentorship" },
  { name: "Messages", href: "/messages" },
  { name: "Ask", href: "/ask" },
];

export default function Navbar() {
  const router = useRouter();
  const { user, loading } = useAuth();

  async function handleSignOut() {
    await logOut();
    router.push("/login");
  }

  const links = user ? loggedInLinks : loggedOutLinks;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="group">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
              T
            </div>

            <div className="leading-none">
              <div className="font-semibold tracking-tight">TSL</div>

              <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                Alumni Connect
              </div>
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-slate-600 transition hover:text-slate-950"
            >
              {link.name}
            </Link>
          ))}

          {loading ? null : user ? (
            <button
              onClick={handleSignOut}
              className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Sign in
            </Link>
          )}
        </nav>

        {loading ? null : user ? (
          <button
            onClick={handleSignOut}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 md:hidden"
          >
            Sign out
          </button>
        ) : (
          <Link
            href="/login"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white md:hidden"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}