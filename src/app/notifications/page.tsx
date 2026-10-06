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
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
  type AppNotification,
  type PublicUserProfile,
} from "@/lib/firebase/firestore";

type Filter =
  | "all"
  | "unread";

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
    ).toMillis === "function"
  ) {
    return (
      value as {
        toMillis: () => number;
      }
    ).toMillis();
  }

  return 0;
}

function formatRelativeTime(
  value: unknown
): string {
  const millis =
    timestampToMillis(value);

  if (!millis) {
    return "Just now";
  }

  const seconds =
    Math.max(
      0,
      Math.floor(
        (
          Date.now() -
          millis
        ) / 1000
      )
    );

  if (seconds < 60) {
    return "Just now";
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days =
    Math.floor(
      hours / 24
    );

  if (days < 7) {
    return `${days}d ago`;
  }

  return new Date(
    millis
  ).toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
      year:
        new Date().getFullYear() !==
        new Date(millis).getFullYear()
          ? "numeric"
          : undefined,
    }
  );
}

function destinationFor(
  notification:
    AppNotification
): string {
  switch (
    notification.type
  ) {
    case "mentorship_requested":
    case "mentorship_declined":
    case "mentorship_cancelled":
      return "/mentorship";

    case "mentorship_accepted":
    case "new_message":
      return "/messages";

    case "question_answered":
      return "/ask";

    case "hub_reminder":
      return "/hub";

    case "alumni_verified":
    case "alumni_rejected":
      return "/dashboard";
  }
}

function copyFor(
  notification:
    AppNotification,
  actorName: string
): {
  title: string;
  body: string;
} {
  switch (
    notification.type
  ) {
    case "mentorship_requested":
      return {
        title:
          "New mentorship request",
        body:
          `${actorName} would like to connect with you for mentorship.`,
      };

    case "mentorship_accepted":
      return {
        title:
          "Mentorship request accepted",
        body:
          `${actorName} accepted your mentorship request. Your conversation is ready.`,
      };

    case "mentorship_declined":
      return {
        title:
          "Mentorship request update",
        body:
          `${actorName} was unable to accept your mentorship request.`,
      };

    case "mentorship_cancelled":
      return {
        title:
          "Mentorship request cancelled",
        body:
          `${actorName} cancelled a pending mentorship request.`,
      };

    case "new_message":
      return {
        title:
          "New message",
        body:
          `${actorName} sent you a message.`,
      };

    case "question_answered":
      return {
        title:
          "Your question was answered",
        body:
          `${actorName} answered one of your questions.`,
      };

    case "hub_reminder":
      return {
        title:
          "Saved Hub reminder",
        body:
          "An event or opportunity you asked to be reminded about is coming up.",
      };

    case "alumni_verified":
      return {
        title:
          "Alumni profile verified",
        body:
          "The Study has verified your alumni profile. You can now use verified-alumni features.",
      };

    case "alumni_rejected":
      return {
        title:
          "Alumni verification update",
        body:
          "Your alumni verification was not approved. Review your profile or contact a school administrator if you believe this needs another look.",
      };
  }
}

export default function NotificationsPage() {
  const router =
    useRouter();

  const {
    user,
    loading,
  } = useAuth();

  const [
    notifications,
    setNotifications,
  ] =
    useState<
      AppNotification[]
    >([]);

  const [
    actors,
    setActors,
  ] =
    useState<
      Record<
        string,
        PublicUserProfile | null
      >
    >({});

  const [
    filter,
    setFilter,
  ] =
    useState<Filter>(
      "all"
    );

  const [
    loadingNotifications,
    setLoadingNotifications,
  ] = useState(true);

  const [
    markingAll,
    setMarkingAll,
  ] = useState(false);

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

    const unsubscribe =
      subscribeToNotifications(
        user.uid,
        (items) => {
          setNotifications(
            items
          );
          setLoadingNotifications(
            false
          );
        }
      );

    return unsubscribe;
  }, [
    user,
    loading,
    router,
  ]);

  useEffect(() => {
    const ids =
      Array.from(
        new Set(
          notifications
            .filter(
              (item) =>
                item.type !==
                "hub_reminder"
            )
            .map(
              (item) =>
                item.actorId
            )
        )
      ).filter(
        (id) =>
          !(id in actors)
      );

    if (
      ids.length === 0
    ) {
      return;
    }

    let cancelled =
      false;

    async function loadActors() {
      const entries =
        await Promise.all(
          ids.map(
            async (id) => [
              id,
              await getPublicUserProfile(
                id
              ),
            ] as const
          )
        );

      if (cancelled) {
        return;
      }

      setActors(
        (current) => ({
          ...current,
          ...Object.fromEntries(
            entries
          ),
        })
      );
    }

    loadActors().catch(
      (err) => {
        console.error(err);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [
    notifications,
    actors,
  ]);

  const unreadCount =
    useMemo(
      () =>
        notifications.filter(
          (item) =>
            !item.readAt
        ).length,
      [notifications]
    );

  const visible =
    useMemo(
      () =>
        filter === "unread"
          ? notifications.filter(
              (item) =>
                !item.readAt
            )
          : notifications,
      [
        notifications,
        filter,
      ]
    );

  async function openNotification(
    notification:
      AppNotification
  ) {
    setError("");

    try {
      if (
        user &&
        !notification.readAt
      ) {
        await markNotificationRead(
          user.uid,
          notification.id
        );
      }

      router.push(
        destinationFor(
          notification
        )
      );
    } catch (err) {
      console.error(err);

      setError(
        "Unable to open this notification right now."
      );
    }
  }

  async function handleMarkAll() {
    if (
      !user ||
      unreadCount === 0
    ) {
      return;
    }

    setMarkingAll(true);
    setError("");

    try {
      await markAllNotificationsRead(
        user.uid
      );
    } catch (err) {
      console.error(err);

      setError(
        "Unable to mark notifications as read."
      );
    } finally {
      setMarkingAll(false);
    }
  }

  if (
    loading ||
    loadingNotifications
  ) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500">
          Loading notifications...
        </p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              TSL Alumni Connect
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Notifications
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Important updates from mentorship, messages, Q&amp;A, school verification and your Hub reminders appear here.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/settings/notifications"
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-100"
            >
              Notification settings
            </Link>

            <button
              type="button"
              onClick={
                handleMarkAll
              }
              disabled={
                markingAll ||
                unreadCount === 0
              }
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {markingAll
                ? "Marking..."
                : "Mark all as read"}
            </button>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-2 border-b border-slate-200">
          {(
            [
              [
                "all",
                `All (${notifications.length})`,
              ],
              [
                "unread",
                `Unread (${unreadCount})`,
              ],
            ] as const
          ).map(
            ([
              value,
              label,
            ]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setFilter(
                    value
                  )
                }
                className={[
                  "-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition",
                  filter === value
                    ? "border-blue-700 text-blue-700"
                    : "border-transparent text-slate-500 hover:text-slate-900",
                ].join(" ")}
              >
                {label}
              </button>
            )
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <section
          aria-live="polite"
          className="mt-6"
        >
          {visible.length ===
          0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">
                {filter ===
                "unread"
                  ? "You're all caught up"
                  : "No notifications yet"}
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {filter ===
                "unread"
                  ? "You have no unread notifications."
                  : "New mentorship, message, Q&A, verification and Hub reminder updates will appear here."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              {visible.map(
                (
                  notification,
                  index
                ) => {
                  const actor =
                    actors[
                      notification
                        .actorId
                    ];

                  const actorName =
                    actor
                      ?.displayName ||
                    (
                      notification
                        .type ===
                        "alumni_verified" ||
                      notification
                        .type ===
                        "alumni_rejected"
                        ? "The Study"
                        : "A TSL community member"
                    );

                  const copy =
                    copyFor(
                      notification,
                      actorName
                    );

                  const unread =
                    !notification
                      .readAt;

                  return (
                    <button
                      key={
                        notification.id
                      }
                      type="button"
                      onClick={() =>
                        openNotification(
                          notification
                        )
                      }
                      className={[
                        "flex w-full items-start gap-4 px-5 py-5 text-left transition hover:bg-slate-50 sm:px-6",
                        index > 0
                          ? "border-t border-slate-100"
                          : "",
                        unread
                          ? "bg-blue-50/45"
                          : "bg-white",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                          unread
                            ? "bg-blue-600"
                            : "bg-slate-300",
                        ].join(" ")}
                        aria-hidden="true"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="font-semibold text-slate-950">
                          {copy.title}
                        </span>

                        <span className="mt-1 block text-sm leading-6 text-slate-600">
                          {copy.body}
                        </span>

                        <span className="mt-2 block text-xs font-medium text-slate-400">
                          {formatRelativeTime(
                            notification
                              .createdAt
                          )}
                        </span>
                      </span>

                      <span
                        className="mt-1 text-slate-400"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          )}
        </section>

        <p className="mt-6 text-xs leading-5 text-slate-400">
          Notifications are visible only to the account they belong to. Email and browser-push delivery will be added separately with opt-in controls.
        </p>
      </div>
    </main>
  );
}
