"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/useAuth";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading your TSL account...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Redirecting to sign in...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            TSL Alumni Connect
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Welcome back 👋
          </h1>

          <p className="mt-3 text-slate-600">
            Signed in as {user.email ?? "your Google account"}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <DashboardCard
            emoji="🔎"
            title="Explore Alumni"
            description="Find alumni by university, field, location and more."
            cta="Explore →"
            onClick={() => router.push("/alumni")}
          />

          <DashboardCard
            emoji="🤝"
            title="Mentorship"
            description="Manage your mentorship requests and connections."
            cta="View mentorship →"
            onClick={() => router.push("/mentorship")}
          />

          <DashboardCard
            emoji="💬"
            title="Messages"
            description="Chat with the people you're connected with."
            cta="Open messages →"
            onClick={() => router.push("/messages")}
          />
        </div>
      </div>
    </main>
  );
}

function DashboardCard({
  emoji,
  title,
  description,
  cta,
  onClick,
}: {
  emoji: string;
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-7 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
        {emoji}
      </div>

      <h2 className="mt-5 text-lg font-bold text-slate-950">{title}</h2>

      <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
        {description}
      </p>

      <p className="mt-5 text-sm font-semibold text-slate-950 transition group-hover:translate-x-1">
        {cta}
      </p>
    </button>
  );
}