"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/useAuth";
import {
  getUserProfile,
  getPendingAlumni,
  updateAlumniVerification,
  getOpenReports,
  resolveReport,
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

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [applications, setApplications] = useState<AlumniApplication[]>(
    []
  );
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const [error, setError] = useState("");

  useEffect(() => {
    async function initialize() {
      if (loading) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const profile = await getUserProfile(user.uid);

        if (profile?.isAdmin !== true) {
          router.replace("/dashboard");
          return;
        }

        setAuthorized(true);
        await Promise.all([loadApplications(), loadReports()]);
      } catch (err) {
        console.error(err);
        setError("Unable to load the admin dashboard.");
      } finally {
        setChecking(false);
      }
    }

    initialize();
  }, [user, loading, router]);

  async function loadApplications() {
    setLoadingApplications(true);
    setError("");

    try {
      const results = await getPendingAlumni();
      setApplications(results as AlumniApplication[]);
    } catch (err) {
      console.error(err);
      setError("Unable to load alumni applications.");
    } finally {
      setLoadingApplications(false);
    }
  }

  async function loadReports() {
    setLoadingReports(true);

    try {
      const results = await getOpenReports();
      setReports(results);
    } catch (err) {
      console.error(err);
      setError("Unable to load reports.");
    } finally {
      setLoadingReports(false);
    }
  }

  async function handleResolveReport(reportId: string) {
    setResolvingId(reportId);

    try {
      await resolveReport(reportId);
      setReports((current) => current.filter((r) => r.id !== reportId));
    } catch (err) {
      console.error(err);
      setError("Unable to resolve this report.");
    } finally {
      setResolvingId(null);
    }
  }

  async function handleDecision(
    uid: string,
    status: "verified" | "rejected"
  ) {
    setProcessingId(uid);
    setError("");

    try {
      await updateAlumniVerification(uid, status);

      setApplications((current) =>
        current.filter((application) => application.id !== uid)
      );
    } catch (err) {
      console.error(err);
      setError("The application could not be updated. Please try again.");
    } finally {
      setProcessingId(null);
    }
  }

  if (loading || checking) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">
          Checking administrator permissions...
        </p>
      </main>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            TSL ALUMNI CONNECT
          </p>

          <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-950">
                Admin Dashboard
              </h1>

              <p className="mt-3 max-w-2xl text-slate-600">
                Review alumni applications and maintain a trusted TSL
                alumni community.
              </p>
            </div>

            <button
              onClick={() => {
                loadApplications();
                loadReports();
              }}
              disabled={loadingApplications || loadingReports}
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50"
            >
              {loadingApplications || loadingReports
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Pending applications</p>

            <p className="mt-3 text-4xl font-bold text-slate-950">
              {applications.length}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Open reports</p>

            <p className="mt-3 text-4xl font-bold text-slate-950">
              {reports.length}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Administrator</p>

            <p className="mt-3 truncate text-lg font-semibold text-slate-950">
              {user?.email}
            </p>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-slate-950">
              Open reports
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Conversations flagged by students or alumni.
            </p>
          </div>

          {loadingReports ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
              <p className="text-slate-500">Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <p className="text-slate-500">No open reports right now.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <article
                  key={report.id}
                  className="rounded-3xl border border-red-200 bg-red-50 p-6"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {report.reporterName} reported {report.reportedUserName}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {report.reason}
                  </p>

                  <button
                    onClick={() => handleResolveReport(report.id)}
                    disabled={resolvingId === report.id}
                    className="mt-4 rounded-full bg-slate-950 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {resolvingId === report.id
                      ? "Resolving..."
                      : "Mark resolved"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-slate-950">
              Pending alumni
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Review each application before granting verified alumni
              status.
            </p>
          </div>

          {loadingApplications ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
              <p className="text-slate-500">Loading applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
                ✓
              </div>

              <h3 className="mt-5 text-xl font-semibold text-slate-950">
                All caught up
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                There are currently no pending alumni applications.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {applications.map((alumni) => (
                <article
                  key={alumni.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-bold text-slate-950">
                          {alumni.name || "Unnamed applicant"}
                        </h3>

                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          Pending verification
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                        <p>
                          <span className="font-semibold text-slate-900">
                            University:
                          </span>{" "}
                          {alumni.university || "Not provided"}
                        </p>

                        <p>
                          <span className="font-semibold text-slate-900">
                            Graduation:
                          </span>{" "}
                          {alumni.graduationYear || "Not provided"}
                        </p>

                        <p>
                          <span className="font-semibold text-slate-900">
                            Degree:
                          </span>{" "}
                          {alumni.degree || "Not provided"}
                        </p>

                        <p>
                          <span className="font-semibold text-slate-900">
                            Field:
                          </span>{" "}
                          {alumni.field || "Not provided"}
                        </p>

                        <p>
                          <span className="font-semibold text-slate-900">
                            Current role:
                          </span>{" "}
                          {alumni.currentRole || "Not provided"}
                        </p>

                        <p>
                          <span className="font-semibold text-slate-900">
                            Company:
                          </span>{" "}
                          {alumni.company || "Not provided"}
                        </p>
                      </div>

                      {alumni.bio && (
                        <div className="mt-5">
                          <p className="text-sm font-semibold text-slate-900">
                            About
                          </p>

                          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                            {alumni.bio}
                          </p>
                        </div>
                      )}

                      {alumni.expertise && alumni.expertise.length > 0 && (
                        <div className="mt-5 flex flex-wrap gap-2">
                          {alumni.expertise.map((skill) => (
                            <span
                              key={skill}
                              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
                      <button
                        onClick={() => handleDecision(alumni.id, "verified")}
                        disabled={processingId === alumni.id}
                        className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                      >
                        {processingId === alumni.id
                          ? "Processing..."
                          : "Approve"}
                      </button>

                      <button
                        onClick={() => handleDecision(alumni.id, "rejected")}
                        disabled={processingId === alumni.id}
                        className="rounded-full border border-red-200 bg-white px-6 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
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