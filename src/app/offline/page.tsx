import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12 sm:px-6">
      <section className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-700">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-7 w-7"
            aria-hidden="true"
          >
            <path d="M5.5 8.5A10 10 0 0112 6c2.4 0 4.6.8 6.4 2.2" />
            <path d="M8.5 12a5.5 5.5 0 017 0" />
            <path d="M11.2 15.4a1.4 1.4 0 011.6 0" />
            <path d="M3 3l18 18" />
          </svg>
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
          TSL Alumni Connect
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
          You&apos;re offline
        </h1>

        <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-slate-600">
          Alumni Connect keeps private account pages network-first, so messages, mentorship data and other sensitive information are not stored as offline page copies by the service worker.
        </p>

        <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-slate-500">
          Reconnect to the internet and try again. You can keep this page open; the app will tell you when your connection returns.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            Try dashboard
          </Link>

          <Link
            href="/"
            className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Go home
          </Link>
        </div>
      </section>
    </main>
  );
}
