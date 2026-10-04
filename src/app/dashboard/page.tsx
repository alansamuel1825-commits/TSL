"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/useAuth";
import {
  getUserProfile,
  type UserProfile,
} from "@/lib/firebase/firestore";

function ArrowRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
      className="h-6 w-6"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2.3 4.7-4.7 2.3 2.3-4.7 4.7-2.3Z" />
    </svg>
  );
}

function MentorshipIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
      className="h-6 w-6"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
      className="h-6 w-6"
    >
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
      <path d="M8 9h8M8 13h5" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
      className="h-6 w-6"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9a2.5 2.5 0 0 1 4.8 1c0 1.8-2.4 2.1-2.4 4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function getFirstName(profile: UserProfile | null, email?: string | null) {
  const displayName = profile?.displayName?.trim();

  if (displayName) {
    return displayName.split(/\s+/)[0];
  }

  if (email) {
    const emailName = email.split("@")[0].trim();
    if (emailName) {
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
  }

  return "there";
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!user) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      try {
        const result = await getUserProfile(user.uid);

        if (!cancelled) {
          setProfile(result);
        }
      } catch (error) {
        console.error("Unable to load dashboard profile:", error);
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    if (!loading) {
      loadProfile();
    }

    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  if (loading || profileLoading) {
    return (
      <main className="min-h-[calc(100vh-76px)] bg-[#fbfcff]">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="animate-pulse">
            <div className="h-4 w-40 rounded-full bg-slate-200" />
            <div className="mt-5 h-12 w-80 max-w-full rounded-2xl bg-slate-200" />
            <div className="mt-4 h-5 w-96 max-w-full rounded-full bg-slate-100" />
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-64 rounded-[2rem] border border-slate-200 bg-white"
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-[#fbfcff]">
        <p className="text-sm text-slate-500">Redirecting to sign in...</p>
      </main>
    );
  }

  const firstName = getFirstName(profile, user.email);
  const roleLabel = profile?.role === "alumni" ? "Alumni member" : "Student member";
  const isAlumni = profile?.role === "alumni";

  const primaryActions = [
    {
      title: "Explore Alumni",
      description:
        "Discover verified alumni across universities, industries, and graduating classes.",
      href: "/alumni",
      cta: "Browse the network",
      icon: <CompassIcon />,
    },
    {
      title: "Mentorship",
      description: isAlumni
        ? "Review mentorship requests and support students who are looking for guidance."
        : "Request guidance from alumni and keep track of your mentorship connections.",
      href: "/mentorship",
      cta: "Open mentorship",
      icon: <MentorshipIcon />,
    },
    {
      title: "Messages",
      description:
        "Continue private conversations with the people you are connected with.",
      href: "/messages",
      cta: "Open messages",
      icon: <MessageIcon />,
    },
    {
      title: "Ask an Alumni",
      description: isAlumni
        ? "Share your experience by answering thoughtful questions from students."
        : "Ask the community a thoughtful question and learn from alumni experience.",
      href: "/ask",
      cta: isAlumni ? "View questions" : "Ask a question",
      icon: <QuestionIcon />,
    },
  ];

  return (
    <main className="min-h-[calc(100vh-76px)] bg-[#fbfcff]">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
        {/* WELCOME HERO */}
        <section className="relative overflow-hidden rounded-[2.25rem] border border-slate-200 bg-white shadow-[0_28px_90px_-60px_rgba(15,23,42,0.35)]">
          <div className="absolute inset-y-0 right-0 hidden w-[46%] lg:block">
            <Image
              src="/the-study-campus.webp"
              alt=""
              fill
              sizes="46vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/45 to-transparent" />
          </div>

          <div
            className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-blue-100/70 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative max-w-3xl px-7 py-10 sm:px-10 sm:py-12 lg:px-12 lg:py-14">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                {roleLabel}
              </span>

              {profile?.role === "alumni" && profile.status === "active" ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                  Verified community member
                </span>
              ) : null}
            </div>

            <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
              The Study L&apos;école Internationale Alumni Connect
            </p>

            <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
              Welcome back, {firstName}.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-8 text-slate-600">
              {isAlumni
                ? "Your experience can make someone else's next step clearer. Explore the community, respond to students, and stay connected to The Study."
                : "Explore the alumni community, learn from experience, and make the most of the connections available to you."}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/alumni"
                className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-800"
              >
                Explore alumni
                <ArrowRight />
              </Link>

              <Link
                href="/mentorship"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                View mentorship
              </Link>
            </div>
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section className="mt-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Your community
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-3xl">
                What would you like to do?
              </h2>
            </div>

            <p className="max-w-md text-sm leading-6 text-slate-500">
              Everything you need to connect, learn, and contribute is a step
              away.
            </p>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {primaryActions.map((action) => (
              <DashboardCard
                key={action.href}
                {...action}
              />
            ))}
          </div>
        </section>

        {/* COMMUNITY NOTE */}
        <section className="mt-12 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 sm:p-9">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                aria-hidden="true"
                className="h-5 w-5"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              </svg>
            </div>

            <h2 className="mt-6 text-2xl font-semibold tracking-[-0.025em] text-slate-950">
              A trusted community, built around meaningful connection.
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Alumni profiles are reviewed before verification, and members
              have access to reporting and blocking tools so that conversations
              can remain respectful and appropriate.
            </p>
          </div>

          <div className="rounded-[2rem] bg-slate-950 p-7 text-white sm:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
              Account
            </p>

            <h2 className="mt-4 text-xl font-semibold">Signed in as</h2>

            <p className="mt-2 break-all text-sm leading-6 text-slate-300">
              {user.email ?? "Google account"}
            </p>

            <div className="mt-7 h-px bg-white/10" />

            <p className="mt-6 text-sm leading-7 text-slate-400">
              Keep your profile information accurate so other members know who
              they are connecting with.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function DashboardCard({
  title,
  description,
  href,
  cta,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-64 flex-col rounded-[2rem] border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-blue-100 hover:shadow-[0_24px_70px_-38px_rgba(15,23,42,0.28)]"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 transition group-hover:bg-blue-700 group-hover:text-white">
        {icon}
      </div>

      <h3 className="mt-7 text-lg font-semibold tracking-tight text-slate-950">
        {title}
      </h3>

      <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">
        {description}
      </p>

      <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition group-hover:gap-3">
        {cta}
        <ArrowRight />
      </span>
    </Link>
  );
}
