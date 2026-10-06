"use client";

import Link from "next/link";

import {
  useCallback,
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
  getAdminPlatformMetrics,
  getUserProfile,
  type AdminPlatformMetrics,
} from "@/lib/firebase/firestore";

type BrowserHealth = {
  online: boolean;
  serviceWorkerSupported:
    boolean;
  serviceWorkerControlling:
    boolean;
  serviceWorkerRegistered:
    boolean;
  appCheckConfigured:
    boolean;
  appCheckDebug:
    boolean;
  emulatorMode:
    boolean;
};

const EMPTY_HEALTH:
  BrowserHealth = {
  online: true,
  serviceWorkerSupported:
    false,
  serviceWorkerControlling:
    false,
  serviceWorkerRegistered:
    false,
  appCheckConfigured:
    false,
  appCheckDebug:
    false,
  emulatorMode:
    false,
};

function percent(
  numerator: number,
  denominator: number
): string {
  if (
    denominator <= 0
  ) {
    return "—";
  }

  return `${Math.round(
    (
      numerator /
      denominator
    ) *
      100
  )}%`;
}

function HealthDot({
  ok,
}: {
  ok: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={[
        "h-2.5 w-2.5 shrink-0 rounded-full",
        ok
          ? "bg-emerald-500"
          : "bg-amber-500",
      ].join(" ")}
    />
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value:
    string | number;
  detail?: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        {value}
      </p>

      {detail && (
        <p className="mt-2 text-xs leading-5 text-slate-400">
          {detail}
        </p>
      )}
    </article>
  );
}

export default function AdminInsightsPage() {
  const router =
    useRouter();

  const {
    user,
    loading,
  } = useAuth();

  const [
    authorized,
    setAuthorized,
  ] = useState(false);

  const [
    metrics,
    setMetrics,
  ] =
    useState<
      AdminPlatformMetrics | null
    >(null);

  const [
    health,
    setHealth,
  ] =
    useState<BrowserHealth>(
      EMPTY_HEALTH
    );

  const [
    loadingMetrics,
    setLoadingMetrics,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    refreshedAt,
    setRefreshedAt,
  ] =
    useState<Date | null>(
      null
    );

  const refreshMetrics =
    useCallback(
      async (
        showSpinner = false
      ) => {
        if (
          !authorized
        ) {
          return;
        }

        if (
          showSpinner
        ) {
          setRefreshing(
            true
          );
        }

        setError("");

        try {
          const result =
            await getAdminPlatformMetrics();

          setMetrics(
            result
          );

          setRefreshedAt(
            new Date()
          );
        } catch (err) {
          console.error(err);

          setError(
            "Unable to load platform metrics. Check Firestore connectivity, admin permissions and any required Firestore indexes."
          );
        } finally {
          setLoadingMetrics(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [authorized]
    );

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

    const userId =
      user.uid;

    let cancelled =
      false;

    async function authorize() {
      try {
        const profile =
          await getUserProfile(
            userId
          );

        if (
          profile?.isAdmin !==
          true
        ) {
          router.replace(
            "/dashboard"
          );

          return;
        }

        if (!cancelled) {
          setAuthorized(
            true
          );
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(
            "Unable to verify administrator access."
          );

          setLoadingMetrics(
            false
          );
        }
      }
    }

    authorize();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    loading,
    router,
  ]);

  useEffect(() => {
    if (
      !authorized
    ) {
      return;
    }

    refreshMetrics();
  }, [
    authorized,
    refreshMetrics,
  ]);

  useEffect(() => {
    function readHealth() {
      const swSupported =
        "serviceWorker" in
        navigator;

      setHealth(
        (current) => ({
          ...current,
          online:
            navigator.onLine,
          serviceWorkerSupported:
            swSupported,
          serviceWorkerControlling:
            Boolean(
              navigator
                .serviceWorker
                ?.controller
            ),
          appCheckConfigured:
            Boolean(
              process.env
                .NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY
            ),
          appCheckDebug:
            process.env
              .NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG ===
            "true",
          emulatorMode:
            process.env
              .NEXT_PUBLIC_USE_FIREBASE_EMULATORS ===
            "true",
        })
      );

      if (
        swSupported
      ) {
        navigator
          .serviceWorker
          .getRegistration(
            "/"
          )
          .then(
            (
              registration
            ) => {
              setHealth(
                (current) => ({
                  ...current,
                  serviceWorkerRegistered:
                    Boolean(
                      registration
                    ),
                })
              );
            }
          )
          .catch(
            () => {
              setHealth(
                (current) => ({
                  ...current,
                  serviceWorkerRegistered:
                    false,
                })
              );
            }
          );
      }
    }

    readHealth();

    window.addEventListener(
      "online",
      readHealth
    );

    window.addEventListener(
      "offline",
      readHealth
    );

    const interval =
      window.setInterval(
        readHealth,
        10_000
      );

    return () => {
      window.removeEventListener(
        "online",
        readHealth
      );

      window.removeEventListener(
        "offline",
        readHealth
      );

      window.clearInterval(
        interval
      );
    };
  }, []);

  const derived =
    useMemo(() => {
      if (!metrics) {
        return null;
      }

      return {
        activeShare:
          percent(
            metrics.users.active,
            metrics.users.total
          ),

        alumniVerification:
          percent(
            metrics.alumni.verified,
            metrics.users.alumni
          ),

        mentorshipAcceptance:
          percent(
            metrics.mentorship.accepted,
            metrics.mentorship.total
          ),

        qnaAnswered:
          percent(
            metrics.questions.answered,
            metrics.questions.total
          ),
      };
    }, [metrics]);

  if (
    loading ||
    (
      loadingMetrics &&
      !metrics
    )
  ) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500">
          Loading platform insights...
        </p>
      </main>
    );
  }

  if (
    !user ||
    !authorized
  ) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              School administration
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Product insights &amp; system health
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Privacy-preserving operational totals from the platform&apos;s existing records. This dashboard does not add clickstream tracking, location tracking, message-content analytics or hidden student scoring.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                refreshMetrics(
                  true
                )
              }
              disabled={
                refreshing
              }
              className="rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh metrics"}
            </button>

            <Link
              href="/admin/content"
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Hub content
            </Link>

            <Link
              href="/admin"
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Admin dashboard
            </Link>
          </div>
        </div>

        {refreshedAt && (
          <p className="mt-4 text-xs text-slate-400">
            Last refreshed{" "}
            {refreshedAt.toLocaleTimeString(
              [],
              {
                hour:
                  "2-digit",
                minute:
                  "2-digit",
              }
            )}
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm leading-6 text-red-700"
          >
            {error}
          </div>
        )}

        {metrics &&
          derived && (
          <>
            <section className="mt-8">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Community
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Account and alumni-verification totals.
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Registered users"
                  value={
                    metrics.users.total
                  }
                  detail={`${metrics.users.students} students · ${metrics.users.alumni} alumni`}
                />

                <MetricCard
                  label="Active accounts"
                  value={
                    metrics.users.active
                  }
                  detail={`${derived.activeShare} of registered accounts`}
                />

                <MetricCard
                  label="Verified alumni"
                  value={
                    metrics.alumni.verified
                  }
                  detail={`${derived.alumniVerification} of alumni accounts`}
                />

                <MetricCard
                  label="Pending alumni"
                  value={
                    metrics.alumni.pending
                  }
                  detail="Awaiting school verification"
                />
              </div>
            </section>

            <section className="mt-10">
              <h2 className="text-xl font-bold text-slate-950">
                Mentorship &amp; communication
              </h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Mentorship requests"
                  value={
                    metrics.mentorship.total
                  }
                  detail={`${metrics.mentorship.pending} pending`}
                />

                <MetricCard
                  label="Accepted requests"
                  value={
                    metrics.mentorship.accepted
                  }
                  detail={`${derived.mentorshipAcceptance} of all requests`}
                />

                <MetricCard
                  label="Conversations"
                  value={
                    metrics.conversations
                  }
                  detail="Created from accepted mentorship requests"
                />

                <MetricCard
                  label="Open reports"
                  value={
                    metrics.reports.open
                  }
                  detail="Needs moderator attention"
                />
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-4 text-sm text-slate-600 sm:grid-cols-3">
                  <p>
                    <span className="font-semibold text-slate-900">
                      Declined:
                    </span>{" "}
                    {
                      metrics.mentorship.declined
                    }
                  </p>

                  <p>
                    <span className="font-semibold text-slate-900">
                      Cancelled:
                    </span>{" "}
                    {
                      metrics.mentorship.cancelled
                    }
                  </p>

                  <p>
                    <span className="font-semibold text-slate-900">
                      Pending:
                    </span>{" "}
                    {
                      metrics.mentorship.pending
                    }
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-10">
              <h2 className="text-xl font-bold text-slate-950">
                Knowledge &amp; contribution
              </h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Q&A questions"
                  value={
                    metrics.questions.total
                  }
                  detail={`${metrics.questions.open} currently open`}
                />

                <MetricCard
                  label="Answered questions"
                  value={
                    metrics.questions.answered
                  }
                  detail={`${derived.qnaAnswered} of all questions`}
                />

                <MetricCard
                  label="Published projects"
                  value={
                    metrics.projects.published
                  }
                  detail="Community portfolio projects"
                />

                <MetricCard
                  label="Published Hub items"
                  value={
                    metrics.hub.publishedTotal
                  }
                  detail={`${metrics.hub.resources} resources · ${metrics.hub.opportunities} opportunities · ${metrics.hub.events} events`}
                />
              </div>
            </section>
          </>
        )}

        <section className="mt-10">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Client health
            </h2>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              These checks describe this administrator&apos;s current browser session. They are useful diagnostics, but they are not a substitute for production monitoring or a security audit.
            </p>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-slate-950">
                Connection
              </h3>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-600">
                    Browser network
                  </span>

                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <HealthDot
                      ok={
                        health.online
                      }
                    />
                    {health.online
                      ? "Online"
                      : "Offline"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-600">
                    Firestore aggregates
                  </span>

                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <HealthDot
                      ok={
                        Boolean(
                          metrics
                        )
                      }
                    />
                    {metrics
                      ? "Reachable"
                      : "Unavailable"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-600">
                    Emulator mode
                  </span>

                  <span className="text-sm font-semibold text-slate-800">
                    {health.emulatorMode
                      ? "On"
                      : "Off"}
                  </span>
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-slate-950">
                Protection &amp; app shell
              </h3>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-600">
                    App Check key configured
                  </span>

                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <HealthDot
                      ok={
                        health.appCheckConfigured
                      }
                    />
                    {health.appCheckConfigured
                      ? "Configured"
                      : "Not detected"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-600">
                    App Check debug mode
                  </span>

                  <span className="text-sm font-semibold text-slate-800">
                    {health.appCheckDebug
                      ? "On"
                      : "Off"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-600">
                    Service worker support
                  </span>

                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <HealthDot
                      ok={
                        health.serviceWorkerSupported
                      }
                    />
                    {health.serviceWorkerSupported
                      ? "Supported"
                      : "Unavailable"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-600">
                    Service worker registered
                  </span>

                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <HealthDot
                      ok={
                        health.serviceWorkerRegistered
                      }
                    />
                    {health.serviceWorkerRegistered
                      ? "Registered"
                      : "Not registered"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-600">
                    Service worker controlling page
                  </span>

                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <HealthDot
                      ok={
                        health.serviceWorkerControlling
                      }
                    />
                    {health.serviceWorkerControlling
                      ? "Active"
                      : "Not controlling"}
                  </span>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-blue-100 bg-blue-50 p-6">
          <h2 className="text-sm font-semibold text-blue-950">
            Why this analytics model?
          </h2>

          <p className="mt-2 max-w-4xl text-sm leading-7 text-blue-900">
            The dashboard counts records the platform already needs to function. It does not create a hidden behavioral profile of students, capture message text, collect search history, track precise location, or rank individuals. If the school later wants deeper analytics, that should be a deliberate governance decision with clear retention and privacy rules.
          </p>
        </section>
      </div>
    </main>
  );
}
