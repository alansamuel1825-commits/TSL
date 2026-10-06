"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth/useAuth";
import { logOut } from "@/lib/firebase/auth";
import {
  subscribeToUnreadNotificationCount,
} from "@/lib/firebase/firestore";

const loggedOutLinks = [
  { name: "Explore Alumni", href: "/alumni" },
];

const loggedInLinks = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Alumni", href: "/alumni" },
  { name: "Projects", href: "/projects" },
  { name: "Hub", href: "/hub" },
  { name: "Assist", href: "/assist" },
  { name: "Mentorship", href: "/mentorship" },
  { name: "Messages", href: "/messages" },
  { name: "Ask", href: "/ask" },
  { name: "Settings", href: "/settings" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (
      !user ||
      !user.emailVerified
    ) {
      setUnreadNotifications(0);
      return;
    }

    const unsubscribe =
      subscribeToUnreadNotificationCount(
        user.uid,
        setUnreadNotifications
      );

    return unsubscribe;
  }, [user]);

  // The homepage has its own landing-page navigation.
  if (pathname === "/") {
    return null;
  }

  const links = user ? loggedInLinks : loggedOutLinks;

  async function handleSignOut() {
    setMobileOpen(false);
    await logOut();
    router.push("/login");
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/92 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-5 px-5 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-3"
          aria-label="The Study L'école Internationale Alumni Connect home"
        >
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-slate-200 transition group-hover:ring-blue-200">
            <Image
              src="/the-study-logo.png"
              alt="The Study L'école Internationale logo"
              fill
              sizes="48px"
              className="object-contain p-1"
            />
          </div>

          <div className="min-w-0 leading-tight">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700 sm:text-xs">
              The Study L&apos;école Internationale
            </p>
            <p className="mt-1 truncate text-sm font-semibold tracking-tight text-slate-950 sm:text-[15px]">
              Alumni Connect
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {links.map((link) => {
            const active = isActive(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  "rounded-full px-4 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                ].join(" ")}
              >
                {link.name}
              </Link>
            );
          })}

          {user && (
            <Link
              href="/notifications"
              aria-label={
                unreadNotifications > 0
                  ? `${unreadNotifications} unread notifications`
                  : "Notifications"
              }
              className={[
                "relative ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full border transition",
                isActive("/notifications")
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950",
              ].join(" ")}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>

              {unreadNotifications > 0 && (
                <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                  {unreadNotifications > 99
                    ? "99+"
                    : unreadNotifications}
                </span>
              )}
            </Link>
          )}

          <div className="ml-2 h-6 w-px bg-slate-200" />

          {loading ? (
            <div
              className="ml-2 h-10 w-24 animate-pulse rounded-full bg-slate-100"
              aria-label="Loading account"
            />
          ) : user ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="ml-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Sign out
            </button>
          ) : (
            <div className="ml-2 flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-full px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
              >
                Sign in
              </Link>

              <Link
                href="/signup"
                className="rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
              >
                Join
              </Link>
            </div>
          )}
        </nav>

        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 transition hover:bg-slate-50 lg:hidden"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <nav
            className="mx-auto max-w-7xl px-5 py-4 sm:px-6"
            aria-label="Mobile navigation"
          >
            <div className="grid gap-1">
              {links.map((link) => {
                const active = isActive(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={[
                      "rounded-2xl px-4 py-3 text-sm font-medium transition",
                      active
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>

            {user && (
              <Link
                href="/notifications"
                onClick={() => setMobileOpen(false)}
                className={[
                  "mt-2 flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition",
                  isActive("/notifications")
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                <span>Notifications</span>

                {unreadNotifications > 0 && (
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                    {unreadNotifications > 99
                      ? "99+"
                      : unreadNotifications}
                  </span>
                )}
              </Link>
            )}

            <div className="mt-4 border-t border-slate-200 pt-4">
              {loading ? (
                <div className="h-11 w-full animate-pulse rounded-2xl bg-slate-100" />
              ) : user ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  Sign out
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-2xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                  >
                    Sign in
                  </Link>

                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-2xl bg-blue-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-800"
                  >
                    Join
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
