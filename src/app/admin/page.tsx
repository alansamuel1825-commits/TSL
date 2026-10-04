"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/useAuth";
import {
  getOpenReports,
  getPendingAlumni,
  getUserProfile,
  resolveReport,
  updateAlumniVerification,
  type Report,
} from "@/lib/firebase/firestore";

type AlumniApplication = {
  id: string;
  name?: string;
  university?: string;
  degree?: string;
  field?: string;
  graduationYear?: string;
  currentRole?: string;
  company?: string;
  bio?: string;
  expertise?: string[];
  mentorshipAvailable?: boolean;
  verificationStatus?: string;
};

function ShieldIcon() {
  return (
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
  );
}

function RefreshIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M20 7v5h-5" />
      <path d="M4 17v-5h5" />
      <path d="M5.6 9A7 7 0 0 1 17 5.7L20 8M4 16l3 2.3A7 7 0 0 0 18.4 15" />
    </svg>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center sm:p-12">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
        <ShieldIcon />
      </div>

      <h3 className="mt-5 text-lg font-semibold text-slate-950">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [applications, setApplications] =
    useState<AlumniApplication[]>([]);
  const [loadingApplications, setLoadingApplications] =
    useState(false);
  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] =
    useState(false);
  const [resolvingId, setResolvingId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const currentUserId = user.uid;

    async function initialize() {
      setChecking(true);
      setError("");

      try {
        const profile =
          await getUserProfile(currentUserId);

        if (profile?.isAdmin !== true) {
          router.replace("/dashboard");
          return;
        }

        setAuthorized(true);

        await Promise.all([
          loadApplications(),
          loadReports(),
        ]);
      } catch (err) {
        console.error(err);
        setError(
          "Unable to load the administration dashboard.",
        );
      } finally {
        setChecking(false);
      }
    }

    initialize();
  }, [user, loading, router]);

  async function loadApplications() {
    setLoadingApplications(true);

    try {
      const results =
        await getPendingAlumni();

      setApplications(
        results as AlumniApplication[],
      );
    } catch (err) {
      console.error(err);
      setError(
        "Unable to load alumni applications.",
      );
    } finally {
      setLoadingApplications(false);
    }
  }

  async function loadReports() {
    setLoadingReports(true);

    try {
      const results =
        await getOpenReports();

      setReports(results);
    } catch (err) {
      console.error(err);
      setError(
        "Unable to load open reports.",
      );
    } finally {
      setLoadingReports(false);
    }
  }

  async function refreshAll() {
    setNotice("");
    setError("");

    await Promise.all([
      loadApplications(),
      loadReports(),
    ]);
  }

  async function handleResolveReport(
    reportId: string,
  ) {
    const confirmed = window.confirm(
      "Mark this report as resolved?",
    );

    if (!confirmed) return;

    setResolvingId(reportId);
    setError("");
    setNotice("");

    try {
      await resolveReport(reportId);

      setReports((current) =>
        current.filter(
          (report) =>
            report.id !== reportId,
        ),
      );

      setNotice(
        "Report marked as resolved.",
      );
    } catch (err) {
      console.error(err);
      setError(
        "Unable to resolve this report.",
      );
    } finally {
      setResolvingId(null);
    }
  }

  async function handleDecision(
    uid: string,
    status:
      | "verified"
      | "rejected",
  ) {
    const applicant =
      applications.find(
        (item) => item.id === uid,
      );

    if (
      status === "rejected"
    ) {
      const confirmed =
        window.confirm(
          `Reject ${
            applicant?.name ||
            "this alumni application"
          }?`,
        );

      if (!confirmed) return;
    }

    setProcessingId(uid);
    setError("");
    setNotice("");

    try {
      await updateAlumniVerification(
        uid,
        status,
      );

      setApplications(
        (current) =>
          current.filter(
            (application) =>
              application.id !== uid,
          ),
      );

      setNotice(
        status === "verified"
          ? "Alumni profile approved and verified."
          : "Alumni application rejected.",
      );
    } catch (err) {
      console.error(err);
      setError(
        "The application could not be updated. Please try again.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  const mentorshipReadyCount =
    useMemo(
      () =>
        applications.filter(
          (application) =>
            application
              .mentorshipAvailable ===
            true,
        ).length,
      [applications],
    );

  if (loading || checking) {
    return (
      <main className="min-h-[calc(100vh-76px)] bg-[#fbfcff]">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-4 w-52 rounded-full bg-slate-200" />
            <div className="mt-5 h-12 w-80 rounded-2xl bg-slate-200" />
            <div className="mt-4 h-5 w-[34rem] max-w-full rounded-full bg-slate-100" />

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[0, 1, 2].map(
                (item) => (
                  <div
                    key={item}
                    className="h-28 rounded-[1.75rem] bg-white ring-1 ring-slate-200"
                  />
                ),
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!authorized || !user) {
    return null;
  }

  return (
    <main className="min-h-[calc(100vh-76px)] bg-[#fbfcff]">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
              School administration
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl">
              Community administration
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
              Review alumni applications, respond to reports, and help keep The Study L&apos;école Internationale Alumni Connect trusted and well governed.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshAll}
            disabled={
              loadingApplications ||
              loadingReports
            }
            className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 lg:self-auto"
          >
            <RefreshIcon />
            {loadingApplications ||
            loadingReports
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="mt-7 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm leading-6 text-red-700"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm leading-6 text-emerald-700"
          >
            {notice}
          </div>
        )}

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-slate-500">
              Pending applications
            </p>

            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {applications.length}
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-slate-500">
              Open reports
            </p>

            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {reports.length}
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-slate-500">
              Pending applicants open to mentorship
            </p>

            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {mentorshipReadyCount}
            </p>
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">
                Safety
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950">
                Open reports
              </h2>
            </div>

            <p className="text-sm text-slate-500">
              {reports.length}{" "}
              {reports.length === 1
                ? "report"
                : "reports"}{" "}
              awaiting review
            </p>
          </div>

          {loadingReports ? (
            <div className="h-44 animate-pulse rounded-[2rem] bg-white ring-1 ring-slate-200" />
          ) : reports.length === 0 ? (
            <EmptyState
              title="No open reports"
              description="There are no unresolved community reports right now."
            />
          ) : (
            <div className="space-y-4">
              {reports.map(
                (report) => (
                  <article
                    key={report.id}
                    className="rounded-[2rem] border border-red-100 bg-white p-6 sm:p-7"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-100">
                            Needs review
                          </span>

                          <span className="text-xs text-slate-400">
                            Conversation report
                          </span>
                        </div>

                        <h3 className="mt-4 text-lg font-semibold text-slate-950">
                          {report.reporterName} reported{" "}
                          {report.reportedUserName}
                        </h3>

                        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                            Report details
                          </p>

                          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">
                            {report.reason}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleResolveReport(
                            report.id,
                          )
                        }
                        disabled={
                          resolvingId ===
                          report.id
                        }
                        className="shrink-0 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {resolvingId ===
                        report.id
                          ? "Resolving..."
                          : "Mark resolved"}
                      </button>
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
        </section>

        <section className="mt-12">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                Verification
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950">
                Pending alumni
              </h2>
            </div>

            <p className="text-sm text-slate-500">
              Review carefully before approving access as verified alumni.
            </p>
          </div>

          {loadingApplications ? (
            <div className="h-56 animate-pulse rounded-[2rem] bg-white ring-1 ring-slate-200" />
          ) : applications.length ===
            0 ? (
            <EmptyState
              title="All caught up"
              description="There are currently no alumni profiles awaiting verification."
            />
          ) : (
            <div className="space-y-5">
              {applications.map(
                (alumni) => (
                  <article
                    key={alumni.id}
                    className="rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-7"
                  >
                    <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-slate-100 text-lg font-semibold text-blue-800 ring-1 ring-blue-100">
                            {(alumni.name?.charAt(
                              0,
                            ) ||
                              "?").toUpperCase()}
                          </div>

                          <div>
                            <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                              {alumni.name ||
                                "Unnamed applicant"}
                            </h3>

                            <span className="mt-1 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                              Pending verification
                            </span>
                          </div>
                        </div>

                        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                              The Study
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {alumni.graduationYear
                                ? `Class of ${alumni.graduationYear}`
                                : "Not provided"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                              University
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {alumni.university ||
                                "Not provided"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                              Degree
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {alumni.degree ||
                                "Not provided"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                              Field
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {alumni.field ||
                                "Not provided"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                              Current role
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {alumni.currentRole ||
                                "Not provided"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                              Organization
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {alumni.company ||
                                "Not provided"}
                            </p>
                          </div>
                        </div>

                        {alumni.bio && (
                          <div className="mt-6 border-t border-slate-200 pt-6">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                              About
                            </p>

                            <p className="mt-2 max-w-3xl whitespace-pre-line text-sm leading-7 text-slate-600">
                              {alumni.bio}
                            </p>
                          </div>
                        )}

                        {alumni.expertise &&
                          alumni.expertise
                            .length > 0 && (
                            <div className="mt-5 flex flex-wrap gap-2">
                              {alumni.expertise.map(
                                (skill) => (
                                  <span
                                    key={
                                      skill
                                    }
                                    className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-800 ring-1 ring-blue-100"
                                  >
                                    {
                                      skill
                                    }
                                  </span>
                                ),
                              )}
                            </div>
                          )}

                        {alumni.mentorshipAvailable && (
                          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                            This applicant is open to mentoring current students.
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-3 lg:w-36 lg:flex-col">
                        <button
                          type="button"
                          onClick={() =>
                            handleDecision(
                              alumni.id,
                              "verified",
                            )
                          }
                          disabled={
                            processingId ===
                            alumni.id
                          }
                          className="flex-1 rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 lg:flex-none"
                        >
                          {processingId ===
                          alumni.id
                            ? "Processing..."
                            : "Approve"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDecision(
                              alumni.id,
                              "rejected",
                            )
                          }
                          disabled={
                            processingId ===
                            alumni.id
                          }
                          className="flex-1 rounded-full border border-red-200 bg-white px-6 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 lg:flex-none"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
        </section>

        <footer className="mt-12 border-t border-slate-200 pt-6 text-xs leading-6 text-slate-400">
          Administrator access should be limited to school-approved staff. Verification and moderation actions should be based on school policy and appropriate safeguarding procedures.
        </footer>
      </div>
    </main>
  );
}
