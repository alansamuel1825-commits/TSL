"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      "Application error:",
      error,
    );
  }, [error]);

  return (
    <main className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-[#fbfcff] px-5 py-12">
      <div className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700 ring-1 ring-red-100">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
            className="h-7 w-7"
          >
            <path d="M12 3 2.5 20h19L12 3Z" />
            <path d="M12 9v5M12 17.5h.01" />
          </svg>
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
          Something went wrong.
        </h1>

        <p className="mt-4 text-sm leading-7 text-slate-600">
          The page could not be completed right now. You can try again or return to the dashboard.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            Try again
          </button>

          <Link
            href="/dashboard"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
