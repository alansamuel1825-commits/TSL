import type { ReactNode } from "react";
import Link from "next/link";

export default function PolicyShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-[calc(100vh-76px)] bg-[#fbfcff]">
      <div className="mx-auto max-w-4xl px-5 py-12 sm:px-6 lg:px-8 lg:py-16">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
            {eyebrow}
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
            {title}
          </h1>

          <p className="mt-5 text-base leading-8 text-slate-600">
            {intro}
          </p>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            This is a product-stage draft for school review. The school should approve final policy wording, responsibilities, retention periods and safeguarding procedures before public launch.
          </div>
        </header>

        <article className="mt-10 space-y-8 rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-8 lg:p-10">
          {children}
        </article>

        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          <Link
            href="/help"
            className="font-semibold text-blue-700 transition hover:text-blue-800 hover:underline"
          >
            Need help?
          </Link>

          <Link
            href="/guidelines"
            className="font-semibold text-slate-600 transition hover:text-slate-950 hover:underline"
          >
            Community Guidelines
          </Link>
        </div>
      </div>
    </main>
  );
}

export function PolicySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-[-0.02em] text-slate-950">
        {title}
      </h2>

      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">
        {children}
      </div>
    </section>
  );
}
