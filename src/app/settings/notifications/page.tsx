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
  DEFAULT_NOTIFICATION_PREFERENCES,
  getContentReminders,
  getNotificationPreferences,
  saveNotificationPreferences,
  type ContentReminder,
  type NotificationPreferenceValues,
  type ReminderLeadHours,
} from "@/lib/firebase/firestore";

function timestampToMillis(
  value: unknown
): number {
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (
      value as {
        toMillis?: unknown;
      }
    ).toMillis ===
      "function"
  ) {
    return (
      value as {
        toMillis: () => number;
      }
    ).toMillis();
  }

  return 0;
}

function formatDateTime(
  value: unknown
): string {
  const millis =
    timestampToMillis(
      value
    );

  if (!millis) {
    return "Date unavailable";
  }

  return new Date(
    millis
  ).toLocaleString(
    undefined,
    {
      dateStyle:
        "medium",
      timeStyle:
        "short",
    }
  );
}

function SwitchRow({
  title,
  description,
  checked,
  onChange,
  locked = false,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange:
    (value: boolean) => void;
  locked?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-slate-100 py-5 last:border-b-0">
      <div>
        <p className="text-sm font-semibold text-slate-950">
          {title}
        </p>

        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={
          checked
        }
        disabled={
          locked
        }
        onClick={() =>
          onChange(
            !checked
          )
        }
        className={[
          "relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60",
          checked
            ? "bg-blue-700"
            : "bg-slate-300",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition",
            checked
              ? "left-6"
              : "left-1",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

export default function NotificationSettingsPage() {
  const router =
    useRouter();

  const {
    user,
    loading,
  } = useAuth();

  const [
    values,
    setValues,
  ] =
    useState<
      NotificationPreferenceValues
    >({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
    });

  const [
    reminders,
    setReminders,
  ] =
    useState<
      ContentReminder[]
    >([]);

  const [
    loadingPage,
    setLoadingPage,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
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

    const userId =
      user.uid;

    let cancelled =
      false;

    async function initialize() {
      try {
        const [
          preferences,
          existingReminders,
        ] =
          await Promise.all([
            getNotificationPreferences(
              userId
            ),
            getContentReminders(
              userId
            ),
          ]);

        if (cancelled) {
          return;
        }

        setValues({
          ...preferences,
          timezone:
            preferences.timezone ===
              "UTC"
              ? (
                  Intl.DateTimeFormat()
                    .resolvedOptions()
                    .timeZone ||
                  "UTC"
                )
              : preferences.timezone,
        });

        setReminders(
          existingReminders
        );
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(
            "Unable to load notification settings."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingPage(
            false
          );
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    loading,
    router,
  ]);

  const upcoming =
    useMemo(
      () =>
        reminders.filter(
          (item) =>
            timestampToMillis(
              item.targetAt
            ) >
            Date.now()
        ),
      [reminders]
    );

  async function save() {
    if (!user) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await saveNotificationPreferences(
        user.uid,
        values
      );

      setSuccess(
        "Notification preferences saved."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save notification preferences."
      );
    } finally {
      setSaving(false);
    }
  }

  if (
    loading ||
    loadingPage
  ) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500">
          Loading notification settings...
        </p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const leadOptions:
    ReminderLeadHours[] = [
      12,
      24,
      48,
      72,
    ];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              Settings
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Notifications &amp; reminders
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Choose which optional in-app alerts you want to surface and how early Alumni Connect should remind you about Hub events or opportunity deadlines.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/notifications"
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              View notifications
            </Link>

            <Link
              href="/settings"
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Settings
            </Link>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700"
          >
            {success}
          </div>
        )}

        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-950">
            In-app alerts
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Turning an optional category off hides it from your notification feed and unread badge. The underlying product record is not deleted.
          </p>

          <div className="mt-4">
            <SwitchRow
              title="Mentorship updates"
              description="Requests, acceptances, declines and cancellations."
              checked={
                values.mentorshipAlerts
              }
              onChange={(value) =>
                setValues(
                  (current) => ({
                    ...current,
                    mentorshipAlerts:
                      value,
                  })
                )
              }
            />

            <SwitchRow
              title="Message alerts"
              description="New-message notifications from accepted mentorship conversations."
              checked={
                values.messageAlerts
              }
              onChange={(value) =>
                setValues(
                  (current) => ({
                    ...current,
                    messageAlerts:
                      value,
                  })
                )
              }
            />

            <SwitchRow
              title="Q&A alerts"
              description="Notifications when an alumni member answers one of your questions."
              checked={
                values.qnaAlerts
              }
              onChange={(value) =>
                setValues(
                  (current) => ({
                    ...current,
                    qnaAlerts:
                      value,
                  })
                )
              }
            />

            <SwitchRow
              title="School verification notices"
              description="Verification and account-state notices remain on because they can change what the account is allowed to do."
              checked
              onChange={() => {}}
              locked
            />
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-950">
            Hub reminders
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Set reminders from the Community Hub for events and opportunities that have a valid future date.
          </p>

          <div className="mt-4">
            <SwitchRow
              title="Enable Hub reminders"
              description="Show due reminders in Alumni Connect while the app is open or when you return to it."
              checked={
                values.hubReminders
              }
              onChange={(value) =>
                setValues(
                  (current) => ({
                    ...current,
                    hubReminders:
                      value,
                  })
                )
              }
            />
          </div>

          <label className="mt-6 block max-w-md">
            <span className="text-sm font-semibold text-slate-800">
              Default reminder time
            </span>

            <select
              value={
                values.reminderLeadHours
              }
              disabled={
                !values.hubReminders
              }
              onChange={(event) =>
                setValues(
                  (current) => ({
                    ...current,
                    reminderLeadHours:
                      Number(
                        event.target.value
                      ) as ReminderLeadHours,
                  })
                )
              }
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 disabled:opacity-50"
            >
              {leadOptions.map(
                (hours) => (
                  <option
                    key={
                      hours
                    }
                    value={
                      hours
                    }
                  >
                    {hours < 24
                      ? `${hours} hours before`
                      : `${hours / 24} day${hours === 24 ? "" : "s"} before`}
                  </option>
                )
              )}
            </select>
          </label>

          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Timezone
            </p>

            <p className="mt-2 text-sm font-medium text-slate-800">
              {values.timezone}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Used as your stored reminder context. Event and deadline timestamps themselves remain absolute Firestore timestamps.
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Upcoming reminders
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {upcoming.length} active{" "}
                {upcoming.length ===
                1
                  ? "reminder"
                  : "reminders"}
              </p>
            </div>

            <Link
              href="/hub"
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Open Community Hub
            </Link>
          </div>

          {upcoming.length ===
          0 ? (
            <p className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-500">
              No upcoming reminders yet. Open an event or opportunity in the Hub and choose “Remind me.”
            </p>
          ) : (
            <div className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
              {upcoming
                .slice(
                  0,
                  10
                )
                .map(
                  (reminder) => (
                    <div
                      key={
                        reminder.id
                      }
                      className="flex flex-col gap-2 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold capitalize text-slate-900">
                          {reminder.kind} reminder
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Target:{" "}
                          {formatDateTime(
                            reminder.targetAt
                          )}
                        </p>
                      </div>

                      <p className="text-xs font-medium text-blue-700">
                        Reminder:{" "}
                        {formatDateTime(
                          reminder.remindAt
                        )}
                      </p>
                    </div>
                  )
                )}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-950">
            Background delivery status
          </p>

          <p className="mt-2 text-sm leading-7 text-amber-900">
            These reminders are reliable as private in-app catch-up alerts when Alumni Connect is open or when you reopen it. Closed-app browser push and email reminders are not enabled yet; those require a trusted scheduled backend and push/email delivery service. We will not pretend a client-only timer can guarantee delivery.
          </p>
        </section>

        <div className="mt-7 flex justify-end">
          <button
            type="button"
            onClick={
              save
            }
            disabled={
              saving
            }
            className="rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : "Save notification settings"}
          </button>
        </div>
      </div>
    </main>
  );
}
