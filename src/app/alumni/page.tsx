"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/useAuth";
import { getVerifiedAlumni } from "@/lib/firebase/firestore";

type Alumni = {
  id: string;
  name?: string;
  university?: string;
  degree?: string;
  field?: string;
  graduationYear?: string;
  currentRole?: string;
  company?: string;
  expertise?: string[];
  bio?: string;
  mentorshipAvailable?: boolean;
  verificationStatus?: string;
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" className="h-5 w-5">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-4 w-4">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-3.5 w-3.5">
      <path d="m5.5 10 2.6 2.6 6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AlumniDirectoryPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [loadingAlumni, setLoadingAlumni] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [university, setUniversity] = useState("");
  const [field, setField] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [mentorsOnly, setMentorsOnly] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    async function loadAlumni() {
      try {
        setLoadingAlumni(true);
        setError("");

        const results = await getVerifiedAlumni();
        setAlumni(results as Alumni[]);
      } catch (err) {
        console.error(err);
        setError("Unable to load the alumni community right now.");
      } finally {
        setLoadingAlumni(false);
      }
    }

    loadAlumni();
  }, [user, loading, router]);

  const universities = useMemo(
    () =>
      Array.from(
        new Set(
          alumni
            .map((person) => person.university)
            .filter((item): item is string => Boolean(item)),
        ),
      ).sort(),
    [alumni],
  );

  const fields = useMemo(
    () =>
      Array.from(
        new Set(
          alumni
            .map((person) => person.field)
            .filter((item): item is string => Boolean(item)),
        ),
      ).sort(),
    [alumni],
  );

  const years = useMemo(
    () =>
      Array.from(
        new Set(
          alumni
            .map((person) => person.graduationYear)
            .filter((item): item is string => Boolean(item)),
        ),
      ).sort((a, b) => Number(b) - Number(a)),
    [alumni],
  );

  const filteredAlumni = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return alumni.filter((person) => {
      const searchableText = [
        person.name,
        person.university,
        person.degree,
        person.field,
        person.currentRole,
        person.company,
        ...(person.expertise ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!searchTerm || searchableText.includes(searchTerm)) &&
        (!university || person.university === university) &&
        (!field || person.field === field) &&
        (!graduationYear || person.graduationYear === graduationYear) &&
        (!mentorsOnly || person.mentorshipAvailable === true)
      );
    });
  }, [
    alumni,
    search,
    university,
    field,
    graduationYear,
    mentorsOnly,
  ]);

  const activeFilters = Boolean(
    search ||
      university ||
      field ||
      graduationYear ||
      mentorsOnly,
  );

  function clearFilters() {
    setSearch("");
    setUniversity("");
    setField("");
    setGraduationYear("");
    setMentorsOnly(false);
  }

  if (loading || loadingAlumni) {
    return (
      <main className="min-h-[calc(100vh-76px)] bg-[#fbfcff]">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-4 w-44 rounded-full bg-slate-200" />
            <div className="mt-5 h-12 w-96 max-w-full rounded-2xl bg-slate-200" />
            <div className="mt-4 h-5 w-[34rem] max-w-full rounded-full bg-slate-100" />
            <div className="mt-10 h-40 rounded-[2rem] bg-white ring-1 ring-slate-200" />
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="h-80 rounded-[2rem] bg-white ring-1 ring-slate-200" />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-[calc(100vh-76px)] bg-[#fbfcff]">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
            The Study L&apos;école Internationale Alumni Connect
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
            Explore the alumni community.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
            Discover verified alumni, learn from their journeys, and find people whose experience can help you take your next step.
          </p>
        </header>

        <section className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)] sm:p-6">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <SearchIcon />
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, university, field, company, or expertise..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <select
              value={university}
              onChange={(event) => setUniversity(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="">All universities</option>
              {universities.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <select
              value={field}
              onChange={(event) => setField(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="">All fields</option>
              {fields.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <select
              value={graduationYear}
              onChange={(event) => setGraduationYear(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="">All years</option>
              {years.map((item) => (
                <option key={item} value={item}>Class of {item}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setMentorsOnly((current) => !current)}
              className={[
                "rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                mentorsOnly
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              {mentorsOnly ? "Mentors only ✓" : "Open to mentorship"}
            </button>
          </div>

          {activeFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 text-sm font-semibold text-blue-700 transition hover:text-blue-800 hover:underline"
            >
              Clear all filters
            </button>
          )}
        </section>

        {error && (
          <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="mt-10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-950">
                Verified alumni
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {filteredAlumni.length} {filteredAlumni.length === 1 ? "profile" : "profiles"} found
              </p>
            </div>

            <p className="text-xs font-medium text-slate-400">
              Only verified alumni are shown here.
            </p>
          </div>

          {filteredAlumni.length === 0 ? (
            <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-10 text-center sm:p-14">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <SearchIcon />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-950">
                No alumni found
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-500">
                Try changing your search terms or removing one of the filters.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredAlumni.map((person) => (
                <article
                  key={person.id}
                  className="group flex flex-col rounded-[2rem] border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-blue-100 hover:shadow-[0_24px_70px_-38px_rgba(15,23,42,0.28)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-slate-100 text-xl font-semibold text-blue-800 ring-1 ring-blue-100">
                      {(person.name?.charAt(0) || "?").toUpperCase()}
                    </div>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                      <CheckIcon />
                      Verified
                    </span>
                  </div>

                  <h3 className="mt-6 text-xl font-semibold tracking-tight text-slate-950">
                    {person.name || "The Study Alumni"}
                  </h3>

                  <p className="mt-1.5 text-sm font-medium text-slate-700">
                    {person.currentRole || person.field || "Alumni member"}
                  </p>

                  {person.company && (
                    <p className="mt-1 text-sm text-slate-500">
                      {person.company}
                    </p>
                  )}

                  <div className="mt-5 space-y-2.5 text-sm text-slate-600">
                    {person.university && (
                      <p>
                        <span className="font-medium text-slate-800">University:</span>{" "}
                        {person.university}
                      </p>
                    )}

                    {person.graduationYear && (
                      <p>
                        <span className="font-medium text-slate-800">The Study:</span>{" "}
                        Class of {person.graduationYear}
                      </p>
                    )}

                    {person.field && (
                      <p>
                        <span className="font-medium text-slate-800">Field:</span>{" "}
                        {person.field}
                      </p>
                    )}
                  </div>

                  {person.expertise && person.expertise.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {person.expertise.slice(0, 4).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto pt-6">
                    {person.mentorshipAvailable && (
                      <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm font-medium text-blue-800">
                        Open to mentorship
                      </div>
                    )}

                    <Link
                      href={`/alumni/${person.id}`}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition group-hover:bg-blue-700"
                    >
                      View profile
                      <ArrowRight />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
