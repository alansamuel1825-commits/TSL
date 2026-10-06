"use client";

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
  cancelContentReminder,
  getContentReminderIds,
  getNotificationPreferences,
  getPublishedCommunityContent,
  getSavedCommunityContentIds,
  saveCommunityContent,
  scheduleContentReminder,
  unsaveCommunityContent,
  type CommunityContentItem,
  type CommunityContentKind,
  type NotificationPreferenceValues,
} from "@/lib/firebase/firestore";

type HubView =
  | "all"
  | CommunityContentKind
  | "saved";

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
  value: unknown,
  includeTime = false
): string {
  const millis =
    timestampToMillis(
      value
    );

  if (!millis) {
    return "";
  }

  return new Date(
    millis
  ).toLocaleString(
    undefined,
    includeTime
      ? {
          dateStyle:
            "medium",
          timeStyle:
            "short",
        }
      : {
          dateStyle:
            "medium",
        }
  );
}

function kindLabel(
  kind: CommunityContentKind
) {
  if (
    kind === "resource"
  ) {
    return "Resource";
  }

  if (
    kind ===
    "opportunity"
  ) {
    return "Opportunity";
  }

  return "Event";
}

function eventModeLabel(
  value:
    CommunityContentItem["eventMode"]
) {
  if (
    value ===
    "in_person"
  ) {
    return "In person";
  }

  if (
    value === "online"
  ) {
    return "Online";
  }

  if (
    value === "hybrid"
  ) {
    return "Hybrid";
  }

  return "";
}

export default function HubPage() {
  const router =
    useRouter();

  const {
    user,
    loading,
  } = useAuth();

  const [
    items,
    setItems,
  ] =
    useState<
      CommunityContentItem[]
    >([]);

  const [
    savedIds,
    setSavedIds,
  ] =
    useState<
      Set<string>
    >(new Set());


  const [
    reminderIds,
    setReminderIds,
  ] =
    useState<
      Set<string>
    >(new Set());

  const [
    notificationPreferences,
    setNotificationPreferences,
  ] =
    useState<
      NotificationPreferenceValues | null
    >(null);

  const [
    reminderWorkingId,
    setReminderWorkingId,
  ] =
    useState<
      string | null
    >(null);

  const [
    view,
    setView,
  ] =
    useState<HubView>(
      "all"
    );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    loadingHub,
    setLoadingHub,
  ] = useState(true);

  const [
    savingId,
    setSavingId,
  ] =
    useState<
      string | null
    >(null);

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

    const userId =
      user.uid;

    let cancelled =
      false;

    async function loadHub() {
      setLoadingHub(
        true
      );

      try {
        const [
          content,
          saved,
          reminders,
          preferences,
        ] =
          await Promise.all([
            getPublishedCommunityContent(),
            getSavedCommunityContentIds(
              userId
            ),
            getContentReminderIds(
              userId
            ),
            getNotificationPreferences(
              userId
            ),
          ]);

        if (cancelled) {
          return;
        }

        setItems(
          content
        );
        setSavedIds(
          saved
        );

        setReminderIds(
          reminders
        );

        setNotificationPreferences(
          preferences
        );
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(
            "Unable to load the community hub right now."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingHub(
            false
          );
        }
      }
    }

    loadHub();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    loading,
    router,
  ]);

  const visible =
    useMemo(() => {
      const needle =
        search
          .trim()
          .toLowerCase();

      return items.filter(
        (item) => {
          const matchesView =
            view === "all"
              ? true
              : view ===
                "saved"
              ? savedIds.has(
                  item.id
                )
              : item.kind ===
                view;

          const matchesSearch =
            !needle ||
            [
              item.title,
              item.summary,
              item.details,
              item.category,
              item.organization,
              item.location,
              item.eligibility,
            ]
              .join(" ")
              .toLowerCase()
              .includes(
                needle
              );

          return (
            matchesView &&
            matchesSearch
          );
        }
      );
    }, [
      items,
      savedIds,
      search,
      view,
    ]);

  async function toggleSave(
    itemId: string
  ) {
    if (!user) {
      return;
    }

    setSavingId(
      itemId
    );
    setError("");

    try {
      const alreadySaved =
        savedIds.has(
          itemId
        );

      if (alreadySaved) {
        await unsaveCommunityContent(
          user.uid,
          itemId
        );

        setSavedIds(
          (current) => {
            const next =
              new Set(
                current
              );

            next.delete(
              itemId
            );

            return next;
          }
        );
      } else {
        await saveCommunityContent(
          user.uid,
          itemId
        );

        setSavedIds(
          (current) => {
            const next =
              new Set(
                current
              );

            next.add(
              itemId
            );

            return next;
          }
        );
      }
    } catch (err) {
      console.error(err);

      setError(
        "Unable to update your saved items."
      );
    } finally {
      setSavingId(
        null
      );
    }
  }

  async function toggleReminder(
    item:
      CommunityContentItem
  ) {
    if (
      !user ||
      !notificationPreferences
    ) {
      return;
    }

    if (
      item.kind !==
        "event" &&
      item.kind !==
        "opportunity"
    ) {
      return;
    }

    setReminderWorkingId(
      item.id
    );
    setError("");

    try {
      if (
        reminderIds.has(
          item.id
        )
      ) {
        await cancelContentReminder(
          user.uid,
          item.id
        );

        setReminderIds(
          (current) => {
            const next =
              new Set(
                current
              );

            next.delete(
              item.id
            );

            return next;
          }
        );
      } else {
        if (
          !notificationPreferences
            .hubReminders
        ) {
          router.push(
            "/settings/notifications"
          );

          return;
        }

        await scheduleContentReminder(
          user.uid,
          item,
          notificationPreferences
            .reminderLeadHours
        );

        setReminderIds(
          (current) => {
            const next =
              new Set(
                current
              );

            next.add(
              item.id
            );

            return next;
          }
        );
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update this reminder."
      );
    } finally {
      setReminderWorkingId(
        null
      );
    }
  }

  if (
    loading ||
    loadingHub
  ) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500">
          Loading community hub...
        </p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const tabs:
    {
      value: HubView;
      label: string;
    }[] = [
      {
        value: "all",
        label: "All",
      },
      {
        value:
          "resource",
        label:
          "Resources",
      },
      {
        value:
          "opportunity",
        label:
          "Opportunities",
      },
      {
        value: "event",
        label: "Events",
      },
      {
        value: "saved",
        label: `Saved (${savedIds.size})`,
      },
    ];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-9 sm:px-8 lg:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              TSL Community Hub
            </p>

            <h1 className="mt-3 max-w-4xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Useful resources, opportunities and events in one trusted place
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              Browse school-curated guidance, external opportunities and community events without exposing private student contact information.
            </p>
          </div>
        </section>

        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-900 sm:flex-row sm:items-center sm:justify-between">
          <p className="leading-6">
            Hub reminders are private. When enabled, Alumni Connect can surface a due reminder while the app is open or when you return to it.
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/settings/notifications"
              )
            }
            className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-semibold text-blue-800 ring-1 ring-blue-200"
          >
            Notification settings
          </button>
        </div>

        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <label>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Search the hub
            </span>

            <input
              value={
                search
              }
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search resources, organizations, eligibility, locations..."
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </label>

          <div
            className="mt-5 flex gap-2 overflow-x-auto pb-1"
            role="tablist"
            aria-label="Community hub sections"
          >
            {tabs.map(
              (tab) => (
                <button
                  key={
                    tab.value
                  }
                  type="button"
                  role="tab"
                  aria-selected={
                    view ===
                    tab.value
                  }
                  onClick={() =>
                    setView(
                      tab.value
                    )
                  }
                  className={[
                    "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition",
                    view ===
                    tab.value
                      ? "bg-blue-700 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  ].join(
                    " "
                  )}
                >
                  {tab.label}
                </button>
              )
            )}
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
              {view ===
              "saved"
                ? "Saved for later"
                : "Community content"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {visible.length}{" "}
              {visible.length ===
              1
                ? "item"
                : "items"}
            </p>
          </div>
        </div>

        {visible.length ===
        0 ? (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-slate-950">
              Nothing to show here yet
            </h3>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              Try another search or section. School-approved items will appear here as they are published.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {visible.map(
              (item) => {
                const saved =
                  savedIds.has(
                    item.id
                  );

                return (
                  <article
                    key={
                      item.id
                    }
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {kindLabel(
                            item.kind
                          )}
                        </span>

                        {item.category && (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {item.category}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          toggleSave(
                            item.id
                          )
                        }
                        disabled={
                          savingId ===
                          item.id
                        }
                        aria-pressed={
                          saved
                        }
                        className={[
                          "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                          saved
                            ? "bg-blue-700 text-white"
                            : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                        ].join(
                          " "
                        )}
                      >
                        {savingId ===
                        item.id
                          ? "Saving..."
                          : saved
                          ? "Saved"
                          : "Save"}
                      </button>
                    </div>

                    <h3 className="mt-5 text-xl font-bold tracking-tight text-slate-950">
                      {item.title}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {item.summary}
                    </p>

                    {item.details && (
                      <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-500">
                        {item.details}
                      </p>
                    )}

                    <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                      {item.organization && (
                        <p>
                          <span className="font-semibold text-slate-900">
                            Organization:
                          </span>{" "}
                          {
                            item.organization
                          }
                        </p>
                      )}

                      {item.location && (
                        <p>
                          <span className="font-semibold text-slate-900">
                            Location:
                          </span>{" "}
                          {
                            item.location
                          }
                        </p>
                      )}

                      {item.kind ===
                        "event" &&
                        Boolean(
                          item.startAt
                        ) && (
                        <p>
                          <span className="font-semibold text-slate-900">
                            Starts:
                          </span>{" "}
                          {formatDateTime(
                            item.startAt,
                            true
                          )}
                        </p>
                      )}

                      {item.kind ===
                        "event" &&
                        Boolean(
                          item.endAt
                        ) && (
                        <p>
                          <span className="font-semibold text-slate-900">
                            Ends:
                          </span>{" "}
                          {formatDateTime(
                            item.endAt,
                            true
                          )}
                        </p>
                      )}

                      {item.kind ===
                        "event" &&
                        item.eventMode && (
                        <p>
                          <span className="font-semibold text-slate-900">
                            Format:
                          </span>{" "}
                          {eventModeLabel(
                            item.eventMode
                          )}
                        </p>
                      )}

                      {item.kind ===
                        "opportunity" &&
                        Boolean(
                          item.deadline
                        ) && (
                        <p>
                          <span className="font-semibold text-slate-900">
                            Deadline:
                          </span>{" "}
                          {formatDateTime(
                            item.deadline
                          )}
                        </p>
                      )}
                    </div>

                    {item.kind ===
                      "opportunity" &&
                      item.eligibility && (
                      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Eligibility
                        </p>

                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                          {
                            item.eligibility
                          }
                        </p>
                      </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-3">
                      {item.url && (
                        <a
                          href={
                            item.url
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                          {item.kind ===
                          "event"
                            ? "Event link ↗"
                            : item.kind ===
                              "opportunity"
                            ? "Open official source ↗"
                            : "Open resource ↗"}
                        </a>
                      )}

                      {(item.kind ===
                        "event" ||
                        item.kind ===
                          "opportunity") && (
                        <button
                          type="button"
                          onClick={() =>
                            toggleReminder(
                              item
                            )
                          }
                          disabled={
                            reminderWorkingId ===
                            item.id
                          }
                          className={[
                            "rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50",
                            reminderIds.has(
                              item.id
                            )
                              ? "border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"
                              : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
                          ].join(" ")}
                        >
                          {reminderWorkingId ===
                          item.id
                            ? "Updating..."
                            : reminderIds.has(
                                item.id
                              )
                            ? "Reminder set ✓"
                            : notificationPreferences
                                ?.hubReminders
                            ? `Remind me ${notificationPreferences.reminderLeadHours}h before`
                            : "Enable reminders"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}

        <p className="mt-8 text-xs leading-6 text-slate-400">
          External links are curated by school administrators, but third-party pages can change. Confirm important requirements and deadlines with the original source before acting.
        </p>
      </div>
    </main>
  );
}
