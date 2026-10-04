import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-[#fbfcff] px-5 py-12">
      <div className="w-full max-w-xl text-center">
        <div className="relative mx-auto h-16 w-16 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
          <Image
            src="/the-study-logo.png"
            alt="The Study L'école Internationale logo"
            fill
            sizes="64px"
            className="object-contain p-1.5"
          />
        </div>

        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
          Error 404
        </p>

        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
          We couldn&apos;t find that page.
        </h1>

        <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-slate-600">
          The link may be outdated, or the page may have moved.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            Go to dashboard
          </Link>

          <Link
            href="/"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
