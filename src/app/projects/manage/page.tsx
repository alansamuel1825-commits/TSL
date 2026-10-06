"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import {
  useAuth,
} from "@/lib/auth/useAuth";

import {
  createProject,
  deleteProject,
  getMyProjects,
  getUserProfile,
  PROJECT_CATEGORIES,
  updateProject,
  type Project,
  type ProjectCategory,
  type ProjectInput,
  type UserProfile,
} from "@/lib/firebase/firestore";

type EditorState = {
  title: string;
  category: ProjectCategory;
  summary: string;
  description: string;
  role: string;
  outcome: string;
  technologies: string;
  projectUrl: string;
  repositoryUrl: string;
  collaborationWanted: boolean;
  mentorshipWanted: boolean;
};

const EMPTY_EDITOR:
  EditorState = {
  title: "",
  category: "Engineering",
  summary: "",
  description: "",
  role: "",
  outcome: "",
  technologies: "",
  projectUrl: "",
  repositoryUrl: "",
  collaborationWanted: false,
  mentorshipWanted: false,
};

function toEditorState(
  project: Project
): EditorState {
  return {
    title: project.title,
    category:
      project.category,
    summary:
      project.summary,
    description:
      project.description,
    role:
      project.role,
    outcome:
      project.outcome,
    technologies:
      project.technologies.join(
        ", "
      ),
    projectUrl:
      project.projectUrl,
    repositoryUrl:
      project.repositoryUrl,
    collaborationWanted:
      project.collaborationWanted,
    mentorshipWanted:
      project.mentorshipWanted,
  };
}

function editorToInput(
  editor: EditorState,
  status:
    "draft"
    | "published"
): ProjectInput {
  return {
    title:
      editor.title,
    category:
      editor.category,
    summary:
      editor.summary,
    description:
      editor.description,
    role:
      editor.role,
    outcome:
      editor.outcome,
    technologies:
      editor.technologies
        .split(",")
        .map((item) =>
          item.trim()
        )
        .filter(Boolean),
    projectUrl:
      editor.projectUrl,
    repositoryUrl:
      editor.repositoryUrl,
    collaborationWanted:
      editor.collaborationWanted,
    mentorshipWanted:
      editor.mentorshipWanted,
    status,
  };
}

function FieldLabel({
  children,
  optional = false,
}: {
  children:
    ReactNode;
  optional?: boolean;
}) {
  return (
    <span className="text-sm font-semibold text-slate-800">
      {children}
      {optional && (
        <span className="ml-1 font-normal text-slate-400">
          optional
        </span>
      )}
    </span>
  );
}

export default function ManageProjectsPage() {
  const router =
    useRouter();

  const {
    user,
    loading,
  } = useAuth();

  const [
    account,
    setAccount,
  ] =
    useState<
      UserProfile | null
    >(null);

  const [
    projects,
    setProjects,
  ] =
    useState<Project[]>([]);

  const [
    editor,
    setEditor,
  ] =
    useState<EditorState>(
      EMPTY_EDITOR
    );

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

const userId = user.uid;

let cancelled =
  false;

    async function initialize() {
      try {
        const [
  profile,
  myProjects,
] =
  await Promise.all([
    getUserProfile(
      userId
    ),
    getMyProjects(
      userId
    ),
  ]);

        if (cancelled) {
          return;
        }

        setAccount(profile);
        setProjects(
          myProjects
        );
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(
            "Unable to load your project portfolio."
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
        projects.filter(
          (project) =>
            project.status ===
            "published"
        ).length,
      [projects]
    );

  function clearEditor() {
    setEditingId(null);
    setEditor(
      EMPTY_EDITOR
    );
    setError("");
    setSuccess("");
  }

  function beginEdit(
    project: Project
  ) {
    setEditingId(
      project.id
    );
    setEditor(
      toEditorState(
        project
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
    if (
      !user ||
      account?.status !==
        "active"
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const input =
        editorToInput(
          editor,
          status
        );

      if (editingId) {
        await updateProject(
          editingId,
          user.uid,
          input
        );

        setSuccess(
          status ===
            "published"
            ? "Project published successfully."
            : "Draft saved successfully."
        );
      } else {
        await createProject(
          user.uid,
          input
        );

        setSuccess(
          status ===
            "published"
            ? "Project published successfully."
            : "Draft created successfully."
        );
      }

      const refreshed =
        await getMyProjects(
          user.uid
        );

      setProjects(
        refreshed
      );
      setEditingId(null);
      setEditor(
        EMPTY_EDITOR
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save this project."
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(
    project: Project
  ) {
    if (!user) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${project.title}"? This cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(
      project.id
    );
    setError("");
    setSuccess("");

    try {
      await deleteProject(
        project.id,
        user.uid
      );

      setProjects(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              project.id
          )
      );

      if (
        editingId ===
        project.id
      ) {
        clearEditor();
      }

      setSuccess(
        "Project deleted."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete this project."
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
          Loading your projects...
        </p>
      </main>
    );
  }

  if (
    !user ||
    !account
  ) {
    return null;
  }

  if (
    account.status !==
    "active"
  ) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            Portfolio access
          </p>

          <h1 className="mt-3 text-2xl font-bold text-slate-950">
            Project publishing becomes available after account verification
          </h1>

          <p className="mt-3 text-sm leading-7 text-slate-600">
            Pending alumni accounts cannot create or publish community projects yet. This keeps the portfolio attached to school-verified community identities.
          </p>

          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              Project studio
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Build your TSL portfolio
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Keep drafts private, publish finished work to the community, and clearly show your role, technologies, outcomes and collaboration needs.
            </p>
          </div>

          <Link
            href="/projects"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            View community projects
          </Link>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total projects
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-950">
              {projects.length}
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
              {projects.length -
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
                    ? "Edit project"
                    : "New project"}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Drafts stay private. Publishing requires a summary and full description.
                </p>
              </div>

              {editingId && (
                <button
                  type="button"
                  onClick={
                    clearEditor
                  }
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Start new
                </button>
              )}
            </div>

            <div className="mt-7 grid gap-6">
              <label>
                <FieldLabel>
                  Project title
                </FieldLabel>

                <input
                  value={
                    editor.title
                  }
                  onChange={(event) =>
                    setEditor(
                      (current) => ({
                        ...current,
                        title:
                          event.target.value,
                      })
                    )
                  }
                  maxLength={120}
                  placeholder="e.g. Autonomous Fire Response Drone"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />

                <p className="mt-1 text-right text-xs text-slate-400">
                  {editor.title.length}/120
                </p>
              </label>

              <label>
                <FieldLabel>
                  Category
                </FieldLabel>

                <select
                  value={
                    editor.category
                  }
                  onChange={(event) =>
                    setEditor(
                      (current) => ({
                        ...current,
                        category:
                          event.target
                            .value as ProjectCategory,
                      })
                    )
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                >
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

              <label>
                <FieldLabel>
                  One-line summary
                </FieldLabel>

                <textarea
                  value={
                    editor.summary
                  }
                  onChange={(event) =>
                    setEditor(
                      (current) => ({
                        ...current,
                        summary:
                          event.target.value,
                      })
                    )
                  }
                  rows={3}
                  maxLength={300}
                  placeholder="What did you build and why does it matter?"
                  className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />

                <p className="mt-1 text-right text-xs text-slate-400">
                  {editor.summary.length}/300
                </p>
              </label>

              <label>
                <FieldLabel>
                  Full description
                </FieldLabel>

                <textarea
                  value={
                    editor.description
                  }
                  onChange={(event) =>
                    setEditor(
                      (current) => ({
                        ...current,
                        description:
                          event.target.value,
                      })
                    )
                  }
                  rows={9}
                  maxLength={5000}
                  placeholder="Explain the problem, your approach, important technical choices, what you learned and what remains to be done."
                  className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />

                <p className="mt-1 text-right text-xs text-slate-400">
                  {editor.description.length}/5000
                </p>
              </label>

              <div className="grid gap-5 md:grid-cols-2">
                <label>
                  <FieldLabel
                    optional
                  >
                    Your role
                  </FieldLabel>

                  <input
                    value={
                      editor.role
                    }
                    onChange={(event) =>
                      setEditor(
                        (current) => ({
                          ...current,
                          role:
                            event.target.value,
                        })
                      )
                    }
                    maxLength={120}
                    placeholder="Founder, developer, researcher..."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>

                <label>
                  <FieldLabel
                    optional
                  >
                    Technologies / skills
                  </FieldLabel>

                  <input
                    value={
                      editor.technologies
                    }
                    onChange={(event) =>
                      setEditor(
                        (current) => ({
                          ...current,
                          technologies:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="Python, Firebase, CAD"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Separate items with commas. Maximum 20.
                  </p>
                </label>
              </div>

              <label>
                <FieldLabel
                  optional
                >
                  Outcome / impact
                </FieldLabel>

                <textarea
                  value={
                    editor.outcome
                  }
                  onChange={(event) =>
                    setEditor(
                      (current) => ({
                        ...current,
                        outcome:
                          event.target.value,
                      })
                    )
                  }
                  rows={4}
                  maxLength={600}
                  placeholder="What happened? Mention real results only — users, testing, recognition, deployment, learning or measurable impact."
                  className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />

                <p className="mt-1 text-right text-xs text-slate-400">
                  {editor.outcome.length}/600
                </p>
              </label>

              <div className="grid gap-5 md:grid-cols-2">
                <label>
                  <FieldLabel
                    optional
                  >
                    Project / demo link
                  </FieldLabel>

                  <input
                    type="url"
                    inputMode="url"
                    value={
                      editor.projectUrl
                    }
                    onChange={(event) =>
                      setEditor(
                        (current) => ({
                          ...current,
                          projectUrl:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="https://..."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>

                <label>
                  <FieldLabel
                    optional
                  >
                    Repository link
                  </FieldLabel>

                  <input
                    type="url"
                    inputMode="url"
                    value={
                      editor.repositoryUrl
                    }
                    onChange={(event) =>
                      setEditor(
                        (current) => ({
                          ...current,
                          repositoryUrl:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="https://github.com/..."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    checked={
                      editor.collaborationWanted
                    }
                    onChange={(event) =>
                      setEditor(
                        (current) => ({
                          ...current,
                          collaborationWanted:
                            event.target.checked,
                        })
                      )
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />

                  <span>
                    <span className="block text-sm font-semibold text-slate-900">
                      Open to collaboration
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      Signal that you are interested in working with other TSL community members.
                    </span>
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    checked={
                      editor.mentorshipWanted
                    }
                    onChange={(event) =>
                      setEditor(
                        (current) => ({
                          ...current,
                          mentorshipWanted:
                            event.target.checked,
                        })
                      )
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />

                  <span>
                    <span className="block text-sm font-semibold text-slate-900">
                      Looking for mentorship
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      Let alumni know this project could benefit from guidance or technical review.
                    </span>
                  </span>
                </label>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-xs leading-5 text-slate-400">
                  Only HTTPS links are accepted. Do not include private contact details, passwords, API keys or confidential school information.
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
                      !editor.title.trim()
                    }
                    className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                      !editor.title.trim() ||
                      !editor.summary.trim() ||
                      !editor.description.trim()
                    }
                    className="rounded-full bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Publishing..."
                      : "Publish project"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-950">
                  My projects
                </h2>

                <button
                  type="button"
                  onClick={
                    clearEditor
                  }
                  className="text-sm font-semibold text-blue-700 hover:text-blue-800"
                >
                  + New
                </button>
              </div>

              {projects.length ===
              0 ? (
                <p className="mt-5 text-sm leading-6 text-slate-500">
                  You have not created a project yet. Start with a draft — it remains private until you publish it.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {projects.map(
                    (project) => (
                      <article
                        key={
                          project.id
                        }
                        className={[
                          "rounded-2xl border p-4 transition",
                          editingId ===
                          project.id
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 bg-slate-50",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {project.title}
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span
                                className={[
                                  "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                  project.status ===
                                  "published"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-200 text-slate-600",
                                ].join(" ")}
                              >
                                {project.status ===
                                "published"
                                  ? "Published"
                                  : "Draft"}
                              </span>

                              <span className="text-xs text-slate-400">
                                {
                                  project.category
                                }
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              beginEdit(
                                project
                              )
                            }
                            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </button>

                          {project.status ===
                            "published" && (
                            <Link
                              href={`/projects/${project.id}`}
                              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              View
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              remove(
                                project
                              )
                            }
                            disabled={
                              deletingId ===
                              project.id
                            }
                            className="rounded-full px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId ===
                            project.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6">
              <p className="text-sm font-semibold text-blue-900">
                Strong project write-ups
              </p>

              <p className="mt-2 text-xs leading-6 text-blue-800">
                Focus on the real problem, what you personally did, technical decisions, testing, evidence and what you learned. Avoid inflated claims or numbers you cannot verify.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
