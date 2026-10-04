"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/useAuth";
import {
  acceptMentorshipRequest,
  getMentorshipRequestsForAlumni,
  getMentorshipRequestsForStudent,
  getPublicUserProfile,
  getUserProfile,
  updateMentorshipRequest,
} from "@/lib/firebase/firestore";

type MentorshipRequestView = {
  id: string;
  studentId: string;
  alumniId: string;
  message?: string;
  status?: string;
};

type Person = {
  name?: string;
};

type ViewerRole = "student" | "alumni" | null;

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

function UsersIcon() {
  return (
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
  );
}

function statusClasses(status?: string) {
  switch (status) {
    case "accepted":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "declined":
      return "bg-red-50 text-red-700 ring-red-100";
    case "cancelled":
      return "bg-slate-100 text-slate-600 ring-slate-200";
    default:
      return "bg-amber-50 text-amber-700 ring-amber-100";
  }
}

function statusLabel(status?: string) {
  switch (status) {
    case "accepted":
      return "Accepted";
    case "declined":
      return "Declined";
    case "cancelled":
      return "Cancelled";
    default:
      return "Pending";
  }
}

export default function MentorshipPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [viewerRole, setViewerRole] =
    useState<ViewerRole>(null);
  const [requests, setRequests] =
    useState<MentorshipRequestView[]>([]);
  const [people, setPeople] =
    useState<Record<string, Person>>({});
  const [loadingRequests, setLoadingRequests] =
    useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] =
    useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const currentUserId = user.uid;

    async function load() {
      setLoadingRequests(true);
      setError("");

      try {
        const profile =
          await getUserProfile(currentUserId);

        if (!profile) {
          router.replace("/onboarding");
          return;
        }

        const role: ViewerRole =
          profile.role === "student" ||
          profile.role === "alumni"
            ? profile.role
            : null;

        setViewerRole(role);

        if (!role) {
          setError(
            "Your account role could not be determined.",
          );
          return;
        }

        const results =
          role === "alumni"
            ? await getMentorshipRequestsForAlumni(
                currentUserId,
              )
            : await getMentorshipRequestsForStudent(
                currentUserId,
              );

        const typedResults =
          results as MentorshipRequestView[];

        setRequests(typedResults);

        const entries = await Promise.all(
          typedResults.map(async (request) => {
            const otherId =
              role === "alumni"
                ? request.studentId
                : request.alumniId;

            try {
              const otherProfile =
                await getPublicUserProfile(otherId);

              return [
                request.id,
                {
                  name:
                    otherProfile?.displayName,
                },
              ] as const;
            } catch (err) {
              console.error(err);
              return [
                request.id,
                {},
              ] as const;
            }
          }),
        );

        setPeople(
          Object.fromEntries(entries),
        );
      } catch (err) {
        console.error(err);
        setError(
          "Unable to load mentorship right now.",
        );
      } finally {
        setLoadingRequests(false);
      }
    }

    load();
  }, [user, loading, router]);

  const pendingCount = useMemo(
    () =>
      requests.filter(
        (request) =>
          (request.status ?? "pending") ===
          "pending",
      ).length,
    [requests],
  );

  const acceptedCount = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.status === "accepted",
      ).length,
    [requests],
  );

  async function handleAccept(
    requestId: string,
  ) {
    setProcessingId(requestId);
    setError("");

    try {
      await acceptMentorshipRequest(
        requestId,
      );

      setRequests((current) =>
        current.map((request) =>
          request.id === requestId
            ? {
                ...request,
                status: "accepted",
              }
            : request,
        ),
      );
    } catch (err) {
      console.error(err);
      setError(
        "Unable to accept this mentorship request.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function updateStatus(
    requestId: string,
    status: "declined" | "cancelled",
  ) {
    setProcessingId(requestId);
    setError("");

    try {
      await updateMentorshipRequest(
        requestId,
        status,
      );

      setRequests((current) =>
        current.map((request) =>
          request.id === requestId
            ? { ...request, status }
            : request,
        ),
      );
    } catch (err) {
      console.error(err);
      setError(
        "Unable to update this mentorship request.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  if (loading || loadingRequests) {
    return (
      <main className="min-h-[calc(100vh-76px)] bg-[#fbfcff]">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-4 w-44 rounded-full bg-slate-200" />
            <div className="mt-5 h-12 w-72 rounded-2xl bg-slate-200" />
            <div className="mt-4 h-5 w-96 max-w-full rounded-full bg-slate-100" />
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="h-28 rounded-[2rem] bg-white ring-1 ring-slate-200" />
              <div className="h-28 rounded-[2rem] bg-white ring-1 ring-slate-200" />
            </div>
            <div className="mt-8 h-72 rounded-[2rem] bg-white ring-1 ring-slate-200" />
          </div>
        </div>
      </main>
    );
  }

  if (!user) return null;

  const isAlumni =
    viewerRole === "alumni";

  return (
    <main className="min-h-[calc(100vh-76px)] bg-[#fbfcff]">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
            The Study L&apos;école Internationale Alumni Connect
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
            Mentorship
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
            {isAlumni
              ? "Review requests from current students, choose where you can help, and continue accepted mentorships through private messaging."
              : "Keep track of the guidance you have requested from verified alumni and continue accepted mentorships through private messaging."}
          </p>
        </header>

        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-slate-500">
              Pending
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-slate-500">
              Accepted connections
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {acceptedCount}
            </p>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mt-7 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm leading-6 text-red-700"
          >
            {error}
          </div>
        )}

        <section className="mt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-950">
                {isAlumni
                  ? "Student requests"
                  : "Your requests"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {requests.length}{" "}
                {requests.length === 1
                  ? "request"
                  : "requests"}
              </p>
            </div>

            {!isAlumni && (
              <Link
                href="/alumni"
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:gap-3"
              >
                Find an alumni mentor
                <ArrowRight />
              </Link>
            )}
          </div>

          {requests.length === 0 ? (
            <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-10 text-center sm:p-14">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <UsersIcon />
              </div>

              <h3 className="mt-5 text-xl font-semibold text-slate-950">
                {isAlumni
                  ? "No mentorship requests yet"
                  : "You haven't requested mentorship yet"}
              </h3>

              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">
                {isAlumni
                  ? "When a student asks for your guidance, the request will appear here."
                  : "Explore verified alumni profiles and request guidance from someone whose experience matches what you want to learn."}
              </p>

              {!isAlumni && (
                <Link
                  href="/alumni"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  Explore alumni
                  <ArrowRight />
                </Link>
              )}
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {requests.map((request) => {
                const name =
                  people[request.id]?.name ||
                  (isAlumni
                    ? "The Study Student"
                    : "The Study Alumni");

                const currentStatus =
                  request.status ?? "pending";

                return (
                  <article
                    key={request.id}
                    className="rounded-[2rem] border border-slate-200 bg-white p-6 transition hover:border-blue-100 sm:p-7"
                  >
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-slate-100 font-semibold text-blue-800 ring-1 ring-blue-100">
                          {name
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-lg font-semibold text-slate-950">
                              {name}
                            </h3>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusClasses(
                                currentStatus,
                              )}`}
                            >
                              {statusLabel(
                                currentStatus,
                              )}
                            </span>
                          </div>

                          <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                            {isAlumni
                              ? "Student request"
                              : "Alumni mentor"}
                          </p>

                          {request.message && (
                            <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
                              {request.message}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        {isAlumni &&
                          currentStatus ===
                            "pending" && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  handleAccept(
                                    request.id,
                                  )
                                }
                                disabled={
                                  processingId ===
                                  request.id
                                }
                                className="rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {processingId ===
                                request.id
                                  ? "Working..."
                                  : "Accept"}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  updateStatus(
                                    request.id,
                                    "declined",
                                  )
                                }
                                disabled={
                                  processingId ===
                                  request.id
                                }
                                className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                              >
                                Decline
                              </button>
                            </>
                          )}

                        {!isAlumni &&
                          currentStatus ===
                            "pending" && (
                            <button
                              type="button"
                              onClick={() =>
                                updateStatus(
                                  request.id,
                                  "cancelled",
                                )
                              }
                              disabled={
                                processingId ===
                                request.id
                              }
                              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                              {processingId ===
                              request.id
                                ? "Working..."
                                : "Cancel request"}
                            </button>
                          )}

                        {currentStatus ===
                          "accepted" && (
                          <Link
                            href="/messages"
                            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                          >
                            Open messages
                            <ArrowRight />
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
