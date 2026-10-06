"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  useAuth,
} from "@/lib/auth/useAuth";

import {
  getProject,
  getPublicUserProfile,
  type Project,
  type PublicUserProfile,
} from "@/lib/firebase/firestore";

export default function ProjectDetailPage() {
  const params =
    useParams();

  const router =
    useRouter();

  const {
    user,
    loading,
  } = useAuth();

  const projectId =
    typeof params.id ===
    "string"
      ? params.id
      : "";

  const [
    project,
    setProject,
  ] =
    useState<
      Project | null
    >(null);

  const [
    owner,
    setOwner,
  ] =
    useState<
      PublicUserProfile | null
    >(null);

  const [
    loadingProject,
    setLoadingProject,
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

    if (!projectId) {
      setError(
        "Invalid project."
      );
      setLoadingProject(
        false
      );
      return;
    }

    let cancelled =
      false;

    async function loadProject() {
      try {
        const result =
          await getProject(
            projectId
          );

        if (!result) {
          if (!cancelled) {
            setError(
              "This project could not be found."
            );
          }
          return;
        }

        const ownerProfile =
          await getPublicUserProfile(
            result.ownerId
          );

        if (!cancelled) {
          setProject(result);
          setOwner(
            ownerProfile
          );
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(
            "This project is unavailable or you do not have permission to view it."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingProject(
            false
          );
        }
      }
    }

    loadProject();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    loading,
    projectId,
    router,
  ]);

  if (
    loading ||
    loadingProject
  ) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500">
          Loading project...
        </p>
      </main>
    );
  }

  if (
    !user
  ) {
    return null;
  }

  if (
    error ||
    !project
  ) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/projects"
            className="text-sm font-semibold text-slate-600 hover:text-slate-950"
          >
            ← Back to projects
          </Link>

          <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-slate-950">
              Project unavailable
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              {error ||
                "We could not find this project."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const isOwner =
    project.ownerId ===
    user.uid;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/projects"
            className="text-sm font-semibold text-slate-600 transition hover:text-slate-950"
          >
            ← Community projects
          </Link>

          {isOwner && (
            <Link
              href="/projects/manage"
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Manage projects
            </Link>
          )}
        </div>

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="bg-slate-950 px-6 py-9 text-white sm:px-9 lg:px-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                {project.category}
              </span>

              {project.status ===
                "draft" && (
                <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-200">
                  Private draft preview
                </span>
              )}

              {project.collaborationWanted && (
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                  Open to collaboration
                </span>
              )}

              {project.mentorshipWanted && (
                <span className="rounded-full bg-blue-400/15 px-3 py-1 text-xs font-semibold text-blue-200">
                  Seeking mentorship
                </span>
              )}
            </div>

            <h1 className="mt-5 max-w-4xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {project.title}
            </h1>

            {project.summary && (
              <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                {project.summary}
              </p>
            )}
          </div>

          <div className="grid gap-8 px-6 py-8 sm:px-9 lg:grid-cols-[1fr_300px] lg:px-10 lg:py-10">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                About the project
              </h2>

              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">
                {project.description ||
                  "This draft does not have a full description yet."}
              </p>

              {project.outcome && (
                <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Outcome / impact
                  </h3>

                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
                    {project.outcome}
                  </p>
                </div>
              )}

              {project.technologies.length >
                0 && (
                <div className="mt-8">
                  <h3 className="text-sm font-semibold text-slate-950">
                    Technologies &amp; skills
                  </h3>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {project.technologies.map(
                      (
                        technology
                      ) => (
                        <span
                          key={
                            technology
                          }
                          className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
                        >
                          {technology}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

              {(project.projectUrl ||
                project.repositoryUrl) && (
                <div className="mt-8 flex flex-wrap gap-3">
                  {project.projectUrl && (
                    <a
                      href={
                        project.projectUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
                    >
                      Open project ↗
                    </a>
                  )}

                  {project.repositoryUrl && (
                    <a
                      href={
                        project.repositoryUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      View repository ↗
                    </a>
                  )}
                </div>
              )}
            </div>

            <aside className="space-y-5">
              <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Created by
                </p>

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-lg font-bold text-slate-700 ring-1 ring-slate-200">
                    {(
                      owner
                        ?.displayName
                        ?.charAt(
                          0
                        ) ||
                      "?"
                    ).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">
                      {owner
                        ?.displayName ||
                        "TSL community member"}
                    </p>

                    <p className="mt-0.5 text-xs capitalize text-slate-500">
                      {owner?.role ||
                        "member"}
                    </p>
                  </div>
                </div>

                {project.role && (
                  <div className="mt-5 border-t border-slate-200 pt-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Role in project
                    </p>

                    <p className="mt-2 text-sm font-medium text-slate-800">
                      {project.role}
                    </p>
                  </div>
                )}

                {owner?.role ===
                  "alumni" && (
                  <Link
                    href={`/alumni/${project.ownerId}`}
                    className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-800"
                  >
                    View alumni profile →
                  </Link>
                )}
              </section>

              {(project.collaborationWanted ||
                project.mentorshipWanted) && (
                <section className="rounded-3xl border border-blue-100 bg-blue-50 p-6">
                  <h2 className="text-sm font-semibold text-blue-900">
                    Project needs
                  </h2>

                  <div className="mt-3 space-y-2 text-sm leading-6 text-blue-800">
                    {project.collaborationWanted && (
                      <p>
                        • Open to project collaboration inside the TSL community.
                      </p>
                    )}

                    {project.mentorshipWanted && (
                      <p>
                        • Looking for guidance, feedback or technical mentorship.
                      </p>
                    )}
                  </div>

                  <p className="mt-4 text-xs leading-5 text-blue-700">
                    Use Alumni Connect&apos;s existing on-platform mentorship and messaging workflows rather than posting private contact details.
                  </p>
                </section>
              )}
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
