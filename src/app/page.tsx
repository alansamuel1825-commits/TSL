"use client";

import Image from "next/image";
import Link from "next/link";

import { useAuth } from "@/lib/auth/useAuth";

const features = [
  {
    title: "Find your people",
    description:
      "Discover verified alumni across universities, industries, cities, and graduating classes.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
        className="h-6 w-6"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: "Learn from experience",
    description:
      "Request mentorship from alumni who are open to helping students with education, careers, and life beyond school.",
    icon: (
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
    ),
  },
  {
    title: "Stay connected",
    description:
      "Ask questions, continue conversations, and build meaningful relationships within a trusted school community.",
    icon: (
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
    ),
  },
];

const steps = [
  {
    number: "01",
    title: "Join the community",
    description:
      "Create your account as a current student or alumnus of The Study L'école Internationale.",
  },
  {
    number: "02",
    title: "Build your profile",
    description:
      "Tell the community about your interests, experience, education, and the kind of support you can offer or seek.",
  },
  {
    number: "03",
    title: "Connect with purpose",
    description:
      "Discover alumni, request mentorship, ask questions, and begin conversations that matter.",
  },
];

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

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <main className="min-h-screen bg-[#fbfcff] text-slate-950">
      {/* HERO */}
      <section className="relative isolate min-h-[94vh] overflow-hidden">
        <Image
          src="/the-study-campus.webp"
          alt="Aerial view of The Study L'école Internationale campus"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />

        {/* Bright, premium readability treatment */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/88 via-white/55 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-white/24 via-transparent to-white/5" />

        <div
          className="absolute left-[8%] top-[22%] h-72 w-72 rounded-full bg-blue-100/45 blur-3xl"
          aria-hidden="true"
        />

        {/* LANDING NAV */}
        <div className="relative z-10 mx-auto max-w-7xl px-5 pt-5 sm:px-8 lg:px-10">
          <nav className="flex items-center justify-between rounded-[1.55rem] border border-white/70 bg-white/86 px-5 py-4 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.22)] backdrop-blur-xl sm:px-6">
            <Link
              href="/"
              className="flex min-w-0 items-center gap-3"
              aria-label="The Study L'école Internationale Alumni Connect home"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                <Image
                  src="/the-study-logo.png"
                  alt="The Study L'école Internationale logo"
                  fill
                  sizes="56px"
                  className="object-contain p-1"
                />
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-semibold uppercase tracking-[0.17em] text-blue-700 sm:text-[13px]">
                  The Study L&apos;école Internationale
                </p>
                <p className="mt-0.5 truncate text-[15px] font-semibold text-slate-950 sm:text-base">
                  Alumni Connect
                </p>
              </div>
            </Link>

            <div className="hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex">
              <a href="#community" className="transition hover:text-slate-950">
                Community
              </a>
              <a href="#how-it-works" className="transition hover:text-slate-950">
                How it works
              </a>
              <a href="#trust" className="transition hover:text-slate-950">
                Trust & safety
              </a>
            </div>

            <div className="flex items-center gap-2">
              {loading ? (
                <div className="h-10 w-28 animate-pulse rounded-full bg-slate-100" />
              ) : user ? (
                <>
                  <Link
                    href="/alumni"
                    className="hidden rounded-full px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:inline-flex"
                  >
                    Explore alumni
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 sm:px-5"
                  >
                    Dashboard
                    <ArrowRight />
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden rounded-full px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:inline-flex"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 sm:px-5"
                  >
                    Join
                    <ArrowRight />
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>

        <div className="relative z-10 mx-auto flex min-h-[calc(94vh-96px)] max-w-7xl items-center px-5 pb-20 pt-16 sm:px-8 lg:px-10">
          <div className="max-w-3xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 shadow-sm backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Connecting generations of The Study
            </div>

            <h1 className="max-w-3xl tracking-[-0.035em] text-slate-950">
              <span className="block font-serif text-[2.7rem] font-medium leading-[1.02] sm:text-6xl lg:text-[4.4rem]">
                The Study L&apos;école Internationale
              </span>
              <span className="mt-3 block text-5xl font-semibold leading-none tracking-[-0.045em] text-blue-700 sm:text-6xl lg:text-[4.9rem]">
                Alumni Connect
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              A thoughtful network for students and alumni to share experience, seek guidance, build meaningful connections, and keep the spirit of The Study growing beyond the classroom.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              {loading ? (
                <div className="h-12 w-56 animate-pulse rounded-full bg-white/70" />
              ) : user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-700 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_35px_-18px_rgba(29,78,216,0.8)] transition hover:-translate-y-0.5 hover:bg-blue-800"
                  >
                    Continue to dashboard
                    <ArrowRight />
                  </Link>

                  <Link
                    href="/alumni"
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/85 px-6 py-3.5 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-md transition hover:bg-white"
                  >
                    Explore alumni
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-700 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_35px_-18px_rgba(29,78,216,0.8)] transition hover:-translate-y-0.5 hover:bg-blue-800"
                  >
                    Join the community
                    <ArrowRight />
                  </Link>

                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/85 px-6 py-3.5 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-md transition hover:bg-white"
                  >
                    I already have an account
                  </Link>
                </>
              )}
            </div>

            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-slate-600">
              {[
                "Verified alumni profiles",
                "Purposeful mentorship",
                "School-community focused",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                    className="h-4 w-4 text-blue-700"
                  >
                    <circle
                      cx="10"
                      cy="10"
                      r="8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="m6.5 10 2.2 2.2 4.8-5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section id="community" className="bg-white py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                Built for The Study community
              </p>
              <h2 className="mt-5 max-w-xl text-4xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-5xl">
                School may end. The community should not.
              </h2>
            </div>

            <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Alumni Connect brings current students and alumni into one
              thoughtful, trusted network — making it easier to learn from
              lived experience, offer support, and stay connected to the
              community that helped shape us.
            </p>
          </div>

          <div className="mt-16 grid gap-5 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="group rounded-[2rem] border border-slate-200/80 bg-[#fbfcff] p-7 transition duration-300 hover:-translate-y-1 hover:border-blue-100 hover:bg-white hover:shadow-[0_24px_70px_-36px_rgba(15,23,42,0.28)] sm:p-8"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 transition group-hover:bg-blue-700 group-hover:text-white">
                  {feature.icon}
                </div>
                <h3 className="mt-8 text-xl font-semibold tracking-tight text-slate-950">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* IMAGE + PURPOSE */}
      <section className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="overflow-hidden rounded-[2.25rem] border border-slate-200 bg-white shadow-[0_30px_90px_-55px_rgba(15,23,42,0.35)]">
            <div className="grid lg:grid-cols-[1.18fr_0.82fr]">
              <div className="relative min-h-[360px] lg:min-h-[560px]">
                <Image
                  src="/the-study-campus.webp"
                  alt="The Study L'école Internationale campus"
                  fill
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 to-transparent" />
              </div>

              <div className="flex items-center p-8 sm:p-12 lg:p-14">
                <div>
                  <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
                    <Image
                      src="/the-study-logo.png"
                      alt="The Study L'école Internationale logo"
                      fill
                      sizes="80px"
                      className="object-contain p-2"
                    />
                  </div>

                  <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                    Strive to excel. Stay connected.
                  </p>
                  <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
                    A network with a shared beginning.
                  </h2>
                  <p className="mt-5 text-base leading-8 text-slate-600">
                    Whether you are exploring what comes next or looking to
                    give back, this is a place to connect through the common
                    experience of being part of The Study.
                  </p>

                  <Link
                    href="/signup"
                    className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:gap-3 hover:text-blue-800"
                  >
                    Become part of the network
                    <ArrowRight />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHO IT IS FOR */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-[2rem] border border-slate-200 bg-white p-8 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                For students
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
                Learn from people who once stood where you stand.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-8 text-slate-600">
                Explore alumni journeys, ask thoughtful questions, and request
                mentorship when you need perspective on education, careers, or
                what comes after school.
              </p>
              <Link
                href="/signup"
                className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:gap-3"
              >
                Join as a student
                <ArrowRight />
              </Link>
            </article>

            <article className="rounded-[2rem] border border-slate-200 bg-slate-950 p-8 text-white sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
                For alumni
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
                Stay connected. Share what experience has taught you.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-8 text-slate-300">
                Reconnect with The Study community, support current students,
                and make your experience useful to the generations that follow.
              </p>
              <Link
                href="/signup"
                className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-blue-300 transition hover:gap-3"
              >
                Join as an alumnus
                <ArrowRight />
              </Link>
            </article>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
              Simple by design
            </p>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-5xl">
              Three steps to a stronger community.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Alumni Connect is designed to make meaningful connection easy,
              without making the experience feel complicated.
            </p>
          </div>

          <div className="mt-16 grid gap-4 lg:grid-cols-3">
            {steps.map((step) => (
              <article
                key={step.number}
                className="rounded-[2rem] border border-slate-200 bg-white p-7 sm:p-8"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-blue-700">
                    {step.number}
                  </span>
                  <div className="h-px w-14 bg-slate-200" />
                </div>
                <h3 className="mt-12 text-xl font-semibold text-slate-950">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section id="trust" className="bg-slate-950 py-24 text-white sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
              Trust matters
            </p>
            <h2 className="mt-5 max-w-lg text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
              Connection should feel safe, respectful, and purposeful.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Verified alumni",
                description:
                  "Alumni profiles are reviewed before they are opened to the wider community.",
              },
              {
                title: "Built-in safeguards",
                description:
                  "Reporting and blocking tools help members respond when an interaction does not feel right.",
              },
              {
                title: "Private conversations",
                description:
                  "Mentorship conversations are available only to the people involved and authorized moderators.",
              },
              {
                title: "Community standards",
                description:
                  "The platform is designed around respectful guidance, appropriate conduct, and school oversight.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[1.7rem] border border-white/10 bg-white/[0.055] p-6"
              >
                <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/15 text-blue-300 ring-1 ring-blue-300/20">
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                    className="h-4 w-4"
                  >
                    <path
                      d="m5.5 10 2.8 2.8 6.2-6.3"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-red-50 px-6 py-16 text-center shadow-[0_30px_90px_-55px_rgba(37,99,235,0.35)] sm:px-12 sm:py-20">
            <div
              className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-100/60 blur-3xl"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-red-100/60 blur-3xl"
              aria-hidden="true"
            />

            <div className="relative mx-auto max-w-2xl">
              <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                <Image
                  src="/the-study-logo.png"
                  alt=""
                  fill
                  sizes="80px"
                  className="object-contain p-2"
                />
              </div>

              <h2 className="mt-7 text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
                One school. Many journeys. One community.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-slate-600">
                Join The Study L&apos;école Internationale Alumni Connect and
                help turn shared experience into meaningful support.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-700 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  Create an account
                  <ArrowRight />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-7 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
              <Image
                src="/the-study-logo.png"
                alt=""
                fill
                sizes="40px"
                className="object-contain p-1"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-950">
                The Study L&apos;école Internationale
              </p>
              <p className="mt-0.5 text-xs text-slate-500">Alumni Connect</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
            <Link href="/login" className="transition hover:text-slate-950">
              Sign in
            </Link>
            <Link href="/signup" className="transition hover:text-slate-950">
              Join
            </Link>
            <a href="#trust" className="transition hover:text-slate-950">
              Trust & safety
            </a>
          </div>

          <p className="text-xs text-slate-400">
            Built for The Study community.
          </p>
        </div>
      </footer>
    </main>
  );
}
