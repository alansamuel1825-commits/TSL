"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import {
  useAuth,
} from "@/lib/auth/useAuth";

import {
  createCommunityContent,
  deleteCommunityContent,
  getCommunityContentForAdmin,
  getUserProfile,
  updateCommunityContent,
  type CommunityContentInput,
  type CommunityContentItem,
  type CommunityContentKind,
} from "@/lib/firebase/firestore";

const EMPTY_FORM:
  CommunityContentInput = {
  kind: "resource",
  title: "",
  summary: "",
  details: "",
  category: "",
  organization:
    "The Study",
  location: "",
  eventMode: "",
  startAt: "",
  endAt: "",
  deadline: "",
  eligibility: "",
  url: "",
  status: "draft",
};

function timestampToLocalInput(
  value: unknown
): string {
  if (
    !value ||
    typeof value !==
      "object" ||
    !("toDate" in value) ||
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate !==
      "function"
  ) {
    return "";
  }

  const date =
    (
      value as {
        toDate:
          () => Date;
      }
    ).toDate();

  const offset =
    date.getTimezoneOffset();

  return new Date(
    date.getTime() -
      offset * 60_000
  )
    .toISOString()
    .slice(0, 16);
}

function itemToForm(
  item:
    CommunityContentItem
): CommunityContentInput {
  return {
    kind:
      item.kind,
    title:
      item.title,
    summary:
      item.summary,
    details:
      item.details,
    category:
      item.category,
    organization:
      item.organization,
    location:
      item.location,
    eventMode:
      item.eventMode,
    startAt:
      timestampToLocalInput(
        item.startAt
      ),
    endAt:
      timestampToLocalInput(
        item.endAt
      ),
    deadline:
      timestampToLocalInput(
        item.deadline
      ),
    eligibility:
      item.eligibility,
    url:
      item.url,
    status:
      item.status,
  };
}

function kindLabel(
  kind:
    CommunityContentKind
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

export default function AdminContentPage() {
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
    form,
    setForm,
  ] =
    useState<
      CommunityContentInput
    >(EMPTY_FORM);

  const [
    editingId,
    setEditingId,
  ] =
    useState<
      string | null
    >(null);

  const [
    loadingPage,
    setLoadingPage,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    deletingId,
    setDeletingId,
  ] =
    useState<
      string | null
    >(null);

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

        const results =
          await getCommunityContentForAdmin();

        if (!cancelled) {
          setItems(
            results
          );
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(
            "Unable to load the content manager."
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

  const publishedCount =
    useMemo(
      () =>
        items.filter(
          (item) =>
            item.status ===
            "published"
        ).length,
      [items]
    );

  function clearForm() {
    setEditingId(
      null
    );
    setForm(
      EMPTY_FORM
    );
    setError("");
    setSuccess("");
  }

  function beginEdit(
    item:
      CommunityContentItem
  ) {
    setEditingId(
      item.id
    );
    setForm(
      itemToForm(
        item
      )
    );
    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  }

  async function save(
    status:
      "draft"
      | "published"
  ) {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...form,
        status,
      };

      if (editingId) {
        await updateCommunityContent(
          editingId,
          payload
        );
      } else {
        await createCommunityContent(
          payload
        );
      }

      const refreshed =
        await getCommunityContentForAdmin();

      setItems(
        refreshed
      );
      setForm(
        EMPTY_FORM
      );
      setEditingId(
        null
      );

      setSuccess(
        status ===
          "published"
          ? "Content published."
          : "Draft saved."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save this item."
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(
    item:
      CommunityContentItem
  ) {
    const confirmed =
      window.confirm(
        `Delete "${item.title}"? This cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(
      item.id
    );
    setError("");
    setSuccess("");

    try {
      await deleteCommunityContent(
        item.id
      );

      setItems(
        (current) =>
          current.filter(
            (entry) =>
              entry.id !==
              item.id
          )
      );

      if (
        editingId ===
        item.id
      ) {
        clearForm();
      }

      setSuccess(
        "Content deleted."
      );
    } catch (err) {
      console.error(err);

      setError(
        "Unable to delete this item."
      );
    } finally {
      setDeletingId(
        null
      );
    }
  }

  if (
    loading ||
    loadingPage
  ) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500">
          Loading content manager...
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
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              School administration
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Community Hub content
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Curate trusted resources, external opportunities and community events for signed-in TSL members.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/hub"
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              View Hub
            </Link>

            <Link
              href="/admin/insights"
              className="rounded-full border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-100"
            >
              Insights
            </Link>

            <Link
              href="/admin"
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Admin dashboard
            </Link>
          </div>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-950">
              {items.length}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Published
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-950">
              {publishedCount}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Drafts
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-950">
              {items.length -
                publishedCount}
            </p>
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

        <div className="mt-8 grid gap-7 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  {editingId
                    ? "Edit item"
                    : "Create item"}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Publish only links and information that the school is comfortable presenting to its authenticated community.
                </p>
              </div>

              {editingId && (
                <button
                  type="button"
                  onClick={
                    clearForm
                  }
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  New item
                </button>
              )}
            </div>

            <div className="mt-7 grid gap-5">
              <label>
                <span className="text-sm font-semibold text-slate-800">
                  Content type
                </span>

                <select
                  value={
                    form.kind
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        kind:
                          event.target
                            .value as CommunityContentKind,
                        eventMode:
                          event.target.value ===
                          "event"
                            ? current.eventMode ||
                              "in_person"
                            : "",
                        startAt:
                          event.target.value ===
                          "event"
                            ? current.startAt
                            : "",
                        endAt:
                          event.target.value ===
                          "event"
                            ? current.endAt
                            : "",
                        deadline:
                          event.target.value ===
                          "opportunity"
                            ? current.deadline
                            : "",
                        eligibility:
                          event.target.value ===
                          "opportunity"
                            ? current.eligibility
                            : "",
                      })
                    )
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                >
                  <option value="resource">
                    Resource
                  </option>
                  <option value="opportunity">
                    Opportunity
                  </option>
                  <option value="event">
                    Event
                  </option>
                </select>
              </label>

              <label>
                <span className="text-sm font-semibold text-slate-800">
                  Title
                </span>

                <input
                  value={
                    form.title
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        title:
                          event.target.value,
                      })
                    )
                  }
                  maxLength={140}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
              </label>

              <label>
                <span className="text-sm font-semibold text-slate-800">
                  Summary
                </span>

                <textarea
                  value={
                    form.summary
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        summary:
                          event.target.value,
                      })
                    )
                  }
                  rows={3}
                  maxLength={350}
                  className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6"
                />
              </label>

              <label>
                <span className="text-sm font-semibold text-slate-800">
                  Details
                </span>

                <textarea
                  value={
                    form.details
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        details:
                          event.target.value,
                      })
                    )
                  }
                  rows={6}
                  maxLength={4000}
                  className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7"
                />
              </label>

              <div className="grid gap-5 md:grid-cols-2">
                <label>
                  <span className="text-sm font-semibold text-slate-800">
                    Category
                  </span>

                  <input
                    value={
                      form.category
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          category:
                            event.target.value,
                        })
                      )
                    }
                    maxLength={80}
                    placeholder="Career, university, scholarship..."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  />
                </label>

                <label>
                  <span className="text-sm font-semibold text-slate-800">
                    Organization
                  </span>

                  <input
                    value={
                      form.organization
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          organization:
                            event.target.value,
                        })
                      )
                    }
                    maxLength={120}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  />
                </label>
              </div>

              {form.kind !==
                "resource" && (
                <label>
                  <span className="text-sm font-semibold text-slate-800">
                    Location
                  </span>

                  <input
                    value={
                      form.location
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          location:
                            event.target.value,
                        })
                      )
                    }
                    maxLength={160}
                    placeholder="Puducherry, Online, School auditorium..."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  />
                </label>
              )}

              {form.kind ===
                "opportunity" && (
                <>
                  <label>
                    <span className="text-sm font-semibold text-slate-800">
                      Eligibility
                    </span>

                    <textarea
                      value={
                        form.eligibility
                      }
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            eligibility:
                              event.target.value,
                          })
                        )
                      }
                      rows={4}
                      maxLength={700}
                      className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6"
                    />
                  </label>

                  <label>
                    <span className="text-sm font-semibold text-slate-800">
                      Deadline
                    </span>

                    <input
                      type="datetime-local"
                      value={
                        form.deadline
                      }
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            deadline:
                              event.target.value,
                          })
                        )
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    />
                  </label>
                </>
              )}

              {form.kind ===
                "event" && (
                <>
                  <label>
                    <span className="text-sm font-semibold text-slate-800">
                      Event format
                    </span>

                    <select
                      value={
                        form.eventMode
                      }
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            eventMode:
                              event.target
                                .value as CommunityContentInput["eventMode"],
                          })
                        )
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    >
                      <option value="in_person">
                        In person
                      </option>
                      <option value="online">
                        Online
                      </option>
                      <option value="hybrid">
                        Hybrid
                      </option>
                    </select>
                  </label>

                  <div className="grid gap-5 md:grid-cols-2">
                    <label>
                      <span className="text-sm font-semibold text-slate-800">
                        Starts
                      </span>

                      <input
                        type="datetime-local"
                        value={
                          form.startAt
                        }
                        onChange={(event) =>
                          setForm(
                            (current) => ({
                              ...current,
                              startAt:
                                event.target.value,
                            })
                          )
                        }
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      />
                    </label>

                    <label>
                      <span className="text-sm font-semibold text-slate-800">
                        Ends
                      </span>

                      <input
                        type="datetime-local"
                        value={
                          form.endAt
                        }
                        onChange={(event) =>
                          setForm(
                            (current) => ({
                              ...current,
                              endAt:
                                event.target.value,
                            })
                          )
                        }
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      />
                    </label>
                  </div>
                </>
              )}

              <label>
                <span className="text-sm font-semibold text-slate-800">
                  Official / source link
                  {form.kind ===
                    "event" && (
                    <span className="ml-1 font-normal text-slate-400">
                      optional
                    </span>
                  )}
                </span>

                <input
                  type="url"
                  inputMode="url"
                  value={
                    form.url
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        url:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="https://..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
              </label>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-lg text-xs leading-5 text-slate-400">
                  Drafts are admin-only. Published items are visible to active signed-in TSL community members.
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      save(
                        "draft"
                      )
                    }
                    disabled={
                      saving ||
                      !form.title.trim() ||
                      !form.summary.trim()
                    }
                    className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : "Save draft"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      save(
                        "published"
                      )
                    }
                    disabled={
                      saving ||
                      !form.title.trim() ||
                      !form.summary.trim()
                    }
                    className="rounded-full bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saving
                      ? "Publishing..."
                      : "Publish"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-950">
                Existing content
              </h2>

              <button
                type="button"
                onClick={
                  clearForm
                }
                className="text-sm font-semibold text-blue-700"
              >
                + New
              </button>
            </div>

            {items.length ===
            0 ? (
              <p className="mt-5 text-sm leading-6 text-slate-500">
                No Hub content has been created yet.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {items.map(
                  (item) => (
                    <article
                      key={
                        item.id
                      }
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                          {kindLabel(
                            item.kind
                          )}
                        </span>

                        <span
                          className={[
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                            item.status ===
                            "published"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-200 text-slate-600",
                          ].join(
                            " "
                          )}
                        >
                          {item.status}
                        </span>
                      </div>

                      <p className="mt-3 text-sm font-semibold text-slate-900">
                        {item.title}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            beginEdit(
                              item
                            )
                          }
                          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            remove(
                              item
                            )
                          }
                          disabled={
                            deletingId ===
                            item.id
                          }
                          className="rounded-full px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50"
                        >
                          {deletingId ===
                          item.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </article>
                  )
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
