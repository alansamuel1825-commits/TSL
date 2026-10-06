"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  useAuth,
} from "@/lib/auth/useAuth";

import {
  getPublicUserProfile,
  getPublishedProjects,
  PROJECT_CATEGORIES,
  type Project,
  type ProjectCategory,
  type PublicUserProfile,
} from "@/lib/firebase/firestore";

type CategoryFilter =
  | "All"
  | ProjectCategory;

export default function ProjectsPage() {
  const router =
    useRouter();

  const {
    user,
    loading,
  } = useAuth();

  const [
    projects,
    setProjects,
  ] =
    useState<Project[]>([]);

  const [
    owners,
    setOwners,
  ] =
    useState<
      Record<
        string,
        PublicUserProfile | null
      >
    >({});

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    category,
    setCategory,
  ] =
    useState<CategoryFilter>(
      "All"
    );

  const [
    collaborationOnly,
    setCollaborationOnly,
  ] = useState(false);

  const [
    mentorshipOnly,
    setMentorshipOnly,
  ] = useState(false);

  const [
    loadingProjects,
    setLoadingProjects,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace(
        "/login"
      );
      return;
    }

    let cancelled =
      false;

    async function loadProjects() {
      setLoadingProjects(
        true
      );
      setError("");

      try {
        const results =
          await getPublishedProjects();

        if (cancelled) {
          return;
        }

        setProjects(results);

        const ownerIds =
          Array.from(
            new Set(
              results.map(
                (project) =>
                  project.ownerId
              )
            )
          );

        const entries =
          await Promise.all(
            ownerIds.map(
              async (ownerId) =>
                [
                  ownerId,
                  await getPublicUserProfile(
                    ownerId
                  ),
                ] as const
            )
          );

        if (!cancelled) {
          setOwners(
            Object.fromEntries(
              entries
            )
          );
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(
            "Unable to load community projects right now."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingProjects(
            false
          );
        }
      }
    }

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    loading,
    router,
  ]);

  const filtered =
    useMemo(() => {
      const needle =
        search
          .trim()
          .toLowerCase();

      return projects.filter(
        (project) => {
          const owner =
            owners[
              project.ownerId
            ];

          const matchesSearch =
            !needle ||
            [
              project.title,
              project.summary,
              project.category,
              project.role,
              project.outcome,
              project.technologies.join(
                " "
              ),
              owner?.displayName ||
                "",
            ]
              .join(" ")
              .toLowerCase()
              .includes(
                needle
              );

          const matchesCategory =
            category ===
              "All" ||
            project.category ===
              category;

          const matchesCollaboration =
            !collaborationOnly ||
            project.collaborationWanted;

          const matchesMentorship =
            !mentorshipOnly ||
            project.mentorshipWanted;

          return (
            matchesSearch &&
            matchesCategory &&
            matchesCollaboration &&
            matchesMentorship
          );
        }
      );
    }, [
      projects,
      owners,
      search,
      category,
      collaborationOnly,
      mentorshipOnly,
    ]);

  if (
    loading ||
    loadingProjects
  ) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500">
          Loading projects...
        </p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-8 px-6 py-8 md:px-9 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10 lg:py-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Community portfolio
              </p>

              <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Projects built by the TSL community
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                Share what you are building, discover other students and alumni working on meaningful ideas, and find opportunities for mentorship or collaboration.
              </p>

              <p className="mt-3 text-xs leading-5 text-slate-400">
                Published projects are visible only inside the signed-in TSL Alumni Connect community.
              </p>
            </div>

            <Link
              href="/projects/manage"
              className="inline-flex items-center justify-center rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
            >
              Manage my projects
            </Link>
          </div>
        </section>

        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_auto_auto] lg:items-end">
            <label>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Search projects
              </span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Title, technology, category, person..."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </label>

            <label>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Category
              </span>

              <select
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target
                      .value as CategoryFilter
                  )
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="All">
                  All categories
                </option>

                {PROJECT_CATEGORIES.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={
                  collaborationOnly
                }
                onChange={(event) =>
                  setCollaborationOnly(
                    event.target.checked
                  )
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              Collaboration
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={
                  mentorshipOnly
                }
                onChange={(event) =>
                  setMentorshipOnly(
                    event.target.checked
                  )
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              Wants mentorship
            </label>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Community showcase
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {filtered.length}{" "}
              {filtered.length ===
              1
                ? "project"
                : "projects"}
            </p>
          </div>
        </div>

        {filtered.length ===
        0 ? (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-slate-950">
              No matching projects
            </h3>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              Try a different search or filter, or add the first project that matches this area.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(
              (project) => {
                const owner =
                  owners[
                    project.ownerId
                  ];

                return (
                  <article
                    key={
                      project.id
                    }
                    className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {
                          project.category
                        }
                      </span>

                      {project.collaborationWanted && (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Open to collaboration
                        </span>
                      )}

                      {project.mentorshipWanted && (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          Seeking mentorship
                        </span>
                      )}
                    </div>

                    <h3 className="mt-5 text-xl font-bold tracking-tight text-slate-950">
                      {project.title}
                    </h3>

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                      {project.summary}
                    </p>

                    {project.technologies.length >
                      0 && (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {project.technologies
                          .slice(
                            0,
                            5
                          )
                          .map(
                            (
                              technology
                            ) => (
                              <span
                                key={
                                  technology
                                }
                                className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                              >
                                {
                                  technology
                                }
                              </span>
                            )
                          )}
                      </div>
                    )}

                    <div className="mt-auto pt-6">
                      <div className="flex items-center gap-3 border-t border-slate-100 pt-5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-700">
                          {(
                            owner
                              ?.displayName
                              ?.charAt(
                                0
                              ) ||
                            "?"
                          ).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {owner
                              ?.displayName ||
                              "TSL community member"}
                          </p>

                          <p className="mt-0.5 text-xs capitalize text-slate-400">
                            {owner
                              ?.role ||
                              "member"}
                            {project.role
                              ? ` · ${project.role}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`/projects/${project.id}`}
                        className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition group-hover:bg-blue-700"
                      >
                        View project
                      </Link>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </div>
    </main>
  );
}
