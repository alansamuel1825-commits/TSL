"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/useAuth";
import {
  getVerifiedAlumni,
} from "@/lib/firebase/firestore";

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

        const results = await getVerifiedAlumni();

        setAlumni(results as Alumni[]);
      } catch (err) {
        console.error(err);
        setError("Unable to load alumni.");
      } finally {
        setLoadingAlumni(false);
      }
    }

    loadAlumni();
  }, [user, loading, router]);

  const universities = useMemo(() => {
    return Array.from(
      new Set(
        alumni
          .map((person) => person.university)
          .filter(Boolean)
      )
    ).sort();
  }, [alumni]);

  const fields = useMemo(() => {
    return Array.from(
      new Set(
        alumni
          .map((person) => person.field)
          .filter(Boolean)
      )
    ).sort();
  }, [alumni]);

  const years = useMemo(() => {
    return Array.from(
      new Set(
        alumni
          .map((person) => person.graduationYear)
          .filter(Boolean)
      )
    ).sort((a, b) => Number(b) - Number(a));
  }, [alumni]);

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

      const matchesSearch =
        !searchTerm ||
        searchableText.includes(searchTerm);

      const matchesUniversity =
        !university ||
        person.university === university;

      const matchesField =
        !field ||
        person.field === field;

      const matchesYear =
        !graduationYear ||
        person.graduationYear === graduationYear;

      const matchesMentorship =
        !mentorsOnly ||
        person.mentorshipAvailable === true;

      return (
        matchesSearch &&
        matchesUniversity &&
        matchesField &&
        matchesYear &&
        matchesMentorship
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

  function clearFilters() {
    setSearch("");
    setUniversity("");
    setField("");
    setGraduationYear("");
    setMentorsOnly(false);
  }

  if (loading || loadingAlumni) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">
          Loading the TSL alumni community...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-12">

        {/* Header */}
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            TSL ALUMNI CONNECT
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
            Explore the TSL community.
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            Discover verified TSL alumni, explore their journeys,
            and find people who can help you take your next step.
          </p>
        </div>

        {/* Search */}
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search by name, university, field, company, expertise..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm outline-none transition focus:border-slate-900 focus:bg-white"
          />

          <div className="mt-4 grid gap-3 md:grid-cols-4">

            <select
              value={university}
              onChange={(event) =>
                setUniversity(event.target.value)
              }
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
            >
              <option value="">All universities</option>

              {universities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={field}
              onChange={(event) =>
                setField(event.target.value)
              }
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
            >
              <option value="">All fields</option>

              {fields.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={graduationYear}
              onChange={(event) =>
                setGraduationYear(event.target.value)
              }
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none"
            >
              <option value="">All years</option>

              {years.map((item) => (
                <option key={item} value={item}>
                  Class of {item}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() =>
                setMentorsOnly((current) => !current)
              }
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                mentorsOnly
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {mentorsOnly
                ? "✓ Mentors only"
                : "Show mentors"}
            </button>
          </div>

          {(search ||
            university ||
            field ||
            graduationYear ||
            mentorsOnly) && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 text-sm font-semibold text-slate-600 underline underline-offset-4"
            >
              Clear filters
            </button>
          )}
        </div>

        {error && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Results */}
        <div className="mt-10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Alumni
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {filteredAlumni.length} verified{" "}
              {filteredAlumni.length === 1
                ? "alumnus"
                : "alumni"}{" "}
              found
            </p>
          </div>
        </div>

        {filteredAlumni.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-12 text-center">
            <h3 className="text-xl font-semibold">
              No alumni found
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Try changing your search or removing a filter.
            </p>

            <button
              onClick={clearFilters}
              className="mt-5 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredAlumni.map((person) => (
              <article
                key={person.id}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl font-bold text-slate-700">
                    {(person.name?.charAt(0) || "?").toUpperCase()}
                  </div>

                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    ✓ Verified
                  </span>
                </div>

                <h3 className="mt-5 text-xl font-bold text-slate-950">
                  {person.name || "TSL Alumni"}
                </h3>

                <p className="mt-1 text-sm font-medium text-slate-700">
                  {person.currentRole ||
                    person.field ||
                    "TSL Alumni"}
                </p>

                {person.company && (
                  <p className="mt-1 text-sm text-slate-500">
                    {person.company}
                  </p>
                )}

                <div className="mt-5 space-y-2 text-sm text-slate-600">
                  {person.university && (
                    <p>
                      🎓 {person.university}
                    </p>
                  )}

                  {person.graduationYear && (
                    <p>
                      📅 Class of {person.graduationYear}
                    </p>
                  )}

                  {person.field && (
                    <p>
                      💡 {person.field}
                    </p>
                  )}
                </div>

                {person.expertise &&
                  person.expertise.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {person.expertise
                        .slice(0, 4)
                        .map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                          >
                            {skill}
                          </span>
                        ))}
                    </div>
                  )}

                {person.mentorshipAvailable && (
                  <div className="mt-5 rounded-2xl bg-slate-50 p-3 text-sm font-medium text-slate-700">
                    🤝 Open to mentorship
                  </div>
                )}

                <button
                  onClick={() =>
                    router.push(`/alumni/${person.id}`)
                  }
                  className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition group-hover:bg-slate-800"
                >
                  View profile
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}